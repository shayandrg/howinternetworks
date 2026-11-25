import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { ETH_HEADER, IPV4_HEADER, UDP_HEADER, padFrameBytes, udpFrameBytes } from "../builders/sizes";
import { LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, WEB_SERVER_IP } from "../world";

const ICMP_PING_BYTES = padFrameBytes(ETH_HEADER + IPV4_HEADER + 8 + 32);
const ICMP_TIME_EXCEEDED_BYTES = padFrameBytes(ETH_HEADER + IPV4_HEADER + 8 + IPV4_HEADER + 8);
const ISP_HOP2_IP = "198.51.100.1"; // RFC 5737 TEST-NET-2

function icmpLayer(type: number, code: number, label: string, extra?: Array<{ name: string; value: string }>) {
  return {
    name: "ICMP",
    summary: `Type ${type}, Code ${code} (${label})`,
    fields: [
      { name: "Type", value: `${type} (${label})` },
      { name: "Code", value: String(code) },
      ...(extra ?? []),
    ],
  };
}

export const icmpFlow = defineFlow({
  meta: {
    slug: "icmp",
    kind: "flow",
    collection: "protocols",
    group: "routing",
    title: "ICMP",
    fullName: "Internet Control Message Protocol",
    tagline: "Error reports and probes powering ping and traceroute",
    layer: { tcpip: "internet", osi: 3 },
    prerequisites: ["ip"],
    related: ["ip", "ipv6", "udp", "bgp"],
    tags: ["icmp", "ping", "traceroute", "ttl", "diagnostics"],
    sources: [
      {
        label: "RFC 792: Internet Control Message Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc792",
      },
      {
        label: "RFC 4443: Internet Control Message Protocol (ICMPv6)",
        url: "https://www.rfc-editor.org/rfc/rfc4443",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[icmp|ICMP]] is how routers and servers report network status and errors, such as when a packet's hop limit expires or a port is closed. Tools like `ping` and `traceroute` use it.",
    technical:
      "Internet Control Message Protocol (RFC 792 for IPv4; RFC 4443 for IPv6) travels directly inside [[ip|IP]] (protocol number 1) without TCP or UDP ports, carrying typed diagnostic probes and error notifications.",
  },
  facts: [
    { label: "Layer", value: "Internet (OSI Layer 3)" },
    { label: "IP protocol", value: "1 (no transport port)" },
    { label: "Message format", value: "Type + Code + Checksum" },
    { label: "Built on ICMP", value: "ping, tracert / traceroute" },
    { label: "Defined in", value: "RFC 792 (IPv6: RFC 4443)" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 360, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP hop 2", sublabel: ISP_HOP2_IP, at: { x: 610, y: 300 } },
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
      id: "echo-ping",
      title: "Send a ping and get a reply",
      simple:
        "Running `ping` sends an Echo Request {{icmp-echo-req}} to the server. The server's operating system answers straight back with an Echo Reply {{icmp-echo-rep}}.",
      technical:
        `\`ping\` emits ICMP Type 8, Code 0 (Echo Request) with an identifier, sequence number, and 32 bytes of payload {{icmp-echo-req}}. The host kernel replies with Type 0, Code 0 {{icmp-echo-rep}} (RFC 792).`,
      facts: [
        { label: "Request", value: "Type 8, Code 0 (Echo Request)" },
        { label: "Reply", value: "Type 0, Code 0 (Echo Reply)" },
        { label: "Measured RTT", value: "34 ms" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "web"] },
          ],
        },
        {
          type: "packet",
          id: "icmp-echo-req",
          from: "laptop",
          to: "web",
          tone: "lookup",
          label: "Echo Request",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "ICMP (1)", totalLength: 60, ttl: 128 }),
            icmpLayer(8, 0, "Echo Request", [
              { name: "Identifier / Seq", value: "0x0001 / 1" },
              { name: "Payload", value: "32 bytes" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "ICMP",
            info: "ICMP Echo Request (Type 8), id=0x0001, seq=1, TTL=128",
            bytes: ICMP_PING_BYTES,
          },
        },
        {
          type: "packet",
          id: "icmp-echo-rep",
          from: "web",
          to: "laptop",
          tone: "response",
          label: "Echo Reply",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "ICMP (1)", totalLength: 60, ttl: 52 }),
            icmpLayer(0, 0, "Echo Reply", [
              { name: "Identifier / Seq", value: "0x0001 / 1" },
              { name: "Payload", value: "32 bytes (echoed)" },
            ]),
          ],
          capture: {
            time: 0.034,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "ICMP",
            info: "ICMP Echo Reply (Type 0), id=0x0001, seq=1, TTL=52",
            bytes: ICMP_PING_BYTES,
          },
        },
      ],
    },
    {
      id: "ttl-hop-1",
      title: "Probe hop 1 with TTL 1",
      simple:
        "To discover routers along the way, your laptop sends a packet with [[ttl|TTL]] 1 {{icmp-ttl1}}. Your home router drops it at zero and sends back Time Exceeded {{icmp-tx1}}.",
      technical:
        `With TTL=1, the home router decrements TTL to 0, discards the packet {{icmp-ttl1}}, and sends ICMP Type 11, Code 0 (Time Exceeded) from \`${ROUTER_LAN_IP}\` quoting the original IP header {{icmp-tx1}} (RFC 792).`,
      facts: [
        { label: "Probe TTL", value: "1" },
        { label: "Dropped at", value: `Home router (${ROUTER_LAN_IP})` },
        { label: "Reply", value: "Type 11, Code 0 (Time Exceeded)" },
      ],
      events: [
        {
          type: "packet",
          id: "icmp-ttl1",
          from: "laptop",
          to: "router",
          tone: "control",
          label: "TTL 1 probe",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "ICMP (1)", totalLength: 60, ttl: 1 }),
            icmpLayer(8, 0, "Echo Request"),
          ],
          capture: {
            time: 0.04,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "ICMP",
            info: "Echo request (TTL=1 probe)",
            bytes: ICMP_PING_BYTES,
          },
        },
        {
          type: "packet",
          id: "icmp-tx1",
          from: "router",
          to: "laptop",
          tone: "error",
          label: "Time Exceeded",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: ROUTER_LAN_IP, dst: LAPTOP_IP, protocol: "ICMP (1)", totalLength: 56, ttl: 64 }),
            icmpLayer(11, 0, "Time Exceeded", [
              { name: "Quoted Header", value: "Original IPv4 + 8 bytes" },
            ]),
          ],
          capture: {
            time: 0.042,
            src: ROUTER_LAN_IP,
            dst: LAPTOP_IP,
            protocol: "ICMP",
            info: "Time-to-live exceeded in transit (hop 1)",
            bytes: ICMP_TIME_EXCEEDED_BYTES,
          },
        },
      ],
    },
    {
      id: "ttl-hop-2",
      title: "Probe hop 2 with TTL 2",
      simple:
        "Next, your laptop sends a probe with [[ttl|TTL]] 2 {{icmp-ttl2}}. The home router forwards it, and the ISP router drops it and replies {{icmp-tx2}}.",
      technical:
        `With TTL=2 {{icmp-ttl2}}, the home router lowers TTL to 1 and forwards. Hop 2 (\`${ISP_HOP2_IP}\`) lowers it to 0 and returns Type 11, Code 0 {{icmp-tx2}}. Repeating with TTL 3, 4, and onward maps the route.`,
      facts: [
        { label: "Probe TTL", value: "2" },
        { label: "Hop 2 router", value: ISP_HOP2_IP },
        { label: "Traceroute", value: "Increments TTL per hop" },
      ],
      events: [
        {
          type: "packet",
          id: "icmp-ttl2",
          from: "laptop",
          to: "internet",
          tone: "control",
          label: "TTL 2 probe",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "ICMP (1)", totalLength: 60, ttl: 2 }),
            icmpLayer(8, 0, "Echo Request"),
          ],
          capture: {
            time: 0.05,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "ICMP",
            info: "Echo request (TTL=2 probe)",
            bytes: ICMP_PING_BYTES,
          },
        },
        {
          type: "packet",
          id: "icmp-tx2",
          from: "internet",
          to: "laptop",
          tone: "error",
          label: "Time Exceeded",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: ISP_HOP2_IP, dst: LAPTOP_IP, protocol: "ICMP (1)", totalLength: 56, ttl: 63 }),
            icmpLayer(11, 0, "Time Exceeded"),
          ],
          capture: {
            time: 0.056,
            src: ISP_HOP2_IP,
            dst: LAPTOP_IP,
            protocol: "ICMP",
            info: `Time-to-live exceeded in transit (hop 2: ${ISP_HOP2_IP})`,
            bytes: ICMP_TIME_EXCEEDED_BYTES,
          },
        },
      ],
    },
    {
      id: "port-unreachable",
      title: "Report a closed port",
      simple:
        "If an app sends a UDP packet to a closed port {{icmp-udp-bad}}, the server replies with Destination Unreachable {{icmp-unreach}}. Some firewalls drop these silently.",
      technical:
        "When UDP port `9999` has no listening socket {{icmp-udp-bad}}, the host sends ICMP Type 3, Code 3 (Port Unreachable) {{icmp-unreach}} per RFC 792. Many edge firewalls suppress Type 3 replies.",
      facts: [
        { label: "Type and code", value: "Type 3, Code 3 (Port Unreachable)" },
        { label: "Other codes", value: "0 net, 1 host, 4 frag needed" },
        { label: "Firewalls", value: "Often drop silently instead" },
      ],
      events: [
        {
          type: "packet",
          id: "icmp-udp-bad",
          from: "laptop",
          to: "web",
          tone: "request",
          label: "UDP -> 9999",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 10 }),
            udpLayer({ sport: 52500, dport: 9999, payloadBytes: 10 }),
          ],
          capture: {
            time: 0.07,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "UDP",
            info: "52500 -> 9999 Len=10 (closed port)",
            bytes: udpFrameBytes(10).frameBytes,
          },
        },
        {
          type: "packet",
          id: "icmp-unreach",
          from: "web",
          to: "laptop",
          tone: "error",
          label: "Port Unreachable",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "ICMP (1)", totalLength: 56, ttl: 52 }),
            icmpLayer(3, 3, "Destination Unreachable (Port Unreachable)"),
          ],
          capture: {
            time: 0.104,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "ICMP",
            info: "Destination unreachable (Port unreachable)",
            bytes: ICMP_TIME_EXCEEDED_BYTES,
          },
        },
      ],
    },
  ],
  outro: {
    title: "Network diagnostics answered",
    simple:
      "Echo probes measured round-trip time, tiny TTL values revealed each router along the route, and a closed UDP port triggered an immediate Port Unreachable error.",
    technical:
      "Demonstrated ICMP Type 8/0 (Echo), Type 11/0 (Time Exceeded), and Type 3/3 (Port Unreachable) inside IPv4 protocol 1.",
    facts: [
      { label: "Echo", value: "Type 8 request, Type 0 reply" },
      { label: "TTL expired", value: "Type 11, Code 0" },
      { label: "Port closed", value: "Type 3, Code 3" },
      { label: "IPv6 spec", value: "RFC 4443 (ICMPv6)" },
    ],
  },
  tryIt: [
    {
      title: "Measure round-trip time with ping",
      explain:
        "Send four ICMP Echo Requests and observe the reply latency and TTL reported by the remote host.",
      commands: [
        { os: "windows", cmd: "ping -n 4 example.com" },
        { os: "macos", cmd: "ping -c 4 example.com" },
        { os: "linux", cmd: "ping -c 4 example.com" },
      ],
    },
    {
      title: "Trace each hop along the path",
      explain:
        "Watch routers reply with ICMP Time Exceeded as the TTL increases hop by hop.",
      commands: [
        { os: "windows", cmd: "tracert example.com" },
        { os: "macos", cmd: "traceroute example.com" },
        { os: "linux", cmd: "traceroute example.com" },
      ],
    },
  ],
});
