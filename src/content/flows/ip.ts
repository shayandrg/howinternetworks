import { defineFlow } from "../schema";
import { arpReply, arpRequest } from "../builders/arp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, TCP_BASE_HEADER, tcpFrameBytes } from "../builders/sizes";
import {
  EPHEMERAL_PORT_START,
  HOME_SUBNET,
  LAPTOP_IP,
  LAPTOP_MAC,
  ROUTER_LAN_IP,
  ROUTER_MAC,
  ROUTER_WAN_IP,
  WEB_SERVER_IP,
} from "../world";

const NAT_PORT = 40112;
const SYN_BYTES = tcpFrameBytes(12, 0).frameBytes;

export const ipFlow = defineFlow({
  meta: {
    slug: "ip",
    kind: "flow",
    collection: "protocols",
    group: "routing",
    title: "IP",
    fullName: "Internet Protocol",
    tagline: "Addressing devices and forwarding packets hop by hop",
    layer: { tcpip: "internet", osi: 3, note: "Covers IPv4, ARP and NAT" },
    prerequisites: [],
    related: ["ethernet", "dhcp", "icmp", "tcp", "ipv6"],
    tags: ["ip", "ipv4", "arp", "nat", "routing", "ttl"],
    sources: [
      {
        label: "RFC 791: Internet Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc791",
      },
      {
        label: "RFC 826: An Ethernet Address Resolution Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc826",
      },
      {
        label: "RFC 3022: Traditional IP Network Address Translator (NAT)",
        url: "https://www.rfc-editor.org/rfc/rfc3022",
      },
      {
        label: "RFC 8200: Internet Protocol, Version 6 (IPv6)",
        url: "https://www.rfc-editor.org/rfc/rfc8200",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[ip|IP]] gives devices addresses and guides packets from network to network. Each router checks the destination address and forwards the packet one hop closer.",
    technical:
      "Internet Protocol version 4 (RFC 791) provides best-effort packet delivery using 32-bit addresses and a [[ttl|TTL]] hop limit. Local delivery relies on [[arp|ARP]] (RFC 826) to learn hardware [[mac-address|MAC addresses]], while home routers apply [[nat|NAT]] (RFC 3022) at the boundary.",
  },
  facts: [
    { label: "Layer", value: "Internet (OSI Layer 3)" },
    { label: "Address size", value: "32 bits (IPv4), 128 bits (IPv6)" },
    { label: "Header size", value: "20 to 60 bytes (IPv4)" },
    { label: "Hop limit", value: "TTL decremented by 1 per router" },
    { label: "Defined in", value: "RFC 791, RFC 8200" },
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
      id: "check-subnet",
      title: "Check if local or remote",
      simple:
        "Your laptop compares `203.0.113.10` with its home [[subnet]] `192.168.1.0/24`. The server is outside the home network, so the packet must go to the [[default-gateway]].",
      technical:
        `Using its /24 subnet mask, \`${LAPTOP_IP}\` sees \`${WEB_SERVER_IP}\` is off-link and selects the default gateway \`${ROUTER_LAN_IP}\` as its next hop.`,
      facts: [
        { label: "Local subnet", value: HOME_SUBNET },
        { label: "Destination", value: `${WEB_SERVER_IP} (remote)` },
        { label: "Next hop", value: ROUTER_LAN_IP },
      ],
      events: [
        {
          type: "note",
          id: "note-offlink",
          at: "laptop",
          text: "Outside 192.168.1.0/24",
          tone: "request",
        },
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router"] },
            { type: "focus", actors: ["laptop", "router"] },
          ],
        },
      ],
    },
    {
      id: "arp-gateway",
      title: "Resolve gateway MAC with ARP",
      simple:
        "Local frames travel by hardware [[mac-address]]. Your laptop broadcasts an [[arp|ARP]] question {{ip-arp-req}} and the router answers with its MAC {{ip-arp-rep}}.",
      technical:
        `With no cached link-layer entry for \`${ROUTER_LAN_IP}\`, the laptop broadcasts an ARP request {{ip-arp-req}} to \`ff:ff:ff:ff:ff:ff\`. The router replies with \`${ROUTER_MAC}\` {{ip-arp-rep}} (RFC 826).`,
      facts: [
        { label: "Target IP", value: ROUTER_LAN_IP },
        { label: "ARP target", value: "Broadcast (ff:ff:ff:ff:ff:ff)" },
        { label: "Router MAC", value: ROUTER_MAC },
      ],
      events: [
        arpRequest({
          id: "ip-arp-req",
          from: "laptop",
          to: "router",
          senderMac: LAPTOP_MAC,
          senderIp: LAPTOP_IP,
          targetIp: ROUTER_LAN_IP,
          time: 0.0,
        }),
        arpReply({
          id: "ip-arp-rep",
          from: "router",
          to: "laptop",
          senderMac: ROUTER_MAC,
          senderIp: ROUTER_LAN_IP,
          targetMac: LAPTOP_MAC,
          targetIp: LAPTOP_IP,
          time: 0.001,
        }),
        {
          type: "badge",
          at: "laptop",
          text: "Router MAC cached",
          tone: "response",
        },
      ],
    },
    {
      id: "send-ip-packet",
      title: "Send the IP packet to router",
      simple:
        "Your laptop sends the IP packet {{ip-out-lan}} wrapped inside a frame addressed to the router's MAC, with a hop limit ([[ttl|TTL]]) of 128.",
      technical:
        `The IPv4 packet carries source \`${LAPTOP_IP}\`, destination \`${WEB_SERVER_IP}\`, Protocol 6 (TCP), and TTL 128 {{ip-out-lan}}. Ethernet headers change at every hop while IP addresses cross end to end (except across NAT).`,
      facts: [
        { label: "Source -> Dest", value: `${LAPTOP_IP} -> ${WEB_SERVER_IP}` },
        { label: "Initial TTL", value: "128 (Windows default; 64 Linux/macOS)" },
        { label: "Protocol field", value: "6 (TCP)" },
      ],
      events: [
        {
          type: "packet",
          id: "ip-out-lan",
          from: "laptop",
          to: "router",
          tone: "request",
          label: "IP (TTL 128)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({
              src: LAPTOP_IP,
              dst: WEB_SERVER_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + 12,
              ttl: 128,
            }),
            tcpLayer({
              sport: EPHEMERAL_PORT_START,
              dport: 443,
              flags: "SYN",
              seq: 0,
              optionsBytes: 12,
              optionsNote: "MSS=1460, NOP, WS=7, NOP, NOP, SACK Permitted",
            }),
          ],
          capture: {
            time: 0.002,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: `TTL=128 ${EPHEMERAL_PORT_START} -> 443 [SYN]`,
            bytes: SYN_BYTES,
          },
        },
        { type: "wait", ms: 700 },
      ],
    },
    {
      id: "nat-and-forward",
      title: "Translate with NAT and forward",
      simple:
        "Your router swaps your private IP for its public IP `198.51.100.7`, lowers the [[ttl|TTL]] by one, and sends it across internet routers {{ip-out-wan}}.",
      technical:
        `Applying [[nat|NAT]] (RFC 3022), the router rewrites \`${LAPTOP_IP}:${EPHEMERAL_PORT_START}\` to \`${ROUTER_WAN_IP}:${NAT_PORT}\`, lowers TTL to 127, and forwards it {{ip-out-wan}}. Eleven internet routers decrement TTL down to 116.`,
      facts: [
        { label: "NAT source", value: `${ROUTER_WAN_IP}:${NAT_PORT}` },
        { label: "Router exit TTL", value: "127" },
        { label: "Server arrival TTL", value: "116 (after 11 more hops)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["internet", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "web"] },
          ],
        },
        {
          type: "packet",
          id: "ip-out-wan",
          from: "router",
          to: "web",
          tone: "request",
          label: "IP (NAT + TTL 127)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: "00:00:5e:00:53:09" }),
            ipv4Layer({
              src: ROUTER_WAN_IP,
              dst: WEB_SERVER_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + 12,
              ttl: 127,
            }),
            tcpLayer({
              sport: NAT_PORT,
              dport: 443,
              flags: "SYN",
              seq: 0,
              optionsBytes: 12,
              optionsNote: "MSS=1460, NOP, WS=7, NOP, NOP, SACK Permitted",
            }),
          ],
          capture: {
            time: 0.003,
            src: ROUTER_WAN_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: `${NAT_PORT} -> 443 [SYN] Seq=0 (NAT applied, TTL 127)`,
            bytes: SYN_BYTES,
          },
        },
        {
          type: "note",
          id: "note-ttl-116",
          at: "web",
          text: "Arrived with TTL 116",
          tone: "response",
        },
      ],
    },
    {
      id: "return-via-nat",
      title: "Return and reverse NAT",
      simple:
        "The server replies to your router's public address {{ip-in-wan}}. Your router checks its [[nat|NAT]] table and forwards the reply back to your laptop {{ip-in-lan}}.",
      technical:
        `The server sends SYN-ACK to \`${ROUTER_WAN_IP}:${NAT_PORT}\` with TTL 64 {{ip-in-wan}}. After 11 internet routers and the home router's reverse NAT lookup, \`${LAPTOP_IP}:${EPHEMERAL_PORT_START}\` receives it at TTL 52 {{ip-in-lan}}.`,
      facts: [
        { label: "Reply target", value: `${ROUTER_WAN_IP}:${NAT_PORT}` },
        { label: "Restored target", value: `${LAPTOP_IP}:${EPHEMERAL_PORT_START}` },
        { label: "Reply TTL", value: "64 -> 52 (12 routers)" },
      ],
      events: [
        {
          type: "packet",
          id: "ip-in-wan",
          from: "web",
          to: "router",
          tone: "response",
          label: "Reply (TTL 64)",
          layers: [
            ethernetLayer({ srcMac: "00:00:5e:00:53:09", dstMac: ROUTER_MAC }),
            ipv4Layer({
              src: WEB_SERVER_IP,
              dst: ROUTER_WAN_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + 12,
              ttl: 64,
            }),
            tcpLayer({
              sport: 443,
              dport: NAT_PORT,
              flags: "SYN, ACK",
              seq: 0,
              ack: 1,
              optionsBytes: 12,
              optionsNote: "MSS=1460, NOP, WS=7, NOP, NOP, SACK Permitted",
            }),
          ],
          capture: {
            time: 0.019,
            src: WEB_SERVER_IP,
            dst: ROUTER_WAN_IP,
            protocol: "TCP",
            info: `TTL=64 443 -> ${NAT_PORT} [SYN, ACK]`,
            bytes: SYN_BYTES,
          },
        },
        {
          type: "packet",
          id: "ip-in-lan",
          from: "router",
          to: "laptop",
          tone: "response",
          label: "Reply (TTL 52)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({
              src: WEB_SERVER_IP,
              dst: LAPTOP_IP,
              protocol: "TCP (6)",
              totalLength: IPV4_HEADER + TCP_BASE_HEADER + 12,
              ttl: 52,
            }),
            tcpLayer({
              sport: 443,
              dport: EPHEMERAL_PORT_START,
              flags: "SYN, ACK",
              seq: 0,
              ack: 1,
              optionsBytes: 12,
              optionsNote: "MSS=1460, NOP, WS=7, NOP, NOP, SACK Permitted",
            }),
          ],
          capture: {
            time: 0.035,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "TCP",
            info: `443 -> ${EPHEMERAL_PORT_START} [SYN, ACK] restored via NAT (TTL 52)`,
            bytes: SYN_BYTES,
          },
        },
      ],
    },
  ],
  outro: {
    title: "Delivered across 12 routers",
    simple:
      "ARP found the home router on the local network, NAT swapped in a public address, and twelve routers forwarded the packet and reply by destination address alone.",
    technical:
      "IPv4 routing moved the packet across 12 router hops in each direction while NAT translated between `192.168.1.10:52344` and `198.51.100.7:40112`.",
    facts: [
      { label: "Hops each way", value: "12 routers (1 home + 11)" },
      { label: "Outbound TTL", value: "128 -> 116" },
      { label: "Return TTL", value: "64 -> 52" },
      { label: "NAT rewrite", value: "Source out, destination back" },
    ],
  },
  tryIt: [
    {
      title: "Check your IP address and ARP table",
      explain:
        "Inspect your device's local IP address, subnet mask, default gateway, and cached neighbor MAC addresses.",
      commands: [
        { os: "windows", cmd: "ipconfig /all && arp -a" },
        { os: "macos", cmd: "ifconfig && arp -a" },
        { os: "linux", cmd: "ip addr && ip neigh" },
      ],
    },
    {
      title: "Inspect your routing table",
      explain:
        "See the default route (`0.0.0.0/0`) that sends off-subnet traffic to your gateway.",
      commands: [
        { os: "windows", cmd: "route print" },
        { os: "macos", cmd: "netstat -rn" },
        { os: "linux", cmd: "ip route" },
      ],
    },
  ],
});
