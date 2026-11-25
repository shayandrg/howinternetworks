import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, tcpLayer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER, UDP_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, SERVER_MAC, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

const GW_IP = "192.0.2.52"; // RFC 5737 TEST-NET-1
const TUNNEL_IP = "10.8.0.2";

function ipsecLayer(name: string, summary: string, fields: Array<{ name: string; value: string }>) {
  return { name, summary, fields };
}

export const ipsecFlow = defineFlow({
  meta: {
    slug: "ipsec",
    kind: "flow",
    collection: "protocols",
    group: "security",
    title: "IPsec",
    fullName: "IPsec: IKEv2 Key Exchange and ESP Tunnel",
    tagline: "Encrypting IP packets with IKEv2 negotiation and ESP",
    layer: { tcpip: "internet", osi: 3 },
    prerequisites: ["ip"],
    related: ["wireguard", "ip", "tls", "https"],
    tags: ["ipsec", "ikev2", "esp", "vpn", "nat-t"],
    sources: [
      {
        label: "RFC 7296: Internet Key Exchange Protocol Version 2 (IKEv2)",
        url: "https://www.rfc-editor.org/rfc/rfc7296",
      },
      {
        label: "RFC 4303: IP Encapsulating Security Payload (ESP)",
        url: "https://www.rfc-editor.org/rfc/rfc4303",
      },
      {
        label: "RFC 3948: UDP Encapsulation of IPsec ESP Packets",
        url: "https://www.rfc-editor.org/rfc/rfc3948",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[ipsec|IPsec]] encrypts entire IP packets between laptops and corporate gateways or between offices. [[ikev2|IKEv2]] negotiates algorithms and certificates first, then [[esp|ESP]] carries encrypted traffic.",
    technical:
      "IKEv2 (RFC 7296) establishes Security Associations over UDP port 500 and shifts to UDP 4500 when NAT is detected (RFC 3948) so ESP (RFC 4303, IP protocol 50) passes home routers intact.",
  },
  facts: [
    { label: "Layer", value: "Internet (OSI Layer 3)" },
    { label: "Control plane", value: "IKEv2 on UDP 500 -> UDP 4500" },
    { label: "Data plane", value: "ESP (IP proto 50 or UDP 4500)" },
    { label: "Auth options", value: "Certificates, EAP, pre-shared key" },
    { label: "Defined in", value: "RFC 7296, RFC 4303, RFC 3948" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 100, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 290, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 480, y: 300 } },
      { id: "gw", kind: "vpn-server", label: "VPN gateway", sublabel: GW_IP, at: { x: 690, y: 300 } },
      { id: "web", kind: "web-server", label: WEB_DOMAIN, sublabel: WEB_SERVER_IP, at: { x: 900, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-inet", from: "router", to: "internet", medium: "fiber" },
      { id: "l-gw", from: "internet", to: "gw", medium: "internet" },
      { id: "l-web", from: "gw", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "ike-sa-init",
      title: "Negotiate keys with IKE_SA_INIT",
      simple:
        "Starting on UDP 500, the laptop offers cipher suites (`AES-GCM-256`, `Curve25519`), a key share, and nonce {{ipsec-init-c}}. The gateway picks a suite and replies {{ipsec-init-s}}.",
      technical:
        "RFC 7296 §1.2 `IKE_SA_INIT` establishes shared keying material (`SKEYSEED`) and detects NAT via `NAT_DETECTION_SOURCE_IP` hashes before peer authentication occurs.",
      facts: [
        { label: "Port", value: "UDP 500" },
        { label: "Negotiated", value: "AES-GCM-256 + Curve25519" },
        { label: "After step 1", value: "Shared keys, identities unverified" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "gw", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "gw", "web"] },
          ],
        },
        {
          type: "packet",
          id: "ipsec-init-c",
          from: "laptop",
          to: "gw",
          via: ["router", "internet"],
          tone: "handshake",
          label: "IKE_SA_INIT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: GW_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 312 }),
            udpLayer({ sport: 500, dport: 500, length: UDP_HEADER + 312 }),
            ipsecLayer("IKEv2 IKE_SA_INIT Request", "SA proposal + KEi + Nonce + NAT hashes", [
              { name: "Suites", value: "AES-GCM-256, PRF-HMAC-SHA256, Curve25519" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: GW_IP,
            protocol: "IKEv2",
            info: "IKE_SA_INIT Request (UDP 500)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 312),
          },
        },
        {
          type: "packet",
          id: "ipsec-init-s",
          from: "gw",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "IKE_SA_INIT",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: GW_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 296 }),
            udpLayer({ sport: 500, dport: 500, length: UDP_HEADER + 296 }),
            ipsecLayer("IKEv2 IKE_SA_INIT Response", "Selected proposal + KEr + NAT hashes", [
              { name: "NAT hash check", value: "Source IP changed -> NAT present" },
            ]),
          ],
          capture: {
            time: 0.02,
            src: GW_IP,
            dst: LAPTOP_IP,
            protocol: "IKEv2",
            info: "IKE_SA_INIT Response (NAT detected)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 296),
          },
        },
      ],
    },
    {
      id: "nat-detect",
      title: "Detect NAT and move to port 4500",
      simple:
        "Comparing the IP/port hashes reveals the home router rewrote `192.168.1.10` (NAT). Because raw ESP carries no TCP/UDP port numbers for NAT tables, both sides shift to UDP port 4500.",
      technical:
        "RFC 3948 NAT Traversal wraps IKE_AUTH and subsequent ESP traffic inside UDP port 4500 (non-ESP marker for IKE, nonzero SPI for ESP).",
      facts: [
        { label: "Detection", value: "Source IP hash mismatch at gateway" },
        { label: "Problem", value: "Bare ESP (proto 50) lacks ports" },
        { label: "Solution", value: "Encapsulate over UDP 4500" },
      ],
      events: [
        {
          type: "note",
          id: "ipsec-note-nat",
          at: "router",
          text: "NAT detected -> UDP 4500",
          tone: "lookup",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "ike-auth",
      title: "Prove identities in IKE_AUTH",
      simple:
        "Now encrypted on UDP 4500, `IKE_AUTH` swaps signed certificates proving both ends, assigns internal IP `10.8.0.2`, and installs inbound/outbound ESP Security Parameter Indexes (SPIs) {{ipsec-auth-c}} {{ipsec-auth-s}}.",
      technical:
        "RFC 7296 §1.2 `IKE_AUTH` signs the earlier `IKE_SA_INIT` bytes against MITM downgrade, negotiates Configuration Payload (`10.8.0.2` + DNS), and creates the Child SA pair.",
      facts: [
        { label: "Port", value: "UDP 4500 (NAT-T)" },
        { label: "Proof", value: "Certificate signature over init" },
        { label: "Assigned", value: `${TUNNEL_IP} + DNS + Child SA SPIs` },
      ],
      events: [
        {
          type: "packet",
          id: "ipsec-auth-c",
          from: "laptop",
          to: "gw",
          via: ["router", "internet"],
          tone: "secure",
          label: "IKE_AUTH (4500)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: GW_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 620 }),
            udpLayer({ sport: 4500, dport: 4500, length: UDP_HEADER + 620 }),
            ipsecLayer("IKEv2", "IKE_AUTH Request (encrypted)", [
              { name: "Payload", value: "Client cert, AUTH signature, CP Request" },
            ]),
          ],
          capture: {
            time: 0.03,
            src: LAPTOP_IP,
            dst: GW_IP,
            protocol: "IKEv2",
            info: "IKE_AUTH Request (UDP 4500, encrypted)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 620),
          },
        },
        {
          type: "packet",
          id: "ipsec-auth-s",
          from: "gw",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "IKE_AUTH (4500)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: GW_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 580 }),
            udpLayer({ sport: 4500, dport: 4500, length: UDP_HEADER + 580 }),
            ipsecLayer("IKEv2", "IKE_AUTH Response (encrypted)", [
              { name: "Assigned IP", value: TUNNEL_IP },
              { name: "Child SA", value: "ESP SPIs + keys installed" },
            ]),
          ],
          capture: {
            time: 0.05,
            src: GW_IP,
            dst: LAPTOP_IP,
            protocol: "IKEv2",
            info: `IKE_AUTH Response (assigned ${TUNNEL_IP}, ESP ready)`,
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 580),
          },
        },
      ],
    },
    {
      id: "esp-out",
      title: "Encrypt whole packet inside ESP",
      simple:
        "Outbound traffic from `10.8.0.2` is encrypted whole inside [[esp|ESP]] with SPI, sequence number, and auth tag over UDP 4500 {{ipsec-esp-out}}. ESP verifies integrity itself.",
      technical:
        "RFC 4303 ESP tunnel mode encrypts the entire original IPv4 packet (`62` bytes overhead + padding) indexed by a 32-bit `SPI` and 32-bit anti-replay counter.",
      facts: [
        { label: "SPI", value: "Names target inbound SA (0xc901a4b2)" },
        { label: "Encrypted", value: "Full inner IP header + payload" },
        { label: "Overhead", value: "~62 bytes + padding" },
      ],
      events: [
        {
          type: "packet",
          id: "ipsec-esp-out",
          from: "laptop",
          to: "gw",
          via: ["router", "internet"],
          tone: "secure",
          label: "ESP (UDP 4500)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: GW_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 86 }),
            udpLayer({ sport: 4500, dport: 4500, length: UDP_HEADER + 86 }),
            ipsecLayer("ESP (UDP 4500)", "SPI=0xc901a4b2, Seq=1", [
              { name: "Outer NAT-T", value: "UDP 4500 (checksum=0)" },
              { name: "Inner packet", value: `${TUNNEL_IP} -> ${WEB_SERVER_IP}:443 SYN` },
            ]),
          ],
          capture: {
            time: 0.06,
            src: LAPTOP_IP,
            dst: GW_IP,
            protocol: "ESP",
            info: "ESP (SPI=0xc901a4b2, Seq=1) over UDP 4500",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 86),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "gw-forward",
      title: "Relay via gateway and return ESP",
      simple:
        "The gateway decrypts the SYN and forwards it to the website from `192.0.2.52` {{ipsec-syn}}. Replies arrive back at the gateway {{ipsec-synack}} and return inside the laptop's directional ESP SPI {{ipsec-esp-in}}.",
      technical:
        "Each direction maintains a distinct SA (`SPI` + keys + anti-replay sequence window). Replayed or forged packets fail ICV authentication and are dropped.",
      facts: [
        { label: "Website sees", value: `${GW_IP} (VPN gateway)` },
        { label: "Return SA", value: "Distinct SPI + counter per direction" },
        { label: "Replay check", value: "Sliding bitmap rejects duplicates" },
      ],
      events: [
        {
          type: "packet",
          id: "ipsec-syn",
          from: "gw",
          to: "web",
          tone: "handshake",
          label: "SYN",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: GW_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 52, ttl: 127 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 9, dport: 443, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.062,
            src: GW_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: `${EPHEMERAL_PORT_START + 9} -> 443 [SYN] Seq=0`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "packet",
          id: "ipsec-synack",
          from: "web",
          to: "gw",
          tone: "response",
          label: "SYN-ACK",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: GW_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 443, dport: EPHEMERAL_PORT_START + 9, flags: "SYN, ACK", seq: 0, ack: 1, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.08,
            src: WEB_SERVER_IP,
            dst: GW_IP,
            protocol: "TCP",
            info: `443 -> ${EPHEMERAL_PORT_START + 9} [SYN, ACK] Seq=0 Ack=1`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "packet",
          id: "ipsec-esp-in",
          from: "gw",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "ESP RETURN",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: GW_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 86 }),
            udpLayer({ sport: 4500, dport: 4500, length: UDP_HEADER + 86 }),
            ipsecLayer("ESP (SPI=0x7712b801, Seq=1)", "Return packet encrypted via ESP", [
              { name: "Inner packet", value: `${WEB_SERVER_IP}:443 -> ${TUNNEL_IP}` },
            ]),
          ],
          capture: {
            time: 0.1,
            src: GW_IP,
            dst: LAPTOP_IP,
            protocol: "ESP",
            info: "ESP return (SPI=0x7712b801, Seq=1)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 86),
          },
        },
      ],
    },
    {
      id: "ipsec-vs-wg",
      title: "Compare IPsec and WireGuard",
      simple:
        "IPsec supports flexible algorithm negotiation, certificates, and EAP logins, making it native across enterprise OSes and site-to-site firewalls. [[wireguard|WireGuard]] trims that complexity to one fixed cipher suite.",
      technical:
        "Because IKEv2 + ESP ships built into Windows, macOS, iOS, Android, and hardware firewalls, organizations standardize on it for remote access and office-to-office tunnels.",
      facts: [
        { label: "Native OS support", value: "Windows, macOS, iOS, Android" },
        { label: "Site-to-site", value: "Connects office LANs directly" },
        { label: "Flexibility", value: "Negotiates ciphers & auth (EAP/certs)" },
      ],
      events: [
        {
          type: "note",
          id: "note-compare",
          at: "gw",
          text: "Built into OSes & enterprise routers",
          tone: "response",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "IKEv2 and ESP protected full IP packets",
    simple:
      "Four IKEv2 exchanges negotiated ciphers, spotted NAT to switch onto UDP port 4500, checked certificates, and launched directional ESP tunnels carrying encrypted IP packets.",
    technical:
      "IKE_SA_INIT (UDP 500), NAT-T shift (UDP 4500), authenticated IKE_AUTH, and bidirectional ESP Child SAs completed tunnel setup.",
    facts: [
      { label: "Setup messages", value: "4 IKEv2 packets (2 exchanges)" },
      { label: "NAT traversal", value: "UDP port 4500 (RFC 3948)" },
      { label: "Data tunnel", value: "Bidirectional ESP SPIs" },
      { label: "Assigned IP", value: TUNNEL_IP },
    ],
  },
  tryIt: [
    {
      title: "Check active IPsec Security Associations",
      explain: "On systems using strongSwan or native Windows IKEv2, print negotiated IKE/Child SAs.",
      commands: [
        { os: "windows", cmd: "netsh advfirewall monitor show mmsa" },
        { os: "macos", cmd: "scutil --nc list" },
        { os: "linux", cmd: "ip xfrm state" },
      ],
    },
  ],
});
