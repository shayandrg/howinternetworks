import { defineFlow } from "../schema";
import { ethernetLayer, ipv6Layer } from "../builders/layers";
import { IPV6_HEADER, padFrameBytes } from "../builders/sizes";
import {
  LAPTOP_IPV6,
  LAPTOP_IPV6_LL,
  LAPTOP_MAC,
  RESOLVER_IPV6,
  ROUTER_IPV6_LAN,
  ROUTER_IPV6_LL,
  ROUTER_MAC,
} from "../world";

const SOLICITED_NODE_MCAST = "ff02::1:ff00:10";
const ALL_ROUTERS_MCAST = "ff02::2";
const ALL_NODES_MCAST = "ff02::1";

function icmpv6Layer(type: number, summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: `ICMPv6 (Type ${type})`, summary, fields };
}

export const ipv6Flow = defineFlow({
  meta: {
    slug: "ipv6",
    kind: "flow",
    collection: "protocols",
    group: "routing",
    title: "IPv6",
    fullName: "IPv6 Addressing, SLAAC, and Neighbor Discovery",
    tagline: "Self-configured 128-bit addresses without DHCP or NAT",
    layer: { tcpip: "internet", osi: 3 },
    prerequisites: ["ip"],
    related: ["ip", "icmp", "dhcp", "dns"],
    tags: ["ipv6", "slaac", "ndp", "dad", "icmpv6"],
    sources: [
      {
        label: "RFC 8200: Internet Protocol, Version 6 (IPv6) Specification",
        url: "https://www.rfc-editor.org/rfc/rfc8200",
      },
      {
        label: "RFC 4861: Neighbor Discovery for IP version 6 (IPv6)",
        url: "https://www.rfc-editor.org/rfc/rfc4861",
      },
      {
        label: "RFC 4862: IPv6 Stateless Address Autoconfiguration (SLAAC)",
        url: "https://www.rfc-editor.org/rfc/rfc4862",
      },
      {
        label: "RFC 8106: IPv6 Router Advertisement Options for DNS Configuration",
        url: "https://www.rfc-editor.org/rfc/rfc8106",
      },
      {
        label: "RFC 8981: Temporary Address Extensions for SLAAC",
        url: "https://www.rfc-editor.org/rfc/rfc8981",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[ipv6|IPv6]] uses 128-bit addresses so every device can hold a public address of its own. Using [[slaac|SLAAC]], a laptop builds a [[link-local]] address, asks routers for the network prefix, and discovers MACs via ICMPv6.",
    technical:
      "RFC 8200 defines a fixed 40-byte IPv6 header. Under [[ndp|NDP]] (RFC 4861) and SLAAC (RFC 4862), hosts verify address uniqueness (DAD), learn prefixes from Router Advertisements, and replace IPv4 ARP with Neighbor Solicitations.",
  },
  facts: [
    { label: "Layer", value: "Internet (OSI Layer 3)" },
    { label: "Address size", value: "128 bits (fixed 40 B header)" },
    { label: "Autoconfig", value: "SLAAC (router prefix + ID)" },
    { label: "Replaces ARP", value: "ICMPv6 Neighbor Discovery" },
    { label: "Defined in", value: "RFC 8200, RFC 4861, RFC 4862" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: "No IPv6 yet", at: { x: 240, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_IPV6_LL, at: { x: 740, y: 300 } },
    ],
    links: [{ id: "l-wifi", from: "laptop", to: "router", medium: "wifi" }],
    start: {
      visible: ["laptop"],
      focus: ["laptop", "router"],
    },
  },
  steps: [
    {
      id: "link-local-dad",
      title: "Build link-local IP and run DAD",
      simple:
        "Every IPv6 interface builds a [[link-local]] address (`fe80::10`) usable only on its local LAN. It probes with a Neighbor Solicitation from `::` {{ipv6-dad-ll}} and keeps it when nobody answers.",
      technical:
        `Duplicate Address Detection (RFC 4862 §5.4) transmits an ICMPv6 Type 135 Neighbor Solicitation from \`::\` to solicited-node multicast \`${SOLICITED_NODE_MCAST}\`. Silence after RetransTimer confirms uniqueness.`,
      facts: [
        { label: "Candidate", value: LAPTOP_IPV6_LL },
        { label: "Method", value: "Duplicate Address Detection (DAD)" },
        { label: "Response", value: "None (address is unclaimed)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router"] },
            { type: "focus", actors: ["laptop", "router"] },
          ],
        },
        {
          type: "packet",
          id: "ipv6-dad-ll",
          from: "laptop",
          to: "router",
          tone: "lookup",
          label: "DAD: IS IT TAKEN?",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: "33:33:ff:00:00:10" }),
            ipv6Layer({ src: "::", dst: SOLICITED_NODE_MCAST, nextHeader: "ICMPv6 (58)", payloadLength: 24, hopLimit: 255 }),
            icmpv6Layer(135, `Neighbor Solicitation for ${LAPTOP_IPV6_LL}`, [
              { name: "Target", value: LAPTOP_IPV6_LL },
            ]),
          ],
          capture: {
            time: 0.0,
            src: "::",
            dst: SOLICITED_NODE_MCAST,
            protocol: "ICMPv6",
            info: `Neighbor Solicitation for ${LAPTOP_IPV6_LL} (DAD)`,
            bytes: padFrameBytes(14 + IPV6_HEADER + 24),
          },
        },
        {
          type: "note",
          id: "note-ll-free",
          at: "laptop",
          text: `Assigned ${LAPTOP_IPV6_LL}`,
          tone: "response",
        },
      ],
    },
    {
      id: "router-solicitation",
      title: "Ask for routers on ff02::2",
      simple:
        "Link-local addresses cannot cross onto the internet, so your laptop sends a Router Solicitation to `ff02::2` (all local routers) carrying its MAC address {{ipv6-rs}}.",
      technical:
        `ICMPv6 Type 133 Router Solicitation (RFC 4861 §4.1) targets all-routers link-local multicast \`${ALL_ROUTERS_MCAST}\` with Source Link-Layer Address option \`${LAPTOP_MAC}\`.`,
      facts: [
        { label: "Destination", value: `${ALL_ROUTERS_MCAST} (all routers)` },
        { label: "Source", value: LAPTOP_IPV6_LL },
        { label: "Option", value: `Source MAC ${LAPTOP_MAC}` },
      ],
      events: [
        {
          type: "packet",
          id: "ipv6-rs",
          from: "laptop",
          to: "router",
          tone: "request",
          label: "ROUTER SOLICIT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: "33:33:00:00:00:02" }),
            ipv6Layer({ src: LAPTOP_IPV6_LL, dst: ALL_ROUTERS_MCAST, nextHeader: "ICMPv6 (58)", payloadLength: 16, hopLimit: 255 }),
            icmpv6Layer(133, `Router Solicitation from ${LAPTOP_MAC}`, [
              { name: "Source LLA", value: LAPTOP_MAC },
            ]),
          ],
          capture: {
            time: 1.01,
            src: LAPTOP_IPV6_LL,
            dst: ALL_ROUTERS_MCAST,
            protocol: "ICMPv6",
            info: `Router Solicitation from ${LAPTOP_MAC}`,
            bytes: padFrameBytes(14 + IPV6_HEADER + 16),
          },
        },
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "router-advertisement",
      title: "Learn prefix, MTU, and DNS info",
      simple:
        "The router answers on `ff02::1` (every node) with one Router Advertisement {{ipv6-ra}}: default route lifetime, link MTU 1500, global prefix `2001:db8:1::/64` (`A` flag on), and DNS server `2001:db8:8::8`.",
      technical:
        `ICMPv6 Type 134 Router Advertisement bundles Prefix Information (\`2001:db8:1::/64\`, A=1 autonomous SLAAC), MTU=1500, Source LLA, and RDNSS \`${RESOLVER_IPV6}\` (RFC 8106).`,
      facts: [
        { label: "Advertised prefix", value: "2001:db8:1::/64 (A=1)" },
        { label: "MTU", value: "1500 bytes" },
        { label: "RDNSS", value: RESOLVER_IPV6 },
      ],
      events: [
        {
          type: "packet",
          id: "ipv6-ra",
          from: "router",
          to: "laptop",
          tone: "response",
          label: "ROUTER ADVERT",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: "33:33:00:00:00:01" }),
            ipv6Layer({ src: ROUTER_IPV6_LL, dst: ALL_NODES_MCAST, nextHeader: "ICMPv6 (58)", payloadLength: 88, hopLimit: 255 }),
            icmpv6Layer(134, "Router Advertisement: prefix 2001:db8:1::/64, MTU 1500", [
              { name: "Router lifetime", value: "1800 s (use as default gateway)" },
              { name: "Prefix / flags", value: `${ROUTER_IPV6_LAN.replace("::1", "::/64")} (L=1, A=1)` },
              { name: "RDNSS", value: RESOLVER_IPV6 },
            ]),
          ],
          capture: {
            time: 1.012,
            src: ROUTER_IPV6_LL,
            dst: ALL_NODES_MCAST,
            protocol: "ICMPv6",
            info: "Router Advertisement: 2001:db8:1::/64, MTU 1500, RDNSS",
            bytes: padFrameBytes(14 + IPV6_HEADER + 88),
          },
        },
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "global-slaac",
      title: "Form global address and run DAD",
      simple:
        "Combining the `2001:db8:1::/64` prefix with an interface ID forms `2001:db8:1::10`, verified again with DAD {{ipv6-dad-glob}}. Operating systems also generate temporary rotating addresses for outbound browsing privacy.",
      technical:
        `After SLAAC DAD passes for \`${LAPTOP_IPV6}\` (RFC 4862), privacy extensions (RFC 8981) create ephemeral random interface IDs so websites cannot track one host across sessions.`,
      facts: [
        { label: "Global address", value: LAPTOP_IPV6 },
        { label: "Check", value: "Duplicate Address Detection" },
        { label: "Privacy", value: "Temporary random IPv6 for outbound" },
      ],
      events: [
        {
          type: "packet",
          id: "ipv6-dad-glob",
          from: "laptop",
          to: "router",
          tone: "lookup",
          label: "DAD: GLOBAL",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: "33:33:ff:00:00:10" }),
            ipv6Layer({ src: "::", dst: SOLICITED_NODE_MCAST, nextHeader: "ICMPv6 (58)", payloadLength: 24, hopLimit: 255 }),
            icmpv6Layer(135, `Neighbor Solicitation for ${LAPTOP_IPV6}`, [{ name: "Target", value: LAPTOP_IPV6 }]),
          ],
          capture: {
            time: 1.02,
            src: "::",
            dst: SOLICITED_NODE_MCAST,
            protocol: "ICMPv6",
            info: `Neighbor Solicitation for ${LAPTOP_IPV6} (DAD)`,
            bytes: padFrameBytes(14 + IPV6_HEADER + 24),
          },
        },
        {
          type: "note",
          id: "note-glob-ok",
          at: "laptop",
          text: `Global IP ${LAPTOP_IPV6}`,
          tone: "response",
        },
      ],
    },
    {
      id: "neighbor-lookup",
      title: "Find MAC via Neighbor Discovery",
      simple:
        "When inbound traffic arrives for `2001:db8:1::10`, the router sends a Neighbor Solicitation to the solicited-node multicast group {{ipv6-ns}} (no broadcast to idle hosts), and the laptop returns its MAC {{ipv6-na}}.",
      technical:
        `NDP replaces ARP using targeted multicast \`${SOLICITED_NODE_MCAST}\`. Neighbor Solicitation (Type 135) prompts a unicast Neighbor Advertisement (Type 136, Solicited+Override) holding \`${LAPTOP_MAC}\`.`,
      facts: [
        { label: "Multicast target", value: SOLICITED_NODE_MCAST },
        { label: "Reply", value: `NA -> ${LAPTOP_MAC}` },
        { label: "Gain over ARP", value: "Only matching MAC-suffix NICs inspect it" },
      ],
      events: [
        {
          type: "packet",
          id: "ipv6-ns",
          from: "router",
          to: "laptop",
          tone: "request",
          label: "NEIGHBOR SOLICIT",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: "33:33:ff:00:00:10" }),
            ipv6Layer({ src: ROUTER_IPV6_LL, dst: SOLICITED_NODE_MCAST, nextHeader: "ICMPv6 (58)", payloadLength: 32, hopLimit: 255 }),
            icmpv6Layer(135, `Who has ${LAPTOP_IPV6}?`, [{ name: "Source LLA", value: ROUTER_MAC }]),
          ],
          capture: {
            time: 2.5,
            src: ROUTER_IPV6_LL,
            dst: SOLICITED_NODE_MCAST,
            protocol: "ICMPv6",
            info: `Neighbor Solicitation for ${LAPTOP_IPV6} from ${ROUTER_MAC}`,
            bytes: padFrameBytes(14 + IPV6_HEADER + 32),
          },
        },
        {
          type: "packet",
          id: "ipv6-na",
          from: "laptop",
          to: "router",
          tone: "response",
          label: "NEIGHBOR ADVERT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv6Layer({ src: LAPTOP_IPV6_LL, dst: ROUTER_IPV6_LL, nextHeader: "ICMPv6 (58)", payloadLength: 32, hopLimit: 255 }),
            icmpv6Layer(136, `${LAPTOP_IPV6} is at ${LAPTOP_MAC}`, [{ name: "Target LLA", value: LAPTOP_MAC }]),
          ],
          capture: {
            time: 2.502,
            src: LAPTOP_IPV6_LL,
            dst: ROUTER_IPV6_LL,
            protocol: "ICMPv6",
            info: `Neighbor Advertisement ${LAPTOP_IPV6} is at ${LAPTOP_MAC}`,
            bytes: padFrameBytes(14 + IPV6_HEADER + 32),
          },
        },
      ],
    },
    {
      id: "ready-no-nat",
      title: "Get online without DHCP or NAT",
      simple:
        "The laptop talks directly to the internet using its own global IPv6 address without NAT address translation. The router's stateful firewall still drops unsolicited incoming traffic.",
      technical:
        "With global addressability, end-to-end packets cross the router un-translated; managed LANs can optionally run DHCPv6 (Router Advertisement flags M/O) alongside SLAAC.",
      facts: [
        { label: "NAT needed", value: "No (direct global addressing)" },
        { label: "Firewall", value: "Blocks unsolicited inbound traffic" },
        { label: "DHCPv6", value: "Optional (controlled by M/O flags)" },
      ],
      events: [
        {
          type: "note",
          id: "ipv6-note-online",
          at: "laptop",
          text: "Online over IPv6 (no NAT)",
          tone: "response",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "Dual-scoped addresses built automatically",
    simple:
      "The laptop created link-local and global IPv6 addresses, checked both for duplicates, and learned its gateway, MTU, and DNS server from a single Router Advertisement without needing DHCP or NAT.",
    technical:
      "SLAAC + NDP completed setup in six ICMPv6 messages (DAD, RS, RA, global DAD, NS, NA) per RFC 4861 and RFC 4862.",
    facts: [
      { label: "Link-local", value: LAPTOP_IPV6_LL },
      { label: "Global prefix", value: "2001:db8:1::/64 + host ID" },
      { label: "Protocol family", value: "6 ICMPv6 messages" },
      { label: "ARP / NAT", value: "NDP replaces ARP; no NAT needed" },
    ],
  },
  tryIt: [
    {
      title: "Inspect IPv6 addresses and neighbor cache",
      explain: "View link-local, SLAAC global, and temporary privacy IPv6 addresses on your device.",
      commands: [
        { os: "windows", cmd: "netsh interface ipv6 show addresses" },
        { os: "macos", cmd: "ifconfig | grep inet6" },
        { os: "linux", cmd: "ip -6 addr" },
      ],
    },
  ],
});
