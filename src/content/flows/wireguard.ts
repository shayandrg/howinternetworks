import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, tcpLayer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER, UDP_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, SERVER_MAC, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

const WG_SERVER_IP = "192.0.2.51"; // RFC 5737 TEST-NET-1
const WG_PORT = 51820;
const TUNNEL_CLIENT_IP = "10.8.0.2";

function wgLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "WireGuard", summary, fields };
}

export const wireguardFlow = defineFlow({
  meta: {
    slug: "wireguard",
    kind: "flow",
    collection: "protocols",
    group: "security",
    title: "WireGuard",
    fullName: "WireGuard Encrypted VPN Tunnel",
    tagline: "Lightweight UDP VPN with single-RTT public-key handshakes",
    layer: { tcpip: "internet", osi: 3, note: "Carries Layer 3 IP inside UDP datagrams" },
    prerequisites: ["udp", "ip"],
    related: ["ipsec", "udp", "https", "socks5"],
    tags: ["wireguard", "vpn", "tunnel", "noise", "chacha20"],
    sources: [
      {
        label: "WireGuard Whitepaper (Noise_IKpsk2 Protocol)",
        url: "https://www.wireguard.com/papers/wireguard.pdf",
      },
      {
        label: "WireGuard Quickstart & Configuration Semantics",
        url: "https://www.wireguard.com/quickstart/",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "A [[vpn|VPN]] wraps all internet packets inside an encrypted tunnel to a gateway, shielding cafe Wi-Fi traffic and hiding your home IP. [[wireguard|WireGuard]] runs over UDP using one compact cryptographic suite and two handshake messages.",
    technical:
      "Built on Noise_IKpsk2 (Curve25519, ChaCha20-Poly1305, BLAKE2s), WireGuard authenticates peers solely via static public keys, uses UDP port `51820` by convention (`wg(8)` chooses random if omitted), and supports roaming.",
  },
  facts: [
    { label: "Layer", value: "Internet tunnel over UDP" },
    { label: "UDP port", value: "51820 by convention (configurable)" },
    { label: "Handshake", value: "2 messages, 1 round trip" },
    { label: "Cipher suite", value: "Curve25519 + ChaCha20-Poly1305" },
    { label: "Defined in", value: "WireGuard Whitepaper" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 100, y: 300 } },
      { id: "router", kind: "router", label: "Cafe router", sublabel: ROUTER_LAN_IP, at: { x: 290, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 480, y: 300 } },
      { id: "vpn", kind: "vpn-server", label: "VPN server", sublabel: WG_SERVER_IP, at: { x: 690, y: 300 } },
      { id: "web", kind: "web-server", label: WEB_DOMAIN, sublabel: WEB_SERVER_IP, at: { x: 900, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-inet", from: "router", to: "internet", medium: "fiber" },
      { id: "l-vpn", from: "internet", to: "vpn", medium: "internet" },
      { id: "l-web", from: "vpn", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop", "vpn"],
      focus: ["laptop", "vpn"],
    },
  },
  steps: [
    {
      id: "config",
      title: "Set static keys and AllowedIPs",
      simple:
        "Configuration uses static key pairs instead of passwords: your client holds its local secret, the peer's public key on `192.0.2.51` (conventionally port `51820`), and `AllowedIPs = 0.0.0.0/0` routing via `10.8.0.2`.",
      technical:
        "Cryptokey routing binds each peer public key to allowed tunnel IPs (`10.8.0.2/32` locally, `0.0.0.0/0` remote). Port `51820` is common convention; omitting `ListenPort` picks an ephemeral UDP port.",
      facts: [
        { label: "VPN gateway", value: `${WG_SERVER_IP}:${WG_PORT} (convention)` },
        { label: "Inner IP", value: TUNNEL_CLIENT_IP },
        { label: "AllowedIPs", value: "0.0.0.0/0 (all traffic)" },
      ],
      events: [
        {
          type: "note",
          id: "note-tun-ip",
          at: "laptop",
          text: `Tunnel IP ${TUNNEL_CLIENT_IP}`,
          tone: "lookup",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "handshake",
      title: "Run 1-RTT Noise key handshake",
      simple:
        "When traffic starts, the laptop sends a 148 B Initiation holding an ephemeral key, encrypted identity, and timestamp {{wg-init}}. Known peers answer with a 92 B Response {{wg-resp}}.",
      technical:
        "WireGuard's Noise_IKpsk2 handshake resists probing (silent drop on invalid MAC1) and replay (encrypted timestamp); two messages yield symmetric session keys.",
      facts: [
        { label: "Initiation", value: "148 bytes (identity encrypted)" },
        { label: "Response", value: "92 bytes (only to known peers)" },
        { label: "Handshake RTT", value: "1 round trip" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "vpn", "web"] },
          ],
        },
        {
          type: "packet",
          id: "wg-init",
          from: "laptop",
          to: "vpn",
          via: ["router", "internet"],
          tone: "secure",
          label: "INITIATION (148 B)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WG_SERVER_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 148 }),
            udpLayer({ sport: 51820, dport: WG_PORT, length: UDP_HEADER + 148 }),
            wgLayer("Type 1 Handshake Initiation (148 B)", [
              { name: "Contains", value: "Ephemeral Curve25519 + encrypted identity + timestamp" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: WG_SERVER_IP,
            protocol: "WireGuard",
            info: "Handshake Initiation (148 bytes)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 148),
          },
        },
        {
          type: "packet",
          id: "wg-resp",
          from: "vpn",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "RESPONSE (92 B)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WG_SERVER_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 92 }),
            udpLayer({ sport: WG_PORT, dport: 51820, length: UDP_HEADER + 92 }),
            wgLayer("Type 2 Handshake Response (92 B)", [{ name: "Outcome", value: "Session cipher keys active" }]),
          ],
          capture: {
            time: 0.02,
            src: WG_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "WireGuard",
            info: "Handshake Response (92 bytes)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 92),
          },
        },
      ],
    },
    {
      id: "encapsulate",
      title: "Seal whole IP packet in UDP",
      simple:
        "Every outbound IP packet from `10.8.0.2` toward `www.example.com:443` gets encrypted end-to-end inside a Type 4 WireGuard UDP datagram {{wg-data-out}}. Local Wi-Fi sees only UDP packets to the VPN server.",
      technical:
        "Type 4 Transport Data encapsulates the entire inner IP packet with 60 bytes of outer/WireGuard overhead (IP + UDP + 16 B WG header + 16 B Poly1305 tag = 60 B + 16-byte padding).",
      facts: [
        { label: "Inner packet", value: `${TUNNEL_CLIENT_IP} -> ${WEB_SERVER_IP}:443` },
        { label: "Outer header", value: `UDP ${WG_SERVER_IP}:${WG_PORT}` },
        { label: "Tunnel overhead", value: "60 bytes + padding (MSS 1380)" },
      ],
      events: [
        {
          type: "packet",
          id: "wg-data-out",
          from: "laptop",
          to: "vpn",
          via: ["router", "internet"],
          tone: "secure",
          label: "WG DATA (SYN)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WG_SERVER_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 84 }),
            udpLayer({ sport: 51820, dport: WG_PORT, length: UDP_HEADER + 84 }),
            wgLayer("Type 4 Transport Data (encrypted IP packet)", [
              { name: "Receiver", value: "0x4c10a2f8, Counter=0" },
              { name: "Hidden payload", value: `Inner ${TUNNEL_CLIENT_IP} -> ${WEB_SERVER_IP}:443 SYN` },
            ]),
          ],
          capture: {
            time: 0.03,
            src: LAPTOP_IP,
            dst: WG_SERVER_IP,
            protocol: "WireGuard",
            info: "Transport Data, receiver=0x4c10a2f8, counter=0 (inner SYN)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 84),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "egress",
      title: "Decrypt and send onto the web",
      simple:
        "The VPN server decrypts the inner SYN, swaps `10.8.0.2` for its own public IP (`192.0.2.51`, TTL lowered to 127), and forwards it to the website {{wg-syn}}. Websites see only the VPN server IP {{wg-synack}}.",
      technical:
        "Interface MTU (typically 1420-1440) clamps TCP MSS to `1380` so outer UDP avoids IP fragmentation. Web logs record `192.0.2.51`.",
      facts: [
        { label: "Website sees", value: `${WG_SERVER_IP} (VPN IP)` },
        { label: "Inner MSS", value: "1380 bytes (avoids frag)" },
        { label: "Hop count", value: "TTL decremented by VPN server" },
      ],
      events: [
        {
          type: "packet",
          id: "wg-syn",
          from: "vpn",
          to: "web",
          tone: "handshake",
          label: "SYN (NAT TO WEB)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: WG_SERVER_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 52, ttl: 127 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 8, dport: 443, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12, optionsNote: "MSS=1380" }),
          ],
          capture: {
            time: 0.032,
            src: WG_SERVER_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: `${EPHEMERAL_PORT_START + 8} -> 443 [SYN] Seq=0 MSS=1380`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "packet",
          id: "wg-synack",
          from: "web",
          to: "vpn",
          tone: "response",
          label: "SYN-ACK",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: WG_SERVER_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 443, dport: EPHEMERAL_PORT_START + 8, flags: "SYN, ACK", seq: 0, ack: 1, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.048,
            src: WEB_SERVER_IP,
            dst: WG_SERVER_IP,
            protocol: "TCP",
            info: `443 -> ${EPHEMERAL_PORT_START + 8} [SYN, ACK] Seq=0 Ack=1`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
      ],
    },
    {
      id: "return-path",
      title: "Seal return reply back to laptop",
      simple:
        "The VPN reverses NAT (`-> 10.8.0.2`), seals the `SYN-ACK` in a WireGuard packet, and returns it over UDP {{wg-data-in}}. A sliding-window counter throws away any replayed copies.",
      technical:
        "Separate transmit/receive counters and AEAD authentication stop packet replay or modification; the laptop kernel receives the decrypted packet directly on its `wg0` interface.",
      facts: [
        { label: "Decrypted dest", value: `${WEB_SERVER_IP} -> ${TUNNEL_CLIENT_IP}` },
        { label: "Replay guard", value: "Per-direction counter window" },
        { label: "Auth tag", value: "16-byte Poly1305 AEAD" },
      ],
      events: [
        {
          type: "packet",
          id: "wg-data-in",
          from: "vpn",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "WG DATA (SYN-ACK)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WG_SERVER_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 84 }),
            udpLayer({ sport: WG_PORT, dport: 51820, length: UDP_HEADER + 84 }),
            wgLayer("Type 4 Transport Data (encrypted SYN-ACK)", [{ name: "Counter", value: "0 (replay-checked)" }]),
          ],
          capture: {
            time: 0.068,
            src: WG_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "WireGuard",
            info: "Transport Data, counter=0 (inner SYN-ACK)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 84),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "keepalive-roam",
      title: "Keep NAT open and roam freely",
      simple:
        "Behind NAT, empty 32-byte keepalive packets every 25 s hold the router mapping open {{wg-ka}}. Fresh keys rotate every two minutes, and if your IP switches networks, the server updates its endpoint automatically.",
      technical:
        "Zero-length Type 4 packets act as `PersistentKeepalive`. Authenticated roaming binds each incoming packet to its cryptokey peer regardless of source IP/port changes.",
      facts: [
        { label: "Keepalive", value: "32 B every 25 s (behind NAT)" },
        { label: "Key rotation", value: "Re-handshake every ~120 s" },
        { label: "Roaming", value: "Tracks newest verified peer IP:port" },
      ],
      events: [
        {
          type: "packet",
          id: "wg-ka",
          from: "laptop",
          to: "vpn",
          via: ["router", "internet"],
          tone: "control",
          label: "KEEPALIVE (32 B)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WG_SERVER_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 32 }),
            udpLayer({ sport: 51820, dport: WG_PORT, length: UDP_HEADER + 32 }),
            wgLayer("Type 4 Transport Data (0 B inner keepalive)", [{ name: "Timer", value: "PersistentKeepalive = 25" }]),
          ],
          capture: {
            time: 25.0,
            src: LAPTOP_IP,
            dst: WG_SERVER_IP,
            protocol: "WireGuard",
            info: "Keepalive (Type 4 empty encrypted payload, 32 B)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 32),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
  ],
  outro: {
    title: "All IP packets tunneled via UDP",
    simple:
      "Two handshake messages created session keys, wrapping every packet inside UDP to the VPN gateway. Beyond the VPN server traffic runs normally onto the internet, so HTTPS still protects end-to-end.",
    technical:
      "Noise_IKpsk2 key exchange, Type 4 ChaCha20-Poly1305 IP encapsulation, MSS clamping, 25 s NAT keepalives, and automatic endpoint roaming.",
    facts: [
      { label: "Local sniffers see", value: `Encrypted UDP -> ${WG_SERVER_IP}` },
      { label: "Websites see", value: "The VPN server address" },
      { label: "Beyond VPN exit", value: "Relies on TLS / HTTPS" },
      { label: "Overhead", value: "60 B + 16 B block padding" },
    ],
  },
  tryIt: [
    {
      title: "Inspect WireGuard tunnel status",
      explain: "View active peer endpoints, latest handshake timestamps, and AllowedIPs on a WireGuard host.",
      commands: [
        { os: "windows", cmd: "wg show" },
        { os: "macos", cmd: "sudo wg show" },
        { os: "linux", cmd: "sudo wg show" },
      ],
    },
  ],
});
