import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, tcpLayer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER, UDP_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_MAC, ROUTER_WAN_IP } from "../world";

const SIGNAL_IP = "203.0.113.40";
const STUN_IP = "198.51.100.34";
const PEER_WAN_IP = "198.51.100.200";

function rtcLayer(name: string, summary: string, fields: Array<{ name: string; value: string }>) {
  return { name, summary, fields };
}

export const webrtcFlow = defineFlow({
  meta: {
    slug: "webrtc",
    kind: "flow",
    collection: "protocols",
    group: "calls",
    title: "WebRTC",
    fullName: "Web Real-Time Communication",
    tagline: "Peer-to-peer browser video calls via ICE, DTLS, and SRTP",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["udp", "tls", "websocket"],
    related: ["sip", "rtsp", "udp", "websocket"],
    tags: ["webrtc", "ice", "stun", "dtls", "srtp"],
    sources: [
      {
        label: "RFC 8825: Overview: Real-Time Protocols for Browser-Based Applications",
        url: "https://www.rfc-editor.org/rfc/rfc8825",
      },
      {
        label: "RFC 8445: Interactive Connectivity Establishment (ICE)",
        url: "https://www.rfc-editor.org/rfc/rfc8445",
      },
      {
        label: "RFC 8489: Session Traversal Utilities for NAT (STUN)",
        url: "https://www.rfc-editor.org/rfc/rfc8489",
      },
      {
        label: "RFC 9147: The Datagram Transport Layer Security (DTLS) Protocol Version 1.3",
        url: "https://www.rfc-editor.org/rfc/rfc9147",
      },
      {
        label: "W3C WebRTC 1.0: Real-Time Communication Between Browsers",
        url: "https://www.w3.org/TR/webrtc/",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[webrtc|WebRTC]] connects two browsers straight to each other for low-latency audio and video. A signaling server introduces the callers, [[stun|STUN]] and [[ice|ICE]] punch through home NATs, and [[dtls|DTLS]] sets up encrypted [[srtp|SRTP]].",
    technical:
      "Combining W3C APIs with IETF protocols (RFC 8825), WebRTC trades [[sdp|SDP]] offers over app signaling, probes peer-to-peer UDP paths via ICE/STUN, runs DTLS 1.3 (fallback 1.2) for keys, and streams encrypted SRTP.",
  },
  facts: [
    { label: "Layer", value: "Application (media over UDP SRTP)" },
    { label: "Traversal", value: "ICE + STUN (TURN fallback)" },
    { label: "Key exchange", value: "DTLS 1.3 (1.2 fallback)" },
    { label: "Encryption", value: "Mandatory SRTP (always on)" },
    { label: "Defined in", value: "W3C; RFC 8825, 8445, 8489, 9147" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 95, y: 320 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_WAN_IP, at: { x: 280, y: 320 } },
      { id: "sig", kind: "web-server", label: "call.example.com", sublabel: SIGNAL_IP, at: { x: 480, y: 120 } },
      { id: "stun", kind: "server", label: "STUN server", sublabel: STUN_IP, at: { x: 690, y: 120 } },
      { id: "internet", kind: "cloud", label: "Internet", at: { x: 580, y: 320 } },
      { id: "peer", kind: "laptop", label: "Sam's laptop", sublabel: PEER_WAN_IP, at: { x: 890, y: 320 } },
    ],
    links: [
      { id: "l-lan", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-net", from: "router", to: "internet", medium: "fiber" },
      { id: "l-sig", from: "internet", to: "sig", medium: "internet" },
      { id: "l-stun", from: "internet", to: "stun", medium: "internet" },
      { id: "l-peer", from: "internet", to: "peer", medium: "internet" },
    ],
    start: {
      visible: ["laptop", "router", "sig", "stun", "internet", "peer"],
      focus: ["laptop", "router", "sig", "stun", "internet", "peer"],
    },
  },
  steps: [
    {
      id: "signaling",
      title: "Join call via signaling server",
      simple:
        "Both browsers hold TLS WebSockets open to `call.example.com` and join room 42 {{rtc-join}} {{rtc-here}}. WebRTC leaves signaling design to each application.",
      technical:
        "Browsers coordinate session state through application-defined signaling (here WSS over TCP 443) before attempting direct UDP media paths.",
      facts: [
        { label: "Signaling", value: "App-defined (WSS over TLS)" },
        { label: "Room", value: "Room 42 (Sam waiting)" },
        { label: "Server role", value: "Introductions only, not media" },
      ],
      events: [
        {
          type: "packet",
          id: "rtc-join",
          from: "laptop",
          to: "sig",
          via: ["router", "internet"],
          tone: "control",
          label: "JOIN ROOM 42",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SIGNAL_IP, protocol: "TCP (6)", totalLength: 120 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 12, dport: 443, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 80 }),
            rtcLayer("Signaling (WSS)", 'join("room-42")', [{ name: "Role", value: "Enter room 42" }]),
          ],
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: SIGNAL_IP,
            protocol: "WebSocket",
            info: 'Signaling JOIN {"room":42}',
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 80),
          },
        },
        {
          type: "packet",
          id: "rtc-here",
          from: "sig",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "SAM WAITING",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SIGNAL_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 120 }),
            tcpLayer({ sport: 443, dport: EPHEMERAL_PORT_START + 12, flags: "PSH, ACK", seq: 1, ack: 81, payloadBytes: 80 }),
            rtcLayer("Signaling (WSS)", "Peer Sam present", [{ name: "Status", value: "Ready for SDP offer" }]),
          ],
          capture: {
            time: 0.018,
            src: SIGNAL_IP,
            dst: LAPTOP_IP,
            protocol: "WebSocket",
            info: "Signaling PEER_JOINED (Sam)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 80),
          },
        },
      ],
    },
    {
      id: "stun-binding",
      title: "Learn public NAT port via STUN",
      simple:
        "Behind NAT (`192.168.1.10`), the laptop sends a small UDP [[stun|STUN]] Binding query to port 3478 {{rtc-stun-q}}. The STUN server reports the router's public IP and mapped port `198.51.100.7:61022` {{rtc-stun-a}}.",
      technical:
        "RFC 8489 STUN Binding Response embeds `XOR-MAPPED-ADDRESS` showing the NAT-translated WAN IP and port to include as a server-reflexive ICE candidate.",
      facts: [
        { label: "STUN port", value: "UDP 3478" },
        { label: "Private IP", value: LAPTOP_IP },
        { label: "Public mapping", value: `${ROUTER_WAN_IP}:61022` },
      ],
      events: [
        {
          type: "packet",
          id: "rtc-stun-q",
          from: "laptop",
          to: "stun",
          via: ["router", "internet"],
          tone: "lookup",
          label: "STUN BINDING?",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: STUN_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 20 }),
            udpLayer({ sport: 61022, dport: 3478, length: UDP_HEADER + 20 }),
            rtcLayer("STUN Binding Request", "Discover public NAT mapping", [{ name: "RFC 8489", value: "20 B header" }]),
          ],
          capture: {
            time: 0.025,
            src: LAPTOP_IP,
            dst: STUN_IP,
            protocol: "STUN",
            info: "Binding Request (port 3478)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 20),
          },
        },
        {
          type: "packet",
          id: "rtc-stun-a",
          from: "stun",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "YOUR IP :61022",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: STUN_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 32 }),
            udpLayer({ sport: 3478, dport: 61022, length: UDP_HEADER + 32 }),
            rtcLayer("STUN Binding Response", `XOR-MAPPED-ADDRESS = ${ROUTER_WAN_IP}:61022`, [
              { name: "Candidate", value: "srflx 198.51.100.7:61022" },
            ]),
          ],
          capture: {
            time: 0.04,
            src: STUN_IP,
            dst: LAPTOP_IP,
            protocol: "STUN",
            info: `Binding Success (${ROUTER_WAN_IP}:61022)`,
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 32),
          },
        },
      ],
    },
    {
      id: "sdp-offer-answer",
      title: "Trade SDP Offers and Answers",
      simple:
        "Your browser relays an [[sdp|SDP]] Offer (Opus/VP8, DTLS print, ICE keys, `.local` + `198.51.100.7`) via `call.example.com` {{rtc-offer}}, and Sam replies {{rtc-answer}}.",
      technical:
        "Exchanging ~4.7 KB SDP payloads over TLS signaling lets both peers learn media codecs, ICE ufrag/pwd, mDNS `.local` privacy hostnames, and public NAT candidates.",
      facts: [
        { label: "Media codecs", value: "Opus audio; VP8 / H.264 video" },
        { label: "Fingerprint", value: "SHA-256 of self-signed DTLS cert" },
        { label: "Sam candidate", value: `${PEER_WAN_IP}:49170` },
      ],
      events: [
        {
          type: "packet",
          id: "rtc-offer",
          from: "laptop",
          to: "peer",
          via: ["router", "internet", "sig", "internet"],
          tone: "request",
          label: "SDP OFFER",
          layers: [
            rtcLayer("SDP Offer (~4.7 KB via WSS)", "Codecs, DTLS fingerprint, ICE candidates", [
              { name: "Privacy", value: "LAN IP masked via .local mDNS" },
            ]),
          ],
          capture: {
            time: 0.05,
            src: LAPTOP_IP,
            dst: PEER_WAN_IP,
            protocol: "Signaling",
            info: "SDP Offer relayed via call.example.com",
            bytes: 1400,
          },
        },
        {
          type: "packet",
          id: "rtc-answer",
          from: "peer",
          to: "laptop",
          via: ["internet", "sig", "internet", "router"],
          tone: "response",
          label: "SDP ANSWER",
          layers: [
            rtcLayer("SDP Answer (Opus + VP8)", `Candidates include ${PEER_WAN_IP}:49170`, [
              { name: "Role", value: "Sam selected active DTLS role" },
            ]),
          ],
          capture: {
            time: 0.08,
            src: PEER_WAN_IP,
            dst: ROUTER_WAN_IP,
            protocol: "Signaling",
            info: "SDP Answer (Opus, VP8, ICE candidates)",
            bytes: 1280,
          },
        },
      ],
    },
    {
      id: "ice-hole-punch",
      title: "Punch through NATs with ICE",
      simple:
        "Both laptops fire direct STUN Binding checks at each other's public ports {{rtc-ice-q}}. Outbound checks open return pinholes in both routers so the direct reply succeeds {{rtc-ice-a}}, followed by `USE-CANDIDATE`.",
      technical:
        "RFC 8445 ICE pairs candidates authenticated by exchanged ICE passwords. Concurrent outbound UDP datagrams create symmetric NAT mappings enabling direct peer-to-peer flow.",
      facts: [
        { label: "Path", value: `${ROUTER_WAN_IP}:61022 <-> ${PEER_WAN_IP}:49170` },
        { label: "Check auth", value: "HMAC keyed with ICE password" },
        { label: "Result", value: "Direct NAT-to-NAT UDP path open" },
      ],
      events: [
        {
          type: "packet",
          id: "rtc-ice-q",
          from: "laptop",
          to: "peer",
          via: ["router", "internet"],
          tone: "handshake",
          label: "ICE STUN CHECK",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PEER_WAN_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 96 }),
            udpLayer({ sport: 61022, dport: 49170, length: UDP_HEADER + 96 }),
            rtcLayer("ICE Connectivity Check", "STUN Binding Request (USE-CANDIDATE)", [{ name: "Path", value: "Direct peer-to-peer" }]),
          ],
          capture: {
            time: 0.1,
            src: ROUTER_WAN_IP,
            dst: PEER_WAN_IP,
            protocol: "STUN",
            info: "ICE Binding Check (61022 -> 49170)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 96),
          },
        },
        {
          type: "packet",
          id: "rtc-ice-a",
          from: "peer",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "ICE CHECK OK",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: PEER_WAN_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 84 }),
            udpLayer({ sport: 49170, dport: 61022, length: UDP_HEADER + 84 }),
            rtcLayer("ICE Connectivity Success", "Direct path selected", [{ name: "Status", value: "Through both NATs" }]),
          ],
          capture: {
            time: 0.125,
            src: PEER_WAN_IP,
            dst: ROUTER_WAN_IP,
            protocol: "STUN",
            info: "ICE Binding Success (direct path verified)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 84),
          },
        },
      ],
    },
    {
      id: "dtls-handshake",
      title: "Run DTLS 1.3 to derive SRTP keys",
      simple:
        "Over that direct UDP path, browsers run a [[dtls|DTLS]] 1.3 handshake (with 1.2 fallback) {{rtc-dtls-1}} {{rtc-dtls-2}}, matching each self-signed cert against its SDP fingerprint and exporting [[srtp|SRTP]] keys.",
      technical:
        "RFC 9147 DTLS 1.3 (fallback DTLS 1.2) binds `dtls-srtp` keys directly peer-to-peer; WebRTC forbids unencrypted media.",
      facts: [
        { label: "Key protocol", value: "DTLS 1.3 default (1.2 fallback)" },
        { label: "Cert validation", value: "Matches signed SDP fingerprint" },
        { label: "Exported keys", value: "SRTP encryption & auth keys" },
      ],
      events: [
        {
          type: "packet",
          id: "rtc-dtls-1",
          from: "peer",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "DTLS 1.3 CH",
          layers: [
            rtcLayer("DTLS 1.3 ClientHello -> Certificate", "DTLS over UDP", [
              { name: "Profile", value: "use_srtp (AES-GCM)" },
            ]),
          ],
          capture: {
            time: 0.14,
            src: PEER_WAN_IP,
            dst: ROUTER_WAN_IP,
            protocol: "DTLSv1.3",
            info: "ClientHello (use_srtp extension)",
            bytes: 420,
          },
        },
        {
          type: "packet",
          id: "rtc-dtls-2",
          from: "laptop",
          to: "peer",
          via: ["router", "internet"],
          tone: "secure",
          label: "DTLS FINISHED",
          layers: [
            rtcLayer("DTLS 1.3 ServerHello + Finished", "SRTP keys derived", [{ name: "Security", value: "End-to-end peer keys" }]),
          ],
          capture: {
            time: 0.165,
            src: ROUTER_WAN_IP,
            dst: PEER_WAN_IP,
            protocol: "DTLSv1.3",
            info: "Finished (SRTP media keys ready)",
            bytes: 540,
          },
        },
      ],
    },
    {
      id: "srtp-media",
      title: "Stream direct SRTP media",
      simple:
        "Encrypted Opus audio (20 ms) and VP8 video flow straight between peers as [[srtp|SRTP]] {{rtc-av-out}} {{rtc-av-in}}. Strict firewalls fall back to a [[turn|TURN]] relay.",
      technical:
        "SRTP keeps RTP sequence/timestamps legible for jitter recovery while encrypting payloads. Corporate symmetric firewalls use TURN relays (encrypted) or group SFUs when direct UDP fails.",
      facts: [
        { label: "Audio cadence", value: "Opus packet every 20 ms" },
        { label: "Signaling server", value: "Sees zero media packets" },
        { label: "Blocked fallback", value: "TURN relay (encrypted); SFU groups" },
      ],
      events: [
        {
          type: "packet",
          id: "rtc-av-out",
          from: "laptop",
          to: "peer",
          via: ["router", "internet"],
          tone: "data",
          label: "SRTP AUDIO/VIDEO",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PEER_WAN_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 140 }),
            udpLayer({ sport: 61022, dport: 49170, length: UDP_HEADER + 140 }),
            rtcLayer("SRTP Media (Opus / VP8)", "Direct encrypted audio + video", [{ name: "Server bypass", value: "Bypasses call.example.com" }]),
          ],
          capture: {
            time: 0.2,
            src: ROUTER_WAN_IP,
            dst: PEER_WAN_IP,
            protocol: "SRTP",
            info: "SRTP Audio/Video payload (Opus 20ms / VP8)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 140),
          },
        },
        {
          type: "packet",
          id: "rtc-av-in",
          from: "peer",
          to: "laptop",
          via: ["internet", "router"],
          tone: "data",
          label: "SRTP VIDEO",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: PEER_WAN_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 980 }),
            udpLayer({ sport: 49170, dport: 61022, length: UDP_HEADER + 980 }),
            rtcLayer("SRTP Video Frame (VP8)", "Direct peer video packet", [{ name: "Adaptation", value: "RTCP adjusts bitrate" }]),
          ],
          capture: {
            time: 0.22,
            src: PEER_WAN_IP,
            dst: ROUTER_WAN_IP,
            protocol: "SRTP",
            info: "SRTP Video frame (VP8, encrypted)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 980),
          },
        },
        {
          type: "note",
          id: "note-p2p",
          at: "internet",
          text: "Direct path (TURN if blocked)",
          tone: "response",
        },
      ],
    },
  ],
  outro: {
    title: "Peer-to-peer media bypassing the server",
    simple:
      "The call server passed SDP offers, STUN found public NAT ports, ICE punched a direct UDP link, and DTLS established encrypted SRTP directly between browsers.",
    technical:
      "WebRTC setup combined WebSocket signaling, STUN/ICE NAT traversal, DTLS 1.3 (fallback 1.2) key agreement, and direct SRTP streaming.",
    facts: [
      { label: "Signaling", value: "Via call.example.com" },
      { label: "Media path", value: "Direct peer-to-peer through 2 NATs" },
      { label: "Encryption", value: "DTLS 1.3/1.2 -> SRTP" },
      { label: "Fallback", value: "TURN relay or group SFU" },
    ],
  },
  tryIt: [
    {
      title: "Inspect live browser WebRTC statistics",
      explain: "During any WebRTC call in Chrome or Edge, visit the internal diagnostics tab to see live ICE pairs, STUN/TURN candidates, and DTLS state.",
      commands: [
        { os: "windows", cmd: "start chrome://webrtc-internals" },
        { os: "macos", cmd: "open -a 'Google Chrome' chrome://webrtc-internals" },
        { os: "linux", cmd: "google-chrome chrome://webrtc-internals" },
      ],
    },
  ],
});
