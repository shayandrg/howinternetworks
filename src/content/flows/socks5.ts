import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

const SOCKS_IP = "192.0.2.80"; // RFC 5737 TEST-NET-1
const SOCKS_PORT = 1080;

function socksLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "SOCKS5", summary, fields };
}

export const socks5Flow = defineFlow({
  meta: {
    slug: "socks5",
    kind: "flow",
    collection: "protocols",
    group: "routing",
    title: "SOCKS5",
    fullName: "Socket Secure Version 5",
    tagline: "Relaying arbitrary TCP and UDP streams via a proxy",
    layer: {
      tcpip: "transport",
      osi: 5,
      note: "Sits between the application and TCP/UDP, often labelled Layer 5",
    },
    prerequisites: ["tcp"],
    related: ["http-proxy", "ssh", "tls", "wireguard"],
    tags: ["socks5", "proxy", "tunnel", "ssh-d", "tor"],
    sources: [
      {
        label: "RFC 1928: SOCKS Protocol Version 5",
        url: "https://www.rfc-editor.org/rfc/rfc1928",
      },
      {
        label: "RFC 1929: Username/Password Authentication for SOCKS V5",
        url: "https://www.rfc-editor.org/rfc/rfc1929",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "While an HTTP proxy parses web requests, [[socks5|SOCKS5]] opens a stream on your behalf and copies bytes untouched for any protocol: web, email, games, or SSH. Tools such as `ssh -D` and Tor expose a SOCKS5 port.",
    technical:
      "Defined in RFC 1928, SOCKS5 sits between application and TCP/UDP (often labelled Layer 5) on port 1080. Clients pick an auth method, ask the proxy to `CONNECT` by domain or IP, then stream unmodified protocol bytes.",
  },
  facts: [
    { label: "Layer", value: "Between app & TCP/UDP (often Layer 5)" },
    { label: "Default port", value: "1080 (TCP; supports UDP Assoc)" },
    { label: "Auth options", value: "None (0x00) or User/Pass (0x02)" },
    { label: "Common tools", value: "ssh -D, Tor, corporate proxies" },
    { label: "Defined in", value: "RFC 1928, RFC 1929" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your app", sublabel: LAPTOP_IP, at: { x: 100, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 290, y: 300 } },
      { id: "proxy", kind: "proxy", label: "SOCKS5 proxy", sublabel: SOCKS_IP, at: { x: 560, y: 300 } },
      { id: "web", kind: "web-server", label: WEB_DOMAIN, sublabel: WEB_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-lan", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-prx", from: "router", to: "proxy", medium: "fiber" },
      { id: "l-web", from: "proxy", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "tcp-1080",
      title: "Connect TCP to proxy port 1080",
      simple:
        "An app configured for SOCKS5 dials `192.0.2.80` on port 1080 {{s5-tcp-syn}}. Unlike an HTTP proxy, SOCKS5 never inspects HTTP URLs or headers inside the resulting stream.",
      technical:
        `The client opens TCP to port ${SOCKS_PORT}, using SOCKS5 only as a brief setup preamble before handing the socket off as a blind pipe.`,
      facts: [
        { label: "Proxy", value: `${SOCKS_IP}:${SOCKS_PORT}` },
        { label: "Protocol scope", value: "Any TCP stream or UDP relay" },
        { label: "Target site", value: `https://${WEB_DOMAIN}` },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "proxy", "web"] },
            { type: "focus", actors: ["laptop", "router", "proxy", "web"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "proxy",
          srcIp: LAPTOP_IP,
          dstIp: SOCKS_IP,
          sport: EPHEMERAL_PORT_START + 7,
          dport: SOCKS_PORT,
          startTime: 0.0,
          rtt: 0.015,
          prefix: "s5-tcp",
        }),
      ],
    },
    {
      id: "greeting",
      title: "Agree on auth method (5 bytes)",
      simple:
        "Your app sends three bytes: version `0x05`, one auth method offered, and `0x00` (no authentication) {{s5-greet}}. The proxy confirms with `0x05 0x00` {{s5-method}}. Choosing `0x02` would trigger username/password auth.",
      technical:
        "RFC 1928 §3 negotiates auth methods via `[VER=5, NMETHODS=1, 0x00]` -> `[VER=5, METHOD=0x00]`. Method `0x02` invokes RFC 1929 cleartext username/password exchange.",
      facts: [
        { label: "Client sends", value: "05 01 00 (3 bytes)" },
        { label: "Server picks", value: "05 00 (2 bytes, no auth)" },
        { label: "Method 0x02", value: "Plaintext user/pass (RFC 1929)" },
      ],
      events: [
        {
          type: "packet",
          id: "s5-greet",
          from: "laptop",
          to: "proxy",
          via: ["router"],
          tone: "control",
          label: "GREETING (05 01 00)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SOCKS_IP, protocol: "TCP (6)", totalLength: 43 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 7, dport: SOCKS_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 3 }),
            socksLayer("Greeting: VER=5, NMETHODS=1, NO AUTH (0x00)", [{ name: "Bytes", value: "05 01 00" }]),
          ],
          capture: {
            time: 0.025,
            src: LAPTOP_IP,
            dst: SOCKS_IP,
            protocol: "SOCKS",
            info: "Greeting: Version 5, No Authentication Required",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 3),
          },
        },
        {
          type: "packet",
          id: "s5-method",
          from: "proxy",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "METHOD (05 00)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SOCKS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 42 }),
            tcpLayer({ sport: SOCKS_PORT, dport: EPHEMERAL_PORT_START + 7, flags: "PSH, ACK", seq: 1, ack: 4, payloadBytes: 2 }),
            socksLayer("Selection: VER=5, METHOD=0x00", [{ name: "Bytes", value: "05 00" }]),
          ],
          capture: {
            time: 0.04,
            src: SOCKS_IP,
            dst: LAPTOP_IP,
            protocol: "SOCKS",
            info: "Server Choice: Method 0x00 (No Auth)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 2),
          },
        },
      ],
    },
    {
      id: "connect-name",
      title: "Send CONNECT with hostname",
      simple:
        "The app asks to `CONNECT` to `www.example.com` port 443 using address type `0x03` (domain name) {{s5-conn}}, so the proxy does the DNS lookup too. The proxy dials port 443 and returns `Succeeded` {{s5-succ}}.",
      technical:
        `Sending ATYP=3 (Domain Name, 22 bytes total) delegates DNS resolution to the proxy. Once TCP connects to \`${WEB_SERVER_IP}:443\`, the proxy sends a 10-byte \`0x00 Succeeded\` reply.`,
      facts: [
        { label: "Command", value: "0x01 CONNECT (ATYP=0x03 name)" },
        { label: "Remote DNS", value: "Lookup happens at the proxy" },
        { label: "Reply", value: `Succeeded (bound ${SOCKS_IP}:40220)` },
      ],
      events: [
        {
          type: "packet",
          id: "s5-conn",
          from: "laptop",
          to: "proxy",
          via: ["router"],
          tone: "request",
          label: "CONNECT www.example.com",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SOCKS_IP, protocol: "TCP (6)", totalLength: 62 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 7, dport: SOCKS_PORT, flags: "PSH, ACK", seq: 4, ack: 3, payloadBytes: 22 }),
            socksLayer(`CONNECT ${WEB_DOMAIN}:443 (ATYP=DomainName)`, [{ name: "Setup size", value: "22 bytes" }]),
          ],
          capture: {
            time: 0.045,
            src: LAPTOP_IP,
            dst: SOCKS_IP,
            protocol: "SOCKS",
            info: `Connect ${WEB_DOMAIN}:443 (ATYP 0x03)`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 22),
          },
        },
        {
          type: "packet",
          id: "s5-succ",
          from: "proxy",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "SUCCEEDED",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SOCKS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 50 }),
            tcpLayer({ sport: SOCKS_PORT, dport: EPHEMERAL_PORT_START + 7, flags: "PSH, ACK", seq: 3, ack: 26, payloadBytes: 10 }),
            socksLayer(`Reply 0x00 Succeeded (bound ${SOCKS_IP}:40220)`, [{ name: "Status", value: "0x00 Succeeded" }]),
          ],
          capture: {
            time: 0.075,
            src: SOCKS_IP,
            dst: LAPTOP_IP,
            protocol: "SOCKS",
            info: `Response: Succeeded (bound ${SOCKS_IP}:40220)`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 10),
          },
        },
      ],
    },
    {
      id: "blind-relay",
      title: "Copy inner TLS bytes unchanged",
      simple:
        "SOCKS5 setup is done. Your app sends TLS `ClientHello` {{s5-ch-in}}, which the proxy copies unchanged toward the site {{s5-ch-out}} and forwards `ServerHello` back {{s5-sh-in}} {{s5-sh-out}}.",
      technical:
        "All bytes after the 37-byte SOCKS5 setup belong purely to the inner application (here TLS 1.3 + HTTPS). The destination sees the proxy IP (`192.0.2.80`), while the proxy provides no outer encryption itself.",
      facts: [
        { label: "Total setup", value: "4 packets, 37 bytes total" },
        { label: "Server sees IP", value: `${SOCKS_IP} (proxy)` },
        { label: "Encryption", value: "None by SOCKS5 (relies on TLS)" },
      ],
      events: [
        {
          type: "packet",
          id: "s5-ch-in",
          from: "laptop",
          to: "proxy",
          via: ["router"],
          tone: "secure",
          label: "CLIENT HELLO",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SOCKS_IP, protocol: "TCP (6)", totalLength: 557 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 7, dport: SOCKS_PORT, flags: "PSH, ACK", seq: 26, ack: 13, payloadBytes: 517 }),
            socksLayer("Raw inner TLS ClientHello (517 B)", [{ name: "Role", value: "Relayed unmodified" }]),
          ],
          capture: {
            time: 0.08,
            src: LAPTOP_IP,
            dst: SOCKS_IP,
            protocol: "TLSv1.3",
            info: "ClientHello (inside SOCKS5 stream)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 517),
          },
        },
        {
          type: "packet",
          id: "s5-ch-out",
          from: "proxy",
          to: "web",
          tone: "secure",
          label: "CLIENT HELLO",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SOCKS_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 557 }),
            tcpLayer({ sport: 40220, dport: 443, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 517 }),
            socksLayer("Identical ClientHello bytes -> 443", [{ name: "Byte match", value: "100% identical" }]),
          ],
          capture: {
            time: 0.095,
            src: SOCKS_IP,
            dst: WEB_SERVER_IP,
            protocol: "TLSv1.3",
            info: "ClientHello (forwarded by SOCKS5)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 517),
          },
        },
        {
          type: "packet",
          id: "s5-sh-in",
          from: "web",
          to: "proxy",
          tone: "secure",
          label: "SERVER HELLO",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: SOCKS_IP, protocol: "TCP (6)", totalLength: 1640 }),
            tcpLayer({ sport: 443, dport: 40220, flags: "PSH, ACK", seq: 1, ack: 518, payloadBytes: 1600 }),
            socksLayer("TLS ServerHello + Certificate + Finished", [{ name: "Source", value: WEB_SERVER_IP }]),
          ],
          capture: {
            time: 0.115,
            src: WEB_SERVER_IP,
            dst: SOCKS_IP,
            protocol: "TLSv1.3",
            info: "ServerHello + Certs (to SOCKS5 proxy)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 1600),
          },
        },
        {
          type: "packet",
          id: "s5-sh-out",
          from: "proxy",
          to: "laptop",
          via: ["router"],
          tone: "secure",
          label: "SERVER HELLO",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SOCKS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1640 }),
            tcpLayer({ sport: SOCKS_PORT, dport: EPHEMERAL_PORT_START + 7, flags: "PSH, ACK", seq: 13, ack: 543, payloadBytes: 1600 }),
            socksLayer("Relayed ServerHello -> app", [{ name: "End-to-end TLS", value: "App verifies certificate" }]),
          ],
          capture: {
            time: 0.13,
            src: SOCKS_IP,
            dst: LAPTOP_IP,
            protocol: "TLSv1.3",
            info: "ServerHello + Certs (relayed to app)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 1600),
          },
        },
      ],
    },
  ],
  outro: {
    title: "37-byte setup opened a protocol-neutral pipe",
    simple:
      "Four tiny messages told the SOCKS5 proxy where to connect and let it handle the DNS query; after that it only copied bytes untouched between sockets.",
    technical:
      "Completed RFC 1928 method negotiation, hostname-based CONNECT (remote DNS), and blind TCP stream relay for TLS 1.3.",
    facts: [
      { label: "Setup cost", value: "4 messages, 37 bytes total" },
      { label: "Destination sees", value: `${SOCKS_IP} (proxy IP)` },
      { label: "DNS resolution", value: "Handled remotely via ATYP 0x03" },
      { label: "Outer crypto", value: "None (inner TLS or ssh -D encrypts)" },
    ],
  },
  tryIt: [
    {
      title: "Start a local SOCKS5 tunnel over SSH and test it",
      explain: "Create a SOCKS5 listener on port 1080 with `ssh -D` and pass traffic through `socks5h://` so DNS resolves remotely too.",
      commands: [
        { os: "windows", cmd: "curl --socks5-hostname 192.0.2.80:1080 https://example.com" },
        { os: "macos", cmd: "curl --socks5-hostname 192.0.2.80:1080 https://example.com" },
        { os: "linux", cmd: "curl --socks5-hostname 192.0.2.80:1080 https://example.com" },
      ],
    },
  ],
});
