import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const FTP_SERVER_IP = "203.0.113.21"; // RFC 5737 TEST-NET-3
const FTP_HOST = "ftp.example.com";
const FTP_CTRL_PORT = 21;
const FTP_DATA_PORT = 195 * 256 + 149; // 50069
const FTP_FILE_BYTES = 4000;

function ftpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "FTP", summary, fields };
}

export const ftpFlow = defineFlow({
  meta: {
    slug: "ftp",
    kind: "flow",
    collection: "protocols",
    group: "files",
    title: "FTP",
    fullName: "File Transfer Protocol",
    tagline: "Dual-connection file transfer and why encryption replaced it",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["tcp"],
    related: ["ssh", "tls", "tcp", "smb"],
    tags: ["ftp", "files", "pasv", "plaintext", "sftp"],
    sources: [
      {
        label: "RFC 959: File Transfer Protocol (FTP)",
        url: "https://www.rfc-editor.org/rfc/rfc959",
      },
      {
        label: "RFC 4217: Securing FTP with TLS (FTPS)",
        url: "https://www.rfc-editor.org/rfc/rfc4217",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[ftp|FTP]] copies files using two separate TCP connections: one control channel for commands, and a new data connection for each file or directory listing. Standard FTP sends logins and files in plain text.",
    technical:
      "File Transfer Protocol (RFC 959) keeps a persistent control connection on TCP port 21 while opening ephemeral data connections per transfer. Modern deployments use SFTP (over [[ssh|SSH]]) or FTPS (RFC 4217).",
  },
  facts: [
    { label: "Layer", value: "Application (over TCP)" },
    { label: "Control port", value: "TCP 21" },
    { label: "Data socket", value: "Separate TCP connection per file" },
    { label: "Encryption", value: "None in classic FTP" },
    { label: "Safer options", value: "SFTP (over SSH) or FTPS" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "ftp", kind: "file-server", label: FTP_HOST, sublabel: FTP_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "ftp", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "control",
      title: "Open control link on port 21",
      simple:
        "Your laptop opens a TCP socket to port 21 on `ftp.example.com` {{ftp-ctrl-syn}}, and the server sends a `220` greeting {{ftp-220}}. This channel carries commands for the entire session without encryption.",
      technical:
        "RFC 959 opens the Telnet-formatted control channel on port 21. Every server reply begins with a 3-digit status code.",
      facts: [
        { label: "Server", value: `${FTP_HOST}:21` },
        { label: "Greeting", value: "220 (vsFTPd 3.0.5)" },
        { label: "Encryption", value: "None (clear text)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "ftp"] },
            { type: "focus", actors: ["laptop", "router", "internet", "ftp"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "ftp",
          srcIp: LAPTOP_IP,
          dstIp: FTP_SERVER_IP,
          dport: FTP_CTRL_PORT,
          startTime: 0.0,
          rtt: 0.018,
          prefix: "ftp-ctrl",
        }),
        {
          type: "packet",
          id: "ftp-220",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "220 READY",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 60 }),
            tcpLayer({ sport: FTP_CTRL_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 20 }),
            ftpLayer("220 (vsFTPd 3.0.5)", [{ name: "Status", value: "220 Service ready for user" }]),
          ],
          capture: {
            time: 0.03,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP",
            info: "Response: 220 (vsFTPd 3.0.5)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 20),
          },
        },
      ],
    },
    {
      id: "login",
      title: "Send credentials in clear text",
      simple:
        "The app sends `USER alice` {{ftp-user}}, gets `331` asking for a password, and transmits `PASS secret` {{ftp-pass}}. Anyone watching traffic on the path can read both credentials.",
      technical:
        "Classic FTP (RFC 959) sends `USER` and `PASS` commands as unencrypted ASCII lines. Intermediate hops can inspect every character.",
      facts: [
        { label: "Commands", value: "USER alice, PASS secret" },
        { label: "Login reply", value: "230 Login successful." },
        { label: "Risk", value: "Readable in transit" },
      ],
      events: [
        {
          type: "packet",
          id: "ftp-user",
          from: "laptop",
          to: "ftp",
          via: ["router", "internet"],
          tone: "request",
          label: "USER alice",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: FTP_SERVER_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: FTP_CTRL_PORT, flags: "PSH, ACK", seq: 1, ack: 21, payloadBytes: 12 }),
            ftpLayer("USER alice", [{ name: "Visibility", value: "Plain text ASCII" }]),
          ],
          capture: {
            time: 0.04,
            src: LAPTOP_IP,
            dst: FTP_SERVER_IP,
            protocol: "FTP",
            info: "Request: USER alice",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "packet",
          id: "ftp-331",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "331 PASSWORD?",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 74 }),
            tcpLayer({ sport: FTP_CTRL_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 21, ack: 13, payloadBytes: 34 }),
            ftpLayer("331 Please specify the password.", [{ name: "Code", value: "331 Need password" }]),
          ],
          capture: {
            time: 0.06,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP",
            info: "Response: 331 Please specify the password.",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 34),
          },
        },
        {
          type: "packet",
          id: "ftp-pass",
          from: "laptop",
          to: "ftp",
          via: ["router", "internet"],
          tone: "request",
          label: "PASS secret",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: FTP_SERVER_IP, protocol: "TCP (6)", totalLength: 53 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: FTP_CTRL_PORT, flags: "PSH, ACK", seq: 13, ack: 55, payloadBytes: 13 }),
            ftpLayer("PASS secret", [{ name: "Warning", value: "Unencrypted password on the wire" }]),
          ],
          capture: {
            time: 0.065,
            src: LAPTOP_IP,
            dst: FTP_SERVER_IP,
            protocol: "FTP",
            info: "Request: PASS secret",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 13),
          },
        },
        {
          type: "note",
          id: "note-plain-pass",
          at: "router",
          text: "Password readable here",
          tone: "error",
        },
        {
          type: "packet",
          id: "ftp-230",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "230 LOGIN OK",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 63 }),
            tcpLayer({ sport: FTP_CTRL_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 55, ack: 26, payloadBytes: 23 }),
            ftpLayer("230 Login successful.", [{ name: "Code", value: "230 Logged in" }]),
          ],
          capture: {
            time: 0.085,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP",
            info: "Response: 230 Login successful.",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 23),
          },
        },
      ],
    },
    {
      id: "pasv",
      title: "Pick data port via Passive mode",
      simple:
        "After switching to binary mode (`TYPE I`), [[pasv|PASV]] opens a data port on the server {{ftp-pasv}}. `227` returns port `50069`, letting the laptop connect out past NAT.",
      technical:
        "`TYPE I` sets raw octet mode (Image). In `227 (203,0,113,21,195,149)` {{ftp-227}}, the last two octets compute the port: `195 * 256 + 149 = 50069`, avoiding inbound connections blocked by NAT.",
      facts: [
        { label: "Binary mode", value: "TYPE I -> 200 Switching to Binary" },
        { label: "PASV reply", value: "227 (203,0,113,21,195,149)" },
        { label: "Data port", value: `195 * 256 + 149 = ${FTP_DATA_PORT}` },
      ],
      events: [
        {
          type: "packet",
          id: "ftp-pasv",
          from: "laptop",
          to: "ftp",
          via: ["router", "internet"],
          tone: "request",
          label: "TYPE I / PASV",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: FTP_SERVER_IP, protocol: "TCP (6)", totalLength: 54 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: FTP_CTRL_PORT, flags: "PSH, ACK", seq: 26, ack: 78, payloadBytes: 14 }),
            ftpLayer("TYPE I then PASV", [{ name: "Purpose", value: "Binary mode + server listening port" }]),
          ],
          capture: {
            time: 0.1,
            src: LAPTOP_IP,
            dst: FTP_SERVER_IP,
            protocol: "FTP",
            info: "Request: PASV (enter passive mode)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 14),
          },
        },
        {
          type: "packet",
          id: "ftp-227",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "227 PORT 50069",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 91 }),
            tcpLayer({ sport: FTP_CTRL_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 78, ack: 40, payloadBytes: 51 }),
            ftpLayer(`227 Passive reply (host 203.0.113.21, port 50069)`, [
              { name: "Decoded host", value: FTP_SERVER_IP },
              { name: "Decoded port", value: String(FTP_DATA_PORT) },
            ]),
          ],
          capture: {
            time: 0.125,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP",
            info: "Response: 227 Entering Passive Mode (port 50069)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 51),
          },
        },
      ],
    },
    {
      id: "data-open",
      title: "Open data socket and run RETR",
      simple:
        "The laptop opens a second TCP connection directly to port 50069 {{ftp-data-syn}}. On the original control socket, it asks for `report.pdf` with `RETR` {{ftp-retr}}, and the server answers `150` {{ftp-150}}.",
      technical:
        "Passive mode establishes a fresh 3-way TCP handshake to `203.0.113.21:50069` from client port `52345`, then triggers `RETR report.pdf` on port 21.",
      facts: [
        { label: "Data socket", value: `${FTP_SERVER_IP}:${FTP_DATA_PORT}` },
        { label: "Control command", value: "RETR report.pdf" },
        { label: "Reply", value: "150 Opening BINARY data connection" },
      ],
      events: [
        ...tcpHandshake({
          from: "laptop",
          to: "ftp",
          srcIp: LAPTOP_IP,
          dstIp: FTP_SERVER_IP,
          sport: EPHEMERAL_PORT_START + 1,
          dport: FTP_DATA_PORT,
          startTime: 0.14,
          rtt: 0.018,
          prefix: "ftp-data",
        }),
        {
          type: "packet",
          id: "ftp-retr",
          from: "laptop",
          to: "ftp",
          via: ["router", "internet"],
          tone: "request",
          label: "RETR report.pdf",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: FTP_SERVER_IP, protocol: "TCP (6)", totalLength: 57 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: FTP_CTRL_PORT, flags: "PSH, ACK", seq: 40, ack: 129, payloadBytes: 17 }),
            ftpLayer("RETR report.pdf", [{ name: "Requested file", value: "report.pdf (4,000 B)" }]),
          ],
          capture: {
            time: 0.165,
            src: LAPTOP_IP,
            dst: FTP_SERVER_IP,
            protocol: "FTP",
            info: "Request: RETR report.pdf",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 17),
          },
        },
        {
          type: "packet",
          id: "ftp-150",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "150 OPENING",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 92 }),
            tcpLayer({ sport: FTP_CTRL_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 129, ack: 57, payloadBytes: 52 }),
            ftpLayer("150 Opening BINARY mode data connection (4000 bytes)", [{ name: "Channel", value: "Data connection port 50069" }]),
          ],
          capture: {
            time: 0.185,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP",
            info: "Response: 150 Opening BINARY data connection",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 52),
          },
        },
      ],
    },
    {
      id: "transfer",
      title: "Stream bytes and close at EOF",
      simple:
        "All 4,000 bytes travel unencrypted across three TCP segments {{ftp-file-data}}. FTP has no byte-count marker: closing the socket with `FIN` ends the file {{ftp-data-fin}}.",
      technical:
        "Segments of `1460 + 1460 + 1080` bytes carry `report.pdf` on port 50069. Server TCP `FIN` denotes end-of-file per RFC 959 §3.4, followed by `226 Transfer complete.` on port 21.",
      facts: [
        { label: "Payload", value: "4,000 B (1460 + 1460 + 1080)" },
        { label: "EOF marker", value: "FIN closes the data connection" },
        { label: "Control status", value: "226 Transfer complete." },
      ],
      events: [
        {
          type: "packet",
          id: "ftp-file-data",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "data",
          label: "DATA (4,000 B)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: FTP_DATA_PORT, dport: EPHEMERAL_PORT_START + 1, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: FTP_FILE_BYTES }),
            ftpLayer("FTP-DATA (report.pdf, unencrypted)", [
              { name: "Segments", value: "1460 + 1460 + 1080 = 4,000 bytes" },
              { name: "Security", value: "Clear text payload" },
            ]),
          ],
          capture: {
            time: 0.21,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP-DATA",
            info: "report.pdf across 3 TCP segments (1460 + 1460 + 1080 B)",
            bytes: FTP_FILE_BYTES + 3 * (14 + IPV4_HEADER + TCP_BASE_HEADER),
          },
        },
        {
          type: "packet",
          id: "ftp-data-fin",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "handshake",
          label: "DATA FIN",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: IPV4_HEADER + TCP_BASE_HEADER }),
            tcpLayer({ sport: FTP_DATA_PORT, dport: EPHEMERAL_PORT_START + 1, flags: "FIN, ACK", seq: 4001, ack: 1 }),
          ],
          capture: {
            time: 0.23,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "TCP",
            info: `${FTP_DATA_PORT} -> ${EPHEMERAL_PORT_START + 1} [FIN, ACK] Seq=4001 (EOF)`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER),
          },
        },
        {
          type: "packet",
          id: "ftp-226",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "226 COMPLETE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 64 }),
            tcpLayer({ sport: FTP_CTRL_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 181, ack: 57, payloadBytes: 24 }),
            ftpLayer("226 Transfer complete.", [{ name: "Channel", value: "Control connection (port 21)" }]),
          ],
          capture: {
            time: 0.25,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP",
            info: "Response: 226 Transfer complete.",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 24),
          },
        },
      ],
    },
    {
      id: "quit",
      title: "Close control link safely",
      simple:
        "Finally `QUIT` ends the control session {{ftp-quit}} with `221 Goodbye` {{ftp-221}}. Because plain FTP exposes both passwords and files, real transfers use SFTP (over [[ssh|SSH]]) or FTPS (FTP inside [[tls|TLS]]).",
      technical:
        "RFC 959 `QUIT` closes the control channel. For confidentiality and integrity, SFTP runs a binary subsystem inside SSH port 22, while RFC 4217 FTPS wraps FTP control and data channels in TLS.",
      facts: [
        { label: "Control close", value: "QUIT -> 221 Goodbye." },
        { label: "SFTP", value: "Subsystem over SSH (port 22)" },
        { label: "FTPS", value: "FTP inside TLS (RFC 4217)" },
      ],
      events: [
        {
          type: "packet",
          id: "ftp-quit",
          from: "laptop",
          to: "ftp",
          via: ["router", "internet"],
          tone: "request",
          label: "QUIT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: FTP_SERVER_IP, protocol: "TCP (6)", totalLength: 46 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: FTP_CTRL_PORT, flags: "PSH, ACK", seq: 57, ack: 205, payloadBytes: 6 }),
            ftpLayer("QUIT", [{ name: "Action", value: "Close control socket" }]),
          ],
          capture: {
            time: 0.27,
            src: LAPTOP_IP,
            dst: FTP_SERVER_IP,
            protocol: "FTP",
            info: "Request: QUIT",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 6),
          },
        },
        {
          type: "packet",
          id: "ftp-221",
          from: "ftp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "221 GOODBYE",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: FTP_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 54 }),
            tcpLayer({ sport: FTP_CTRL_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 205, ack: 63, payloadBytes: 14 }),
            ftpLayer("221 Goodbye.", [{ name: "Recommendation", value: "Use SFTP or FTPS in practice" }]),
          ],
          capture: {
            time: 0.29,
            src: FTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "FTP",
            info: "Response: 221 Goodbye.",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 14),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Two connections finished the download",
    simple:
      "Port 21 handled commands while port 50069 carried the file bytes, and closing the data socket marked the end of the file. Modern systems replace classic FTP with SFTP or FTPS to encrypt passwords and data.",
    technical:
      "Completed RFC 959 passive FTP transfer: port 21 control, port 50069 data handshake, 4,000-byte binary stream, FIN EOF signaling, and 221 close.",
    facts: [
      { label: "Connections", value: "2 (port 21 control + port 50069 data)" },
      { label: "Transferred", value: "4,000 B across 3 segments" },
      { label: "Classic flaw", value: "Credentials and files unencrypted" },
      { label: "Encrypted alternatives", value: "SFTP or FTPS" },
    ],
  },
  tryIt: [
    {
      title: "Prefer SFTP over SSH on the command line",
      explain: "SFTP runs inside an encrypted SSH connection on port 22 instead of classic plain-text FTP.",
      commands: [
        { os: "windows", cmd: "sftp alice@example.com" },
        { os: "macos", cmd: "sftp alice@example.com" },
        { os: "linux", cmd: "sftp alice@example.com" },
      ],
    },
  ],
});
