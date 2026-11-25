import { defineFlow } from "../schema";
import { arpReply, arpRequest } from "../builders/arp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import {
  LAPTOP_IP,
  LAPTOP_MAC,
  ROUTER_LAN_IP,
  ROUTER_MAC,
  ROUTER_WAN_IP,
  SERVER_MAC,
  SWITCH_MAC,
  WEB_SERVER_IP,
} from "../world";

const NAS_IP = "192.168.1.20";
const NAS_MAC = "00:00:5e:00:53:20";
const ISP_ROUTER_MAC = "00:00:5e:00:53:30";

export const ethernetFlow = defineFlow({
  meta: {
    slug: "ethernet",
    kind: "flow",
    collection: "protocols",
    group: "joining",
    title: "Ethernet",
    fullName: "Ethernet Frames and Switching",
    tagline: "MAC addresses, switch learning, and single-link frames",
    layer: { tcpip: "link", osi: 2 },
    prerequisites: [],
    related: ["wifi", "ip", "smb", "dhcp"],
    tags: ["ethernet", "mac", "switch", "arp", "802.3"],
    sources: [
      {
        label: "IEEE 802.3: Ethernet Standard",
        url: "https://standards.ieee.org/ieee/802.3/10422/",
      },
      {
        label: "IEEE 802.1Q: Bridges and Bridged Networks",
        url: "https://standards.ieee.org/ieee/802.1Q/10323/",
      },
      {
        label: "RFC 826: Ethernet Address Resolution Protocol (ARP)",
        url: "https://www.rfc-editor.org/rfc/rfc826",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[ethernet|Ethernet]] moves frames between wired devices using 48-bit [[mac-address|MAC addresses]]. A switch watches source addresses on incoming ports so frames travel only where needed, while MACs only apply on one local link.",
    technical:
      "IEEE 802.3 wraps each network packet in a 14-byte header and 4-byte FCS (64-1,518 bytes standard). IEEE 802.1Q bridges learn source MAC-to-port mappings and forward frames unchanged across one LAN; routers re-encapsulate packets per hop.",
  },
  facts: [
    { label: "Layer", value: "Link (IEEE 802.3 / OSI Layer 2)" },
    { label: "Address", value: "48-bit MAC (single LAN scope)" },
    { label: "Header / FCS", value: "14 B header + 4 B FCS" },
    { label: "Standard frame", value: "64 to 1,518 bytes (up to 800 Gb/s)" },
    { label: "Defined in", value: "IEEE 802.3, IEEE 802.1Q" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_MAC, at: { x: 110, y: 200 } },
      { id: "switch", kind: "switch", label: "LAN switch", sublabel: SWITCH_MAC, at: { x: 370, y: 300 } },
      { id: "nas", kind: "file-server", label: "Home NAS", sublabel: NAS_IP, at: { x: 370, y: 110 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 650, y: 300 } },
      { id: "isp", kind: "cloud", label: "ISP gateway", sublabel: ISP_ROUTER_MAC, at: { x: 890, y: 300 } },
    ],
    links: [
      { id: "l-p1", from: "laptop", to: "switch", medium: "ethernet" },
      { id: "l-p2", from: "switch", to: "nas", medium: "ethernet" },
      { id: "l-p8", from: "switch", to: "router", medium: "ethernet" },
      { id: "l-wan", from: "router", to: "isp", medium: "fiber" },
    ],
    start: {
      visible: ["laptop", "switch", "nas", "router"],
      focus: ["laptop", "switch", "nas", "router"],
    },
  },
  steps: [
    {
      id: "arp-broadcast",
      title: "Broadcast ARP for a local MAC",
      simple:
        "Your laptop wants the NAS at `192.168.1.20` but lacks its [[mac-address]]. It sends an [[arp|ARP]] request to `ff:ff:ff:ff:ff:ff` into switch port 1 {{eth-arp-in}}.",
      technical:
        `On the local Ethernet segment, delivery requires hardware addresses. The laptop emits an IEEE 802.3 broadcast frame carrying an RFC 826 ARP query for \`${NAS_IP}\` on switch port 1.`,
      facts: [
        { label: "Target IP", value: NAS_IP },
        { label: "Destination MAC", value: "ff:ff:ff:ff:ff:ff (broadcast)" },
        { label: "Ingress port", value: "Switch port 1" },
      ],
      events: [
        arpRequest({
          id: "eth-arp-in",
          from: "laptop",
          to: "switch",
          senderMac: LAPTOP_MAC,
          senderIp: LAPTOP_IP,
          targetIp: NAS_IP,
          time: 0.0,
        }),
        { type: "wait", ms: 800 },
      ],
    },
    {
      id: "learn-and-flood",
      title: "Switch learns port 1 and floods",
      simple:
        "Seeing the source MAC, the switch saves `...53:01 -> port 1` in its table. Because the destination is [[broadcast]], it copies the frame out ports 2 and 8 {{eth-arp-nas}} {{eth-arp-rtr}}.",
      technical:
        "IEEE 802.1Q bridges learn source MACs into their forwarding database (aging typically 300 s) without rewriting the frame, flooding broadcasts and unknown unicasts to all other ports.",
      facts: [
        { label: "Learned entry", value: `${LAPTOP_MAC} -> port 1` },
        { label: "Flooded to", value: "Port 2 (NAS) & port 8 (router)" },
        { label: "Unknown unicast", value: "Also flooded across other ports" },
      ],
      events: [
        {
          type: "note",
          id: "note-learn1",
          at: "switch",
          text: "Learned ...53:01 on port 1",
          tone: "lookup",
        },
        {
          type: "together",
          events: [
            arpRequest({
              id: "eth-arp-nas",
              from: "switch",
              to: "nas",
              senderMac: LAPTOP_MAC,
              senderIp: LAPTOP_IP,
              targetIp: NAS_IP,
              time: 0.001,
            }),
            arpRequest({
              id: "eth-arp-rtr",
              from: "switch",
              to: "router",
              senderMac: LAPTOP_MAC,
              senderIp: LAPTOP_IP,
              targetIp: NAS_IP,
              time: 0.001,
            }),
          ],
        },
      ],
    },
    {
      id: "unicast-reply",
      title: "Only the NAS replies to port 1",
      simple:
        "The router ignores the request. The NAS replies directly to the laptop's MAC on port 2 {{eth-rep-in}}. The switch learns port 2 and forwards the reply solely out port 1 {{eth-rep-out}}.",
      technical:
        `The NAS emits a unicast ARP reply (\`${NAS_MAC}\` -> \`${LAPTOP_MAC}\`). The switch records \`...53:20 -> port 2\` and performs a table lookup to deliver only via port 1.`,
      facts: [
        { label: "Learned entry", value: `${NAS_MAC} -> port 2` },
        { label: "Forwarding", value: "Unicast out port 1 only" },
        { label: "Router traffic", value: "None (not involved)" },
      ],
      events: [
        arpReply({
          id: "eth-rep-in",
          from: "nas",
          to: "switch",
          senderMac: NAS_MAC,
          senderIp: NAS_IP,
          targetMac: LAPTOP_MAC,
          targetIp: LAPTOP_IP,
          time: 0.002,
        }),
        {
          type: "note",
          id: "note-learn2",
          at: "switch",
          text: "Learned ...53:20 on port 2",
          tone: "response",
        },
        arpReply({
          id: "eth-rep-out",
          from: "switch",
          to: "laptop",
          senderMac: NAS_MAC,
          senderIp: NAS_IP,
          targetMac: LAPTOP_MAC,
          targetIp: LAPTOP_IP,
          time: 0.003,
        }),
      ],
    },
    {
      id: "port-to-port",
      title: "Switch sends frames port to port",
      simple:
        "Connecting to SMB port 445 on the NAS sends frames carrying EtherType `0x0800` (IPv4) plus a 4-byte FCS check {{eth-nas-syn}}. The switch links port 1 and port 2 without bothering the router {{eth-nas-synack}}.",
      technical:
        "With both MACs cached, frames cross unchanged between port 1 and port 2 at wire speed; the switch verifies the 4-byte CRC-32 FCS and isolates traffic from port 8.",
      facts: [
        { label: "EtherType", value: "0x0800 (IPv4 payload)" },
        { label: "Trailer", value: "4-byte FCS checksum" },
        { label: "Router sees", value: "Zero frames" },
      ],
      events: [
        {
          type: "packet",
          id: "eth-nas-syn",
          from: "laptop",
          to: "nas",
          via: ["switch"],
          tone: "handshake",
          label: "SYN (PORT 1->2)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: NAS_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: NAS_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 50532, dport: 445, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.01,
            src: LAPTOP_IP,
            dst: NAS_IP,
            protocol: "TCP",
            info: "Port 1 -> Port 2: 50532 -> 445 [SYN] (frame unchanged)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "packet",
          id: "eth-nas-synack",
          from: "nas",
          to: "laptop",
          via: ["switch"],
          tone: "response",
          label: "SYN-ACK (2->1)",
          layers: [
            ethernetLayer({ srcMac: NAS_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: NAS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 445, dport: 50532, flags: "SYN, ACK", seq: 0, ack: 1, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.012,
            src: NAS_IP,
            dst: LAPTOP_IP,
            protocol: "TCP",
            info: "Port 2 -> Port 1: 445 -> 50532 [SYN, ACK]",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
      ],
    },
    {
      id: "to-router",
      title: "Send off-subnet frames to router",
      simple:
        "Now the laptop opens `203.0.113.10` outside its subnet. The IP header holds `203.0.113.10`, while the Ethernet header names the router's MAC so the switch sends it out port 8 {{eth-rtr-syn}}.",
      technical:
        "For off-link IPv4 destinations, the laptop sets the Ethernet destination MAC to the default gateway (`00:00:5e:00:53:02`) while leaving the inner IP destination (`203.0.113.10`) untouched.",
      facts: [
        { label: "Ethernet dst", value: `${ROUTER_MAC} (gateway)` },
        { label: "Inner IP dst", value: WEB_SERVER_IP },
        { label: "Switch port out", value: "Port 8" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["isp"] },
            { type: "focus", actors: ["laptop", "switch", "router", "isp"] },
          ],
        },
        {
          type: "packet",
          id: "eth-rtr-syn",
          from: "laptop",
          to: "router",
          via: ["switch"],
          tone: "handshake",
          label: "TO GATEWAY MAC",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 52344, dport: 443, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.02,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: "Port 1 -> Port 8: dst MAC = router, inner IP = 203.0.113.10",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        { type: "wait", ms: 800 },
      ],
    },
    {
      id: "new-frame",
      title: "Routers build new link frames",
      simple:
        "Your router strips the home Ethernet header, decrements TTL, applies NAT, and places the packet into a brand-new frame addressed to the ISP router {{eth-wan-syn}}. MACs never leave their single network.",
      technical:
        "Unlike switches, Layer 3 routers terminate the Layer 2 frame: the LAN header is discarded and a fresh Layer 2 header (router WAN MAC -> ISP gateway MAC) wraps the forwarded packet.",
      facts: [
        { label: "Switch action", value: "Forwards Layer 2 frame unchanged" },
        { label: "Router action", value: "Strips old frame, builds new header" },
        { label: "MAC lifetime", value: "Valid on one local link only" },
      ],
      events: [
        {
          type: "packet",
          id: "eth-wan-syn",
          from: "router",
          to: "isp",
          tone: "control",
          label: "NEW L2 FRAME",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ISP_ROUTER_MAC }),
            ipv4Layer({ src: ROUTER_WAN_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 52, ttl: 127 }),
            tcpLayer({ sport: 40112, dport: 443, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.025,
            src: ROUTER_WAN_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: "Re-framed WAN packet: TTL=127, 40112 -> 443 [SYN]",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "note",
          id: "note-l2-hop",
          at: "router",
          text: "MACs replaced per hop",
          tone: "lookup",
        },
      ],
    },
  ],
  outro: {
    title: "Switched locally, rewrapped across hops",
    simple:
      "The switch mapped source MACs to physical ports so unicast traffic stayed off idle links, while routers replaced the Ethernet frame at every hop beyond the local network.",
    technical:
      "Demonstrated IEEE 802.3 framing, IEEE 802.1Q MAC learning and selective forwarding, and Layer 3 frame re-encapsulation across link boundaries.",
    facts: [
      { label: "Learned entries", value: "Port 1 (laptop), Port 2 (NAS)" },
      { label: "Flooding", value: "Broadcast & unknown MACs only" },
      { label: "Frame format", value: "14 B header + 4 B FCS" },
      { label: "Routing rule", value: "New Layer 2 frame per link" },
    ],
  },
  tryIt: [
    {
      title: "Inspect local MAC addresses learned via ARP",
      explain: "Print the local IP-to-MAC neighbor table on your network adapter.",
      commands: [
        { os: "windows", cmd: "arp -a" },
        { os: "macos", cmd: "arp -a" },
        { os: "linux", cmd: "ip neigh" },
      ],
    },
  ],
});
