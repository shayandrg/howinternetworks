import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, UDP_HEADER, udpFrameBytes } from "../builders/sizes";
import { LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const MEDIA_SERVER_IP = "203.0.113.20"; // RFC 5737 TEST-NET-3
const AUDIO_PAYLOAD_BYTES = 92; // 12 B RTP header + 80 B Opus audio frame
const FRAME_BYTES = udpFrameBytes(AUDIO_PAYLOAD_BYTES).frameBytes;

function voiceLayers(
  srcIp: string,
  dstIp: string,
  sport: number,
  dport: number,
  seq: number,
) {
  return [
    ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
    ipv4Layer({
      src: srcIp,
      dst: dstIp,
      protocol: "UDP (17)",
      totalLength: IPV4_HEADER + UDP_HEADER + AUDIO_PAYLOAD_BYTES,
    }),
    udpLayer({ sport, dport, payloadBytes: AUDIO_PAYLOAD_BYTES }),
    {
      name: "RTP Audio Frame",
      summary: `Seq=${seq}, 20 ms voice`,
      fields: [
        { name: "Payload Type", value: "111 (Opus)" },
        { name: "Sequence Number", value: String(seq) },
        { name: "Audio Data", value: "80 bytes (20 ms)" },
      ],
    },
  ];
}

export const udpFlow = defineFlow({
  meta: {
    slug: "udp",
    kind: "flow",
    collection: "protocols",
    group: "delivery",
    title: "UDP",
    fullName: "User Datagram Protocol",
    tagline: "Fast, connectionless datagrams without handshakes or retries",
    layer: { tcpip: "transport", osi: 4 },
    prerequisites: ["ip"],
    related: ["ip", "tcp", "dns", "quic", "webrtc"],
    tags: ["udp", "transport", "datagram", "rtp", "voice"],
    sources: [
      {
        label: "RFC 768: User Datagram Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc768",
      },
      {
        label: "RFC 3550: RTP: A Transport Protocol for Real-Time Applications",
        url: "https://www.rfc-editor.org/rfc/rfc3550",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[udp|UDP]] sends short, independent messages called [[datagram|datagrams]] without opening a connection or waiting for receipts. Live calls and games prefer it because old data is useless once it arrives late.",
    technical:
      "User Datagram Protocol (RFC 768) wraps application payloads behind an 8-byte header containing source port, destination port, length, and checksum. It adds no handshakes, sequence tracking, or retransmissions, leaving ordering and loss handling to protocols like [[rtp|RTP]] (RFC 3550).",
  },
  facts: [
    { label: "Layer", value: "Transport (OSI Layer 4)" },
    { label: "Connection", value: "None (connectionless)" },
    { label: "Header size", value: "8 bytes fixed" },
    { label: "Reliability", value: "Best effort, no ACKs or resends" },
    { label: "Defined in", value: "RFC 768" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 360, y: 300 } },
      { id: "internet", kind: "cloud", label: "Internet", at: { x: 610, y: 300 } },
      { id: "media", kind: "server", label: "Media server", sublabel: MEDIA_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "media", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "send-immediately",
      title: "Send with zero setup",
      simple:
        "A voice app sends your first 20 ms of audio right away {{udp-v1}}. Unlike TCP, there is no handshake before the first [[datagram]] leaves.",
      technical:
        "The application sends a 92-byte [[rtp|RTP]] audio packet behind an 8-byte UDP header from port `50000` to `203.0.113.20:5004` {{udp-v1}} with zero connection setup delay (RFC 768).",
      facts: [
        { label: "Setup time", value: "0 ms" },
        { label: "UDP header", value: "8 bytes" },
        { label: "Ports", value: "50000 -> 5004" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "media"] },
            { type: "focus", actors: ["laptop", "router", "internet", "media"] },
          ],
        },
        {
          type: "packet",
          id: "udp-v1",
          from: "laptop",
          to: "media",
          tone: "data",
          label: "Voice 1",
          layers: voiceLayers(LAPTOP_IP, MEDIA_SERVER_IP, 50000, 5004, 1),
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: MEDIA_SERVER_IP,
            protocol: "UDP",
            info: "50000 -> 5004 Len=92",
            bytes: FRAME_BYTES,
          },
        },
      ],
    },
    {
      id: "stream-datagrams",
      title: "Stream independent datagrams",
      simple:
        "Your laptop keeps sending a fresh [[datagram]] every 20 ms {{udp-stream}}. Each packet travels on its own, with no acknowledgments coming back.",
      technical:
        "UDP treats every datagram as an isolated unit. Four consecutive voice frames leave 20 ms apart without sequence numbers at the UDP layer {{udp-stream}}.",
      facts: [
        { label: "Cadence", value: "1 datagram every 20 ms" },
        { label: "UDP numbering", value: "None" },
        { label: "Acknowledgments", value: "None" },
      ],
      events: [
        {
          type: "stream",
          id: "udp-stream",
          from: "laptop",
          to: "media",
          tone: "data",
          label: "Voice",
          count: 4,
          layers: voiceLayers(LAPTOP_IP, MEDIA_SERVER_IP, 50000, 5004, 2),
          captures: [2, 3, 4, 5].map((seq, i) => ({
            time: Number((0.02 * (i + 1)).toFixed(3)),
            src: LAPTOP_IP,
            dst: MEDIA_SERVER_IP,
            protocol: "UDP",
            info: `50000 -> 5004 Len=92 (frame ${seq})`,
            bytes: FRAME_BYTES,
          })),
        },
      ],
    },
    {
      id: "drop-without-resend",
      title: "Drop one without retrying",
      simple:
        "One voice packet is lost along the path {{udp-drop}}. Neither the server nor your laptop tries to resend it, and the next packets arrive normally.",
      technical:
        "Voice frame 7 is dropped on the internet link {{udp-drop}}. Because UDP maintains no retransmission timers or delivery state, frame 8 proceeds unimpeded.",
      facts: [
        { label: "Dropped", value: "Frame 7 (20 ms audio)" },
        { label: "Retransmission", value: "None" },
        { label: "Following frames", value: "Delivered without stall" },
      ],
      events: [
        {
          type: "stream",
          id: "udp-drop",
          from: "laptop",
          to: "media",
          tone: "data",
          label: "Voice",
          count: 3,
          lostIndexes: [1],
          layers: voiceLayers(LAPTOP_IP, MEDIA_SERVER_IP, 50000, 5004, 7),
          captures: [6, 7, 8].map((seq, i) => ({
            time: Number((0.1 + 0.02 * i).toFixed(3)),
            src: LAPTOP_IP,
            dst: MEDIA_SERVER_IP,
            protocol: "UDP",
            info: `50000 -> 5004 Len=92 (frame ${seq})`,
            bytes: FRAME_BYTES,
          })),
        },
        {
          type: "note",
          id: "note-udp-loss",
          at: "media",
          text: "Frame 7 never resent",
          tone: "error",
        },
      ],
    },
    {
      id: "receive-reply",
      title: "Receive the remote voice",
      simple:
        "The other caller's audio flows back to port `50000` {{udp-in}}. Your home router lets it through because it remembers your outgoing [[nat|NAT]] mapping.",
      technical:
        "Inbound [[datagram|datagrams]] from `203.0.113.20:5004` to port `50000` match the router's dynamic UDP NAT table entry {{udp-in}} and reach the laptop independently of outbound packets.",
      facts: [
        { label: "Return ports", value: "5004 -> 50000" },
        { label: "NAT state", value: "Mapped by outgoing traffic" },
        { label: "Direction", value: "Independent flow" },
      ],
      events: [
        {
          type: "stream",
          id: "udp-in",
          from: "media",
          to: "laptop",
          tone: "response",
          label: "Remote voice",
          count: 3,
          layers: voiceLayers(MEDIA_SERVER_IP, LAPTOP_IP, 5004, 50000, 1),
          captures: [1, 2, 3].map((seq, i) => ({
            time: Number((0.15 + 0.02 * i).toFixed(3)),
            src: MEDIA_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "UDP",
            info: `5004 -> 50000 Len=92 (remote ${seq})`,
            bytes: FRAME_BYTES,
          })),
        },
      ],
    },
    {
      id: "app-handles-loss",
      title: "Let the app handle gaps",
      simple:
        "The call app notices the missing frame using [[rtp|RTP]] numbers and hides the tiny 20 ms gap instead of pausing the whole conversation.",
      technical:
        "Protocols layered over UDP add only the features they need: RTP supplies sequence numbers and timestamps (RFC 3550), [[dns|DNS]] retries on timeout, and [[quic|QUIC]] builds full stream reliability on top.",
      facts: [
        { label: "Ordering", value: "Handled by app (RTP)" },
        { label: "20 ms gap", value: "Concealed in audio playback" },
        { label: "Built on UDP", value: "DNS, QUIC, RTP, DHCP" },
      ],
      events: [
        {
          type: "badge",
          at: "laptop",
          text: "App conceals gap",
          tone: "response",
        },
        { type: "wait", ms: 600 },
      ],
    },
  ],
  outro: {
    title: "Call kept moving",
    simple:
      "Audio started on the very first packet with no handshake, and a dropped packet never stalled the stream. The app smoothed over the gap and kept the call live.",
    technical:
      "Eleven UDP datagrams (8-byte transport header each) carried bidirectional 20 ms voice frames without connection state or retransmissions.",
    facts: [
      { label: "Header", value: "8 bytes (vs 20+ TCP)" },
      { label: "Handshake", value: "0 round trips" },
      { label: "Loss handling", value: "Left to application" },
      { label: "Frame size", value: `${FRAME_BYTES} B on wire` },
    ],
  },
  tryIt: [
    {
      title: "List listening UDP ports",
      explain:
        "See which local programs are listening on UDP sockets (such as DNS, DHCP, or media apps).",
      commands: [
        { os: "windows", cmd: "netstat -ano" },
        { os: "macos", cmd: "netstat -an" },
        { os: "linux", cmd: "ss -tunap" },
      ],
    },
  ],
});
