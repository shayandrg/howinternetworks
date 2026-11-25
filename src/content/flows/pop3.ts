import { defineFlow } from "../schema";
import { tlsHandshake13 } from "../builders/tls";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { BOB_MAIL_IP, EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const POP_HOST = "pop.example.net";
const POP_PORT = 995;
const TLS_OVERHEAD = 22;

function popLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "POP3", summary, fields };
}

function tlsBytes(plainLen: number): number {
  return padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + TLS_OVERHEAD + plainLen);
}

export const pop3Flow = defineFlow({
  meta: {
    slug: "pop3",
    kind: "flow",
    collection: "protocols",
    group: "email",
    title: "POP3",
    fullName: "Post Office Protocol, version 3",
    tagline: "Downloading messages to one device and clearing the box",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["tcp", "tls"],
    related: ["smtp", "imap", "tls", "tcp"],
    tags: ["pop3", "email", "download", "mailbox", "tls"],
    sources: [
      {
        label: "RFC 1939: Post Office Protocol - Version 3",
        url: "https://www.rfc-editor.org/rfc/rfc1939",
      },
      {
        label: "RFC 2595: Using TLS with IMAP, POP3 and ACAP",
        url: "https://www.rfc-editor.org/rfc/rfc2595",
      },
      {
        label: "RFC 8314: Cleartext Considered Obsolete (Implicit TLS for Mail)",
        url: "https://www.rfc-editor.org/rfc/rfc8314",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[pop3|POP3]] lets a mail client pull messages off a server onto one computer and usually delete the server copies afterward. Short keyword commands receive `+OK` or `-ERR` answers.",
    technical:
      "Post Office Protocol version 3 (RFC 1939) uses lock-step text commands over TCP port 995 with implicit TLS (or port 110 upgraded via `STLS`, RFC 2595), moving through Authorization, Transaction, and Update states.",
  },
  facts: [
    { label: "Layer", value: "Application (over TCP)" },
    { label: "Ports", value: "995 (TLS), 110 (STLS)" },
    { label: "Design goal", value: "Fetch locally, then remove" },
    { label: "Status lines", value: "+OK or -ERR" },
    { label: "Defined in", value: "RFC 1939, RFC 2595" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Bob's laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "pop", kind: "mail-server", label: POP_HOST, sublabel: BOB_MAIL_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "pop", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "connect",
      title: "Connect on port 995 with TLS",
      simple:
        "Bob's client dials `pop.example.net` on port 995 so [[tls|TLS]] starts immediately. Inside the tunnel, the server sends `+OK` {{pop-greet}}. Port 110 instead begins in clear text and upgrades using `STLS`.",
      technical:
        "Per RFC 8314, POP3S wraps RFC 1939 in TLS on port 995 {{pop-tls-client-hello}}. Once encrypted, the server enters Authorization state with a `+OK` banner.",
      facts: [
        { label: "Endpoint", value: `${POP_HOST}:995` },
        { label: "Legacy upgrade", value: "Port 110 + STLS (RFC 2595)" },
        { label: "Greeting", value: "+OK Dovecot ready." },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "pop"] },
            { type: "focus", actors: ["laptop", "router", "internet", "pop"] },
          ],
        },
        ...tlsHandshake13({
          from: "laptop",
          to: "pop",
          srcIp: LAPTOP_IP,
          dstIp: BOB_MAIL_IP,
          dport: POP_PORT,
          serverName: POP_HOST,
          startTime: 0.0,
          rtt: 0.02,
          prefix: "pop-tls",
        }),
        {
          type: "packet",
          id: "pop-greet",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+OK",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 81 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1665, ack: 582, payloadBytes: 41 }),
            popLayer("+OK Dovecot ready.", [{ name: "State", value: "Authorization" }]),
          ],
          capture: {
            time: 0.048,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK Dovecot ready.",
            bytes: tlsBytes(19),
          },
        },
      ],
    },
    {
      id: "login",
      title: "Send username and password",
      simple:
        "The app sends `USER bob` {{pop-user}}, waits for `+OK`, then sends `PASS` {{pop-pass}}. Because the entire exchange runs inside TLS, eavesdroppers cannot read the password.",
      technical:
        "`USER` and `PASS` (RFC 1939 §7) move the session into Transaction state upon `+OK Logged in.`, acquiring an exclusive lock on Bob's maildrop.",
      facts: [
        { label: "Commands", value: "USER bob / PASS <hidden>" },
        { label: "Next state", value: "Transaction (maildrop locked)" },
        { label: "Confidentiality", value: "Protected by TLS 1.3" },
      ],
      events: [
        {
          type: "packet",
          id: "pop-user",
          from: "laptop",
          to: "pop",
          via: ["router", "internet"],
          tone: "request",
          label: "USER",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 72 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: POP_PORT, flags: "PSH, ACK", seq: 582, ack: 1706, payloadBytes: 32 }),
            popLayer("USER bob", [{ name: "User", value: "bob" }]),
          ],
          capture: {
            time: 0.055,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "POP3",
            info: "POP3 (TLS): USER bob",
            bytes: tlsBytes(10),
          },
        },
        {
          type: "packet",
          id: "pop-user-ok",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+OK",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 67 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1706, ack: 614, payloadBytes: 27 }),
            popLayer("+OK", [{ name: "Status", value: "Username accepted" }]),
          ],
          capture: {
            time: 0.075,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK",
            bytes: tlsBytes(5),
          },
        },
        {
          type: "packet",
          id: "pop-pass",
          from: "laptop",
          to: "pop",
          via: ["router", "internet"],
          tone: "request",
          label: "PASS",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 75 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: POP_PORT, flags: "PSH, ACK", seq: 614, ack: 1733, payloadBytes: 35 }),
            popLayer("PASS <secret>", [{ name: "Protection", value: "Inside TLS channel" }]),
          ],
          capture: {
            time: 0.08,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "POP3",
            info: "POP3 (TLS): PASS <protected>",
            bytes: tlsBytes(13),
          },
        },
        {
          type: "packet",
          id: "pop-pass-ok",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+OK LOGGED IN",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 78 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1733, ack: 649, payloadBytes: 38 }),
            popLayer("+OK Logged in.", [{ name: "State", value: "Transaction (2 messages waiting)" }]),
          ],
          capture: {
            time: 0.1,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK Logged in.",
            bytes: tlsBytes(16),
          },
        },
      ],
    },
    {
      id: "stat-list",
      title: "Check inbox with STAT and LIST",
      simple:
        "`STAT` asks how many messages sit in the box and their total byte size {{pop-stat}}. `LIST` enumerates every email ID and octet size until a lone dot closes the reply {{pop-list-ok}}.",
      technical:
        "`STAT` replies `+OK 2 5120` (count and octet total). Multi-line replies like `LIST` terminate with `<CR><LF>.<CR><LF>` per RFC 1939 §3.",
      facts: [
        { label: "STAT response", value: "+OK 2 5120" },
        { label: "Message 1", value: "1,904 bytes" },
        { label: "Message 2", value: "3,216 bytes" },
      ],
      events: [
        {
          type: "packet",
          id: "pop-stat",
          from: "laptop",
          to: "pop",
          via: ["router", "internet"],
          tone: "request",
          label: "STAT",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 68 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: POP_PORT, flags: "PSH, ACK", seq: 649, ack: 1771, payloadBytes: 28 }),
            popLayer("STAT", [{ name: "Query", value: "Mailbox drop count and bytes" }]),
          ],
          capture: {
            time: 0.11,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "POP3",
            info: "POP3 (TLS): STAT",
            bytes: tlsBytes(6),
          },
        },
        {
          type: "packet",
          id: "pop-stat-ok",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+OK 2 5120",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 73 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1771, ack: 677, payloadBytes: 33 }),
            popLayer("+OK 2 5120", [{ name: "Summary", value: "2 messages totaling 5,120 bytes" }]),
          ],
          capture: {
            time: 0.13,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK 2 5120",
            bytes: tlsBytes(11),
          },
        },
        {
          type: "packet",
          id: "pop-list",
          from: "laptop",
          to: "pop",
          via: ["router", "internet"],
          tone: "request",
          label: "LIST",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 68 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: POP_PORT, flags: "PSH, ACK", seq: 677, ack: 1804, payloadBytes: 28 }),
            popLayer("LIST", [{ name: "Query", value: "Per-message sizes" }]),
          ],
          capture: {
            time: 0.135,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "POP3",
            info: "POP3 (TLS): LIST",
            bytes: tlsBytes(6),
          },
        },
        {
          type: "packet",
          id: "pop-list-ok",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+OK LIST",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 97 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1804, ack: 705, payloadBytes: 57 }),
            popLayer("+OK 2 messages (1 1904, 2 3216)", [
              { name: "1", value: "1,904 bytes" },
              { name: "2", value: "3,216 bytes" },
            ]),
          ],
          capture: {
            time: 0.155,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK 2 messages (1904 B, 3216 B)",
            bytes: tlsBytes(35),
          },
        },
      ],
    },
    {
      id: "retr",
      title: "Download message 1 with RETR",
      simple:
        "`RETR 1` fetches the first email {{pop-retr}}. The server replies `+OK 1904 octets`, streams the message across two TCP segments, and ends with a single dot {{pop-msg}}.",
      technical:
        "With `+OK 1904 octets`, the 1,904-byte body, terminating dot, and 22-byte TLS record overhead total 1,946 bytes across two 1,460-byte TCP MSS segments.",
      facts: [
        { label: "Command", value: "RETR 1" },
        { label: "Reply line", value: "+OK 1904 octets" },
        { label: "Wire segments", value: "2 TCP segments (2,054 B total)" },
      ],
      events: [
        {
          type: "packet",
          id: "pop-retr",
          from: "laptop",
          to: "pop",
          via: ["router", "internet"],
          tone: "request",
          label: "RETR 1",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 70 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: POP_PORT, flags: "PSH, ACK", seq: 705, ack: 1861, payloadBytes: 30 }),
            popLayer("RETR 1", [{ name: "Target", value: "Download message #1" }]),
          ],
          capture: {
            time: 0.165,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "POP3",
            info: "POP3 (TLS): RETR 1",
            bytes: tlsBytes(8),
          },
        },
        {
          type: "packet",
          id: "pop-msg",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "data",
          label: "MESSAGE (2 segs)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1861, ack: 735, payloadBytes: 1946 }),
            popLayer("+OK 1904 octets + body + '.'", [
              { name: "Size", value: "1,904 octets across 2 TCP segments" },
            ]),
          ],
          capture: {
            time: 0.19,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK 1904 octets + body (2 TCP segments)",
            bytes: 2054,
          },
        },
      ],
    },
    {
      id: "dele-quit",
      title: "Mark deleted and commit at QUIT",
      simple:
        "`DELE 1` only flags message 1 for removal {{pop-dele}}. Nothing is deleted until `QUIT` arrives {{pop-quit}} so a dropped connection does not lose mail. Apps with 'leave a copy' omit `DELE`.",
      technical:
        "RFC 1939 defers deletion until the Update state triggered by `QUIT` {{pop-quit-ok}}; abnormal disconnect leaves the maildrop intact.",
      facts: [
        { label: "DELE 1", value: "Marks message 1 only" },
        { label: "Committed at", value: "QUIT (Update state)" },
        { label: "Multi-device option", value: "Skip DELE to keep server copy" },
      ],
      events: [
        {
          type: "packet",
          id: "pop-dele",
          from: "laptop",
          to: "pop",
          via: ["router", "internet"],
          tone: "request",
          label: "DELE 1",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 70 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: POP_PORT, flags: "PSH, ACK", seq: 735, ack: 3807, payloadBytes: 30 }),
            popLayer("DELE 1", [{ name: "Effect", value: "Pending deletion on QUIT" }]),
          ],
          capture: {
            time: 0.2,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "POP3",
            info: "POP3 (TLS): DELE 1",
            bytes: tlsBytes(8),
          },
        },
        {
          type: "packet",
          id: "pop-dele-ok",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+OK MARKED",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 73 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 3807, ack: 765, payloadBytes: 33 }),
            popLayer("+OK Marked", [{ name: "State", value: "Still Transaction" }]),
          ],
          capture: {
            time: 0.22,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK Marked to be deleted.",
            bytes: tlsBytes(11),
          },
        },
        {
          type: "packet",
          id: "pop-quit",
          from: "laptop",
          to: "pop",
          via: ["router", "internet"],
          tone: "request",
          label: "QUIT",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_MAIL_IP, protocol: "TCP (6)", totalLength: 68 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: POP_PORT, flags: "PSH, ACK", seq: 765, ack: 3840, payloadBytes: 28 }),
            popLayer("QUIT", [{ name: "Transition", value: "Enter Update state" }]),
          ],
          capture: {
            time: 0.225,
            src: LAPTOP_IP,
            dst: BOB_MAIL_IP,
            protocol: "POP3",
            info: "POP3 (TLS): QUIT",
            bytes: tlsBytes(6),
          },
        },
        {
          type: "packet",
          id: "pop-quit-ok",
          from: "pop",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "+OK BYE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_MAIL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 74 }),
            tcpLayer({ sport: POP_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 3840, ack: 793, payloadBytes: 34 }),
            popLayer("+OK Logging out.", [{ name: "Committed", value: "Message 1 expunged" }]),
          ],
          capture: {
            time: 0.245,
            src: BOB_MAIL_IP,
            dst: LAPTOP_IP,
            protocol: "POP3",
            info: "POP3 (TLS): +OK Logging out (message 1 removed)",
            bytes: tlsBytes(12),
          },
        },
        {
          type: "note",
          id: "note-deleted",
          at: "pop",
          text: "Message 1 removed",
          tone: "lookup",
        },
      ],
    },
  ],
  outro: {
    title: "Message downloaded and cleared",
    simple:
      "Bob's client signed in over TLS, listed two messages, downloaded the first, and committed its deletion with QUIT. That download-and-clear model works best for a single mailbox computer.",
    technical:
      "POP3S session over port 995 executed USER/PASS, STAT, LIST, RETR 1 (1,904 bytes), DELE 1, and Update-state commit at QUIT.",
    facts: [
      { label: "Downloaded", value: "Message 1 (1,904 B)" },
      { label: "Expunged", value: "At QUIT (Update state)" },
      { label: "Port", value: "995 (implicit TLS)" },
      { label: "Best fit", value: "Single-device download" },
    ],
  },
  tryIt: [
    {
      title: "Check a POP3S banner with OpenSSL",
      explain: "Verify port 995 TLS availability and observe the +OK greeting.",
      commands: [
        { os: "windows", cmd: "openssl s_client -connect pop.example.com:995 -quiet" },
        { os: "macos", cmd: "openssl s_client -connect pop.example.com:995 -quiet" },
        { os: "linux", cmd: "openssl s_client -connect pop.example.com:995 -quiet" },
      ],
    },
  ],
});
