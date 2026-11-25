import { defineFlow } from "../schema";
import { tlsHandshake13 } from "../builders/tls";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { BOB_MAIL_IP, EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const IMAP_HOST = "imap.example.net";
const IMAP_PORT = 993;
const TLS_OVERHEAD = 22;

function imapLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "IMAP", summary, fields };
}

function tlsBytes(plainLen: number): number {
  return padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + TLS_OVERHEAD + plainLen);
}

export const imapFlow = defineFlow({
  meta: {
    slug: "imap",
    kind: "flow",
    collection: "protocols",
    group: "email",
    title: "IMAP",
    fullName: "Internet Message Access Protocol",
    tagline: "Syncing folders, flags, and new mail on the server",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["tcp", "tls"],
    related: ["smtp", "pop3", "tls", "tcp"],
    tags: ["imap", "email", "sync", "idle", "mailbox"],
    sources: [
      {
        label: "RFC 9051: Internet Message Access Protocol (IMAP) Version 4rev2",
        url: "https://www.rfc-editor.org/rfc/rfc9051",
      },
      {
        label: "RFC 3501: Internet Message Access Protocol Version 4rev1",
        url: "https://www.rfc-editor.org/rfc/rfc3501",
      },
      {
        label: "RFC 2177: IMAP4 IDLE Command",
        url: "https://www.rfc-editor.org/rfc/rfc2177",
      },
      {
        label: "RFC 8314: Cleartext Considered Obsolete (Implicit TLS for Mail)",
        url: "https://www.rfc-editor.org/rfc/rfc8314",
      },
      {
        label: "RFC 5322: Internet Message Format",
        url: "https://www.rfc-editor.org/rfc/rfc5322",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[imap|IMAP]] keeps your folders, read marks, and messages on the server so your phone, laptop, and webmail always match. The server can also push alerts the instant new mail lands.",
    technical:
      "Internet Message Access Protocol (RFC 9051 / RFC 3501) uses tagged request-response commands over TCP port 993 with implicit TLS (or port 143 upgraded with [[starttls|STARTTLS]]).",
  },
  facts: [
    { label: "Layer", value: "Application (over TCP)" },
    { label: "Ports", value: "993 (TLS), 143 (STARTTLS)" },
    { label: "Sync model", value: "Folders and flags stay on server" },
    { label: "Live updates", value: "IDLE notifies on arrival" },
    { label: "Defined in", value: "RFC 9051, RFC 3501, RFC 2177" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Bob's laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "imap", kind: "mail-server", label: IMAP_HOST, sublabel: BOB_MAIL_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "imap", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "connect",
      title: "Open TLS session on port 993",
      simple:
        "Bob's mail app dials `imap.example.net` on port 993 with [[tls|TLS]] active from the start. Inside, the server sends an untagged `* OK` greeting listing features such as `IDLE` {{imap-greet}}.",
      technical:
        "After implicit TLS handshake on TCP 993 {{imap-tls-client-hello}}, the server transmits an untagged greeting advertising `CAPABILITY IMAP4rev1 IDLE LITERAL+ AUTH=PLAIN`.",
      facts: [
        { label: "Server", value: `${IMAP_HOST}:993` },
        { label: "Encryption", value: "Implicit TLS (RFC 8314)" },
        { label: "Greeting", value: "* OK [CAPABILITY ...]" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "imap"] },
            { type: "focus", actors: ["laptop", "router", "internet", "imap"] },
          ],
        },
        ...tlsHandshake13({
          from: "laptop",
          to: "imap",
          srcIp: LAPTOP_IP,
          dstIp: BOB_MAIL_IP,
          dport: IMAP_PORT,
          serverName: IMAP_HOST,
          startTime: 0.0,
          rtt: 0.02,
          prefix: "imap-tls",
        }),
        {
          type: "packet",
          id: "imap-greet",
          from: "imap",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "* OK",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 129 }),
            tcpLayer({ sport: IMAP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1665, ack: 582, payloadBytes: 89 }),
            imapLayer("* OK [CAPABILITY IMAP4rev1 IDLE AUTH=PLAIN]", [{ name: "Tag", value: "* (untagged server greeting)" }]),
          ],
          capture: {
            time: 0.05,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): * OK [CAPABILITY IMAP4rev1 IDLE ...]",
            bytes: tlsBytes(67),
          },
        },
      ],
    },
    {
      id: "login",
      title: "Authenticate using command tags",
      simple:
        "Each command starts with a short client label such as `a1` {{imap-login}}, and the server ends its response with that same tag {{imap-login-ok}}. Tags let multiple requests stay in flight at once.",
      technical:
        "RFC 9051 tags correlate asynchronous replies to commands (`a1 LOGIN` -> `a1 OK`). Untagged lines (`*`) deliver mailbox state updates before the tagged completion status.",
      facts: [
        { label: "Command", value: "a1 LOGIN bob <hidden>" },
        { label: "Reply", value: "a1 OK LOGIN completed" },
        { label: "Tag purpose", value: "Pipelining and matching replies" },
      ],
      events: [
        {
          type: "packet",
          id: "imap-login",
          from: "laptop",
          to: "imap",
          via: ["router", "internet"],
          tone: "request",
          label: "a1 LOGIN",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 83 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: IMAP_PORT, flags: "PSH, ACK", seq: 582, ack: 1754, payloadBytes: 43 }),
            imapLayer("a1 LOGIN bob <secret>", [
              { name: "Tag", value: "a1" },
              { name: "Protected by", value: "TLS 1.3" },
            ]),
          ],
          capture: {
            time: 0.06,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): a1 LOGIN bob <protected>",
            bytes: tlsBytes(21),
          },
        },
        {
          type: "packet",
          id: "imap-login-ok",
          from: "imap",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "a1 OK",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 85 }),
            tcpLayer({ sport: IMAP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1754, ack: 625, payloadBytes: 45 }),
            imapLayer("a1 OK LOGIN completed", [{ name: "State", value: "Authenticated" }]),
          ],
          capture: {
            time: 0.08,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): a1 OK LOGIN completed",
            bytes: tlsBytes(23),
          },
        },
      ],
    },
    {
      id: "select",
      title: "Select the Inbox folder",
      simple:
        "Sending `a2 SELECT INBOX` {{imap-select}} opens Bob's inbox. The server reports that two messages exist, names supported flags, notes the first unread item, and ends with `a2 OK [READ-WRITE]` {{imap-select-ok}}.",
      technical:
        "`SELECT INBOX` returns untagged `* FLAGS`, `* 2 EXISTS`, `* OK [UNSEEN 2]`, and `UIDVALIDITY` metadata before `a2 OK [READ-WRITE] SELECT completed`.",
      facts: [
        { label: "Mailbox count", value: "* 2 EXISTS" },
        { label: "First unread", value: "Message 2" },
        { label: "Mode", value: "[READ-WRITE]" },
      ],
      events: [
        {
          type: "packet",
          id: "imap-select",
          from: "laptop",
          to: "imap",
          via: ["router", "internet"],
          tone: "request",
          label: "a2 SELECT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 79 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: IMAP_PORT, flags: "PSH, ACK", seq: 625, ack: 1799, payloadBytes: 39 }),
            imapLayer("a2 SELECT INBOX", [{ name: "Folder", value: "INBOX" }]),
          ],
          capture: {
            time: 0.09,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): a2 SELECT INBOX",
            bytes: tlsBytes(17),
          },
        },
        {
          type: "packet",
          id: "imap-select-ok",
          from: "imap",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "a2 OK (2 msgs)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 318 }),
            tcpLayer({ sport: IMAP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1799, ack: 664, payloadBytes: 278 }),
            imapLayer("* 2 EXISTS ... a2 OK [READ-WRITE]", [
              { name: "EXISTS / UNSEEN", value: "2 messages / message 2 first unread" },
              { name: "Status", value: "a2 OK [READ-WRITE] SELECT completed" },
            ]),
          ],
          capture: {
            time: 0.11,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): * 2 EXISTS, a2 OK [READ-WRITE]",
            bytes: tlsBytes(256),
          },
        },
      ],
    },
    {
      id: "fetch",
      title: "Fetch mail and mark as Seen",
      simple:
        "Asking for message 2 with `FETCH 2 BODY[]` {{imap-fetch}} downloads its 3,216 bytes across three TCP segments {{imap-msg}}. Reading `BODY[]` flips the `\\Seen` flag on the server so Bob's phone shows it read too.",
      technical:
        "`a3 FETCH 2 BODY[]` retrieves the full RFC 5322 message (3,295 TLS bytes over 3 MSS segments) and implicitly sets the `\\Seen` flag on the server while keeping the email stored remotely.",
      facts: [
        { label: "Command", value: "a3 FETCH 2 BODY[]" },
        { label: "Size", value: "3,216 B (3 TCP segments)" },
        { label: "Server state", value: "\\Seen set; email kept on server" },
      ],
      events: [
        {
          type: "packet",
          id: "imap-fetch",
          from: "laptop",
          to: "imap",
          via: ["router", "internet"],
          tone: "request",
          label: "a3 FETCH",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 81 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: IMAP_PORT, flags: "PSH, ACK", seq: 664, ack: 2077, payloadBytes: 41 }),
            imapLayer("a3 FETCH 2 BODY[]", [{ name: "Target", value: "Sequence 2, full message" }]),
          ],
          capture: {
            time: 0.12,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): a3 FETCH 2 BODY[]",
            bytes: tlsBytes(19),
          },
        },
        {
          type: "packet",
          id: "imap-msg",
          from: "imap",
          to: "laptop",
          via: ["internet", "router"],
          tone: "data",
          label: "MESSAGE (3 segs)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: IMAP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 2077, ack: 705, payloadBytes: 3295 }),
            imapLayer("* 2 FETCH (FLAGS (\\Seen) BODY[] {3216})", [
              { name: "Flag update", value: "\\Seen added on server" },
              { name: "Payload", value: "3,216 bytes + framing (3 TCP segments)" },
            ]),
          ],
          capture: {
            time: 0.145,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): * 2 FETCH (FLAGS (\\Seen) BODY[]) (3 TCP segments)",
            bytes: 3457,
          },
        },
        {
          type: "note",
          id: "note-seen",
          at: "imap",
          text: "Kept on server · \\Seen set",
          tone: "response",
        },
      ],
    },
    {
      id: "idle",
      title: "Wait for instant push with IDLE",
      simple:
        "`IDLE` leaves the connection open so the server pushes news immediately {{imap-idle}}. When Alice's message arrives 42 seconds later, the server sends `* 3 EXISTS` {{imap-push}}, and the app answers `DONE` {{imap-done}}.",
      technical:
        "RFC 2177 `IDLE` lets the server emit unsolicited `* 3 EXISTS` lines while waiting for `DONE`, avoiding constant polling.",
      facts: [
        { label: "Command", value: "a4 IDLE -> + idling" },
        { label: "Push event", value: "* 3 EXISTS (new mail)" },
        { label: "Exit IDLE", value: "DONE -> a4 OK" },
      ],
      events: [
        {
          type: "packet",
          id: "imap-idle",
          from: "laptop",
          to: "imap",
          via: ["router", "internet"],
          tone: "request",
          label: "a4 IDLE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 71 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: IMAP_PORT, flags: "PSH, ACK", seq: 705, ack: 5372, payloadBytes: 31 }),
            imapLayer("a4 IDLE", [{ name: "Extension", value: "RFC 2177 push notifications" }]),
          ],
          capture: {
            time: 0.16,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): a4 IDLE",
            bytes: tlsBytes(9),
          },
        },
        {
          type: "packet",
          id: "imap-idling",
          from: "imap",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+ idling",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 72 }),
            tcpLayer({ sport: IMAP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 5372, ack: 736, payloadBytes: 32 }),
            imapLayer("+ idling", [{ name: "State", value: "Waiting for mailbox changes" }]),
          ],
          capture: {
            time: 0.18,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): + idling",
            bytes: tlsBytes(10),
          },
        },
        {
          type: "note",
          id: "note-new-mail",
          at: "imap",
          text: "New mail arrives (+42 s)",
          tone: "response",
        },
        {
          type: "packet",
          id: "imap-push",
          from: "imap",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "* 3 EXISTS",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 74 }),
            tcpLayer({ sport: IMAP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 5404, ack: 736, payloadBytes: 34 }),
            imapLayer("* 3 EXISTS", [{ name: "Push alert", value: "Inbox now holds 3 messages" }]),
          ],
          capture: {
            time: 42.18,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): * 3 EXISTS (pushed new mail)",
            bytes: tlsBytes(12),
          },
        },
        {
          type: "packet",
          id: "imap-done",
          from: "laptop",
          to: "imap",
          via: ["router", "internet"],
          tone: "request",
          label: "DONE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 68 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: IMAP_PORT, flags: "PSH, ACK", seq: 736, ack: 5438, payloadBytes: 28 }),
            imapLayer("DONE", [{ name: "Action", value: "End IDLE so client can FETCH 3" }]),
          ],
          capture: {
            time: 42.185,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "IMAP",
            info: "IMAP (TLS): DONE",
            bytes: tlsBytes(6),
          },
        },
      ],
    },
  ],
  outro: {
    title: "All devices see the same mailbox",
    simple:
      "Bob's laptop checked his inbox, read a message while marking it read on the server, and waited with IDLE until a new arrival triggered an instant push. Everything remains stored centrally.",
    technical:
      "Completed IMAPS port 993 session: LOGIN, SELECT INBOX, FETCH BODY[] updating \\Seen, and RFC 2177 IDLE notification.",
    facts: [
      { label: "Message count", value: "2, then 3 pushed via IDLE" },
      { label: "Read state", value: "\\Seen synced on server" },
      { label: "Transport", value: "Port 993 (TLS)" },
      { label: "Suited for", value: "Multiple synced devices" },
    ],
  },
  tryIt: [
    {
      title: "Inspect an IMAPS TLS handshake",
      explain: "Connect to port 993 with OpenSSL to observe the TLS certificate and server greeting banner.",
      commands: [
        { os: "windows", cmd: "openssl s_client -connect imap.example.com:993 -quiet" },
        { os: "macos", cmd: "openssl s_client -connect imap.example.com:993 -quiet" },
        { os: "linux", cmd: "openssl s_client -connect imap.example.com:993 -quiet" },
      ],
    },
  ],
});
