import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, IPV4_MSS, TCP_BASE_HEADER, tcpFrameBytes } from "../builders/sizes";
import { tcpAck, tcpClose, tcpHandshake } from "../builders/tcp";
import { LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

const CLIENT_PORT = 49152;
const REQ_BYTES = 73; // GET / HTTP/1.1 + Host + User-Agent + Accept
const REQ_FRAME = tcpFrameBytes(0, REQ_BYTES).frameBytes;
const SEG_FRAME = tcpFrameBytes(0, IPV4_MSS).frameBytes;
const BARE_ACK = tcpFrameBytes(0, 0).frameBytes;
const TWO_SEGS = IPV4_MSS * 2;

export const tcpFlow = defineFlow({
  meta: {
    slug: "tcp",
    kind: "flow",
    collection: "protocols",
    group: "delivery",
    title: "TCP",
    fullName: "Transmission Control Protocol",
    tagline: "Reliable, ordered byte delivery across IP networks",
    layer: { tcpip: "transport", osi: 4 },
    prerequisites: ["ip"],
    related: ["ip", "udp", "http", "tls", "quic"],
    tags: ["tcp", "transport", "handshake", "sack", "retransmission"],
    sources: [
      {
        label: "RFC 9293: Transmission Control Protocol (TCP)",
        url: "https://www.rfc-editor.org/rfc/rfc9293",
      },
      {
        label: "RFC 2018: TCP Selective Acknowledgment Options",
        url: "https://www.rfc-editor.org/rfc/rfc2018",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[tcp|TCP]] turns unreliable packet delivery into a dependable byte stream. It opens a session, numbers every byte sent, confirms arrivals, and resends anything lost on the way.",
    technical:
      "Transmission Control Protocol (RFC 9293) establishes a stateful connection via a three-way handshake, tracks sequence and acknowledgment numbers for every octet, detects gaps with duplicate ACKs and [[sack|SACK]] (RFC 2018), and closes each direction independently with [[fin|FIN]].",
  },
  facts: [
    { label: "Layer", value: "Transport (OSI Layer 4)" },
    { label: "Setup", value: "Three-way handshake (SYN, SYN-ACK, ACK)" },
    { label: "Reliability", value: "Sequence numbers, ACKs, SACK" },
    { label: "Header size", value: "20 bytes base (up to 60 with options)" },
    { label: "Defined in", value: "RFC 9293, RFC 2018" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 360, y: 300 } },
      { id: "internet", kind: "cloud", label: "Internet", at: { x: 610, y: 300 } },
      { id: "web", kind: "web-server", label: "Web server", sublabel: WEB_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "open-connection",
      title: "Open the connection",
      simple:
        "Before sending any web data, your laptop {{tcp-syn}} and the server {{tcp-syn-ack}} agree on starting numbers and confirm the link {{tcp-ack}}.",
      technical:
        "The client sends [[syn|SYN]] to port 80 with its initial sequence number and an [[mss|MSS]] of 1460 bytes. The server replies with SYN-ACK, and the client completes the handshake with [[ack|ACK]] (RFC 9293).",
      facts: [
        { label: "Server", value: `${WEB_SERVER_IP}:80` },
        { label: "Client port", value: String(CLIENT_PORT) },
        { label: "Handshake", value: "SYN -> SYN-ACK -> ACK" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "web"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: CLIENT_PORT,
          dport: 80,
          clientIsn: 0,
          serverIsn: 0,
          startTime: 0.0,
          rtt: 0.034,
          prefix: "tcp",
        }),
      ],
    },
    {
      id: "send-request",
      title: "Number every byte",
      simple:
        "Your laptop sends a 73-byte request {{tcp-req}}. The server replies with an acknowledgment {{tcp-req-ack}} telling your laptop the next byte number it expects.",
      technical:
        "The client transmits bytes 1 through 73 with PSH and ACK flags set. The server replies with ACK=74, confirming all octets up to 73 arrived cleanly.",
      facts: [
        { label: "Payload", value: `${REQ_BYTES} bytes (Seq 1..73)` },
        { label: "Ack number", value: "74 (next byte expected)" },
        { label: "Flags", value: "PSH, ACK" },
      ],
      events: [
        {
          type: "packet",
          id: "tcp-req",
          from: "laptop",
          to: "web",
          tone: "data",
          label: "DATA (73 B)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({
              src: LAPTOP_IP,
              dst: WEB_SERVER_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + REQ_BYTES,
            }),
            tcpLayer({
              sport: CLIENT_PORT,
              dport: 80,
              flags: "PSH, ACK",
              seq: 1,
              ack: 1,
              payloadBytes: REQ_BYTES,
            }),
          ],
          capture: {
            time: 0.034,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: `${CLIENT_PORT} -> 80 [PSH, ACK] Seq=1 Ack=1 Len=${REQ_BYTES}`,
            bytes: REQ_FRAME,
          },
        },
        tcpAck({
          id: "tcp-req-ack",
          from: "web",
          to: "laptop",
          srcIp: WEB_SERVER_IP,
          dstIp: LAPTOP_IP,
          sport: 80,
          dport: CLIENT_PORT,
          seq: 1,
          ack: REQ_BYTES + 1,
          time: 0.051,
          tone: "handshake",
          label: "ACK 74",
        }),
      ],
    },
    {
      id: "drop-segment",
      title: "Lose one of two segments",
      simple:
        "The server sends two large chunks {{tcp-burst}} back to back. The first chunk gets dropped in transit, while the second one reaches your laptop.",
      technical:
        "The server writes 2920 bytes split at the 1460-byte [[mss|MSS]]: segment 1 (Seq 1..1460) and segment 2 (Seq 1461..2920). Packet 1 is dropped along the internet path while packet 2 arrives.",
      facts: [
        { label: "Segment 1", value: "Bytes 1..1460 (lost)" },
        { label: "Segment 2", value: "Bytes 1461..2920 (arrived)" },
        { label: "MSS", value: "1460 bytes" },
      ],
      events: [
        {
          type: "stream",
          id: "tcp-burst",
          from: "web",
          to: "laptop",
          tone: "data",
          label: "DATA (1460 B)",
          count: 2,
          lostIndexes: [0],
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({
              src: WEB_SERVER_IP,
              dst: LAPTOP_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + IPV4_MSS,
            }),
            tcpLayer({
              sport: 80,
              dport: CLIENT_PORT,
              flags: "ACK",
              seq: 1,
              ack: REQ_BYTES + 1,
              payloadBytes: IPV4_MSS,
            }),
          ],
          captures: [
            {
              time: 0.052,
              src: WEB_SERVER_IP,
              dst: LAPTOP_IP,
              protocol: "TCP",
              info: `80 -> ${CLIENT_PORT} [ACK] Seq=1 Ack=${REQ_BYTES + 1} Len=${IPV4_MSS}`,
              bytes: SEG_FRAME,
            },
            {
              time: 0.053,
              src: WEB_SERVER_IP,
              dst: LAPTOP_IP,
              protocol: "TCP",
              info: `80 -> ${CLIENT_PORT} [PSH, ACK] Seq=${IPV4_MSS + 1} Ack=${REQ_BYTES + 1} Len=${IPV4_MSS}`,
              bytes: SEG_FRAME,
            },
          ],
        },
        {
          type: "note",
          id: "note-seg1-lost",
          at: "internet",
          text: "Segment 1 dropped",
          tone: "error",
        },
      ],
    },
    {
      id: "report-gap",
      title: "Report the gap with SACK",
      simple:
        "Your laptop sees byte 1461 without byte 1. It immediately repeats its request for byte 1 {{tcp-sack-ack}} and notes that it already holds bytes 1461 to 2920.",
      technical:
        "Because cumulative ACK can only advance to 1, the client sends a duplicate ACK=1 right away carrying a [[sack|SACK]] option block (SLE=1461, SRE=2921) per RFC 2018.",
      facts: [
        { label: "Cumulative ACK", value: "1 (missing bytes 1..1460)" },
        { label: "SACK block", value: "1461..2921 already buffered" },
        { label: "Options", value: "12 bytes (NOP, NOP, SACK)" },
      ],
      events: [
        {
          type: "packet",
          id: "tcp-sack-ack",
          from: "laptop",
          to: "web",
          tone: "handshake",
          label: "DUP ACK + SACK",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({
              src: LAPTOP_IP,
              dst: WEB_SERVER_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + 12,
            }),
            tcpLayer({
              sport: CLIENT_PORT,
              dport: 80,
              flags: "ACK",
              seq: REQ_BYTES + 1,
              ack: 1,
              optionsBytes: 12,
              optionsNote: "NOP, NOP, SACK 1461..2921",
            }),
          ],
          capture: {
            time: 0.069,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: `${CLIENT_PORT} -> 80 [ACK] Seq=${REQ_BYTES + 1} Ack=1 SLE=1461 SRE=2921`,
            bytes: tcpFrameBytes(12, 0).frameBytes,
          },
        },
      ],
    },
    {
      id: "resend-missing",
      title: "Resend only the missing gap",
      simple:
        "The server sees which range is missing and resends only the first chunk {{tcp-resend}}. Your laptop then confirms all 2920 bytes arrived {{tcp-ack-all}}.",
      technical:
        "Using the SACK feedback, the server retransmits only Seq 1..1460 without resending segment 2. The client advances cumulative ACK to 2921. If all ACKs were lost, a retransmission timer would trigger instead.",
      facts: [
        { label: "Retransmitted", value: "Bytes 1..1460 only" },
        { label: "Updated ACK", value: String(TWO_SEGS + 1) },
        { label: "App view", value: "Contiguous ordered bytes" },
      ],
      events: [
        {
          type: "packet",
          id: "tcp-resend",
          from: "web",
          to: "laptop",
          tone: "data",
          label: "RESEND (1460 B)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({
              src: WEB_SERVER_IP,
              dst: LAPTOP_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + IPV4_MSS,
            }),
            tcpLayer({
              sport: 80,
              dport: CLIENT_PORT,
              flags: "ACK",
              seq: 1,
              ack: REQ_BYTES + 1,
              payloadBytes: IPV4_MSS,
            }),
          ],
          capture: {
            time: 0.095,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "TCP",
            info: `80 -> ${CLIENT_PORT} [TCP Retransmission] Seq=1 Ack=${REQ_BYTES + 1} Len=${IPV4_MSS}`,
            bytes: SEG_FRAME,
          },
        },
        tcpAck({
          id: "tcp-ack-all",
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: CLIENT_PORT,
          dport: 80,
          seq: REQ_BYTES + 1,
          ack: TWO_SEGS + 1,
          time: 0.112,
          tone: "handshake",
          label: "ACK 2921",
        }),
      ],
    },
    {
      id: "close-connection",
      title: "Close both directions",
      simple:
        "When the transfer finishes, each side closes its half of the stream {{close-fin-1}} {{close-ack-1}} {{close-fin-2}} {{close-ack-2}} so no trailing bytes are lost.",
      technical:
        "Both endpoints tear down their half-duplex streams with FIN and ACK. The active closer (the laptop) enters TIME-WAIT so delayed packets from this session cannot confuse a future connection (RFC 9293).",
      facts: [
        { label: "Sequence", value: "FIN-ACK -> ACK -> FIN-ACK -> ACK" },
        { label: "Bare ACK size", value: `${BARE_ACK} B (54 B padded to 60)` },
        { label: "Final state", value: "TIME-WAIT on client" },
      ],
      events: tcpClose({
        from: "laptop",
        to: "web",
        srcIp: LAPTOP_IP,
        dstIp: WEB_SERVER_IP,
        sport: CLIENT_PORT,
        dport: 80,
        clientSeq: REQ_BYTES + 1,
        serverSeq: TWO_SEGS + 1,
        startTime: 0.113,
        rtt: 0.032,
        prefix: "close",
      }),
    },
  ],
  outro: {
    title: "Stream completed reliably",
    simple:
      "TCP opened a session, tracked every byte, spotted a dropped segment using SACK, resent only what was missing, and closed both directions cleanly.",
    technical:
      `Delivered ${REQ_BYTES} bytes upstream and ${TWO_SEGS} bytes downstream over port 80 on ${WEB_DOMAIN}, recovering from single-segment loss without disturbing application order.`,
    facts: [
      { label: "Bytes sent", value: `${REQ_BYTES} B up, ${TWO_SEGS} B down` },
      { label: "Loss recovery", value: "Duplicate ACK + SACK" },
      { label: "MSS", value: `${IPV4_MSS} bytes` },
      { label: "Teardown", value: "Four-way FIN exchange" },
    ],
  },
  tryIt: [
    {
      title: "Inspect active TCP sockets",
      explain:
        "View open TCP connections, local and remote ports, and states such as ESTABLISHED or TIME_WAIT.",
      commands: [
        { os: "windows", cmd: "netstat -ano" },
        { os: "macos", cmd: "netstat -an" },
        { os: "linux", cmd: "ss -tunap" },
      ],
    },
  ],
});
