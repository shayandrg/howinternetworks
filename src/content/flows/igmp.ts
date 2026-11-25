import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import { LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, ROUTER_WAN_IP, SERVER_MAC, SWITCH_MAC } from "../world";

const TVBOX_IP = "192.168.1.30";
const TVBOX_MAC = "00:00:5e:00:53:30";
const MCAST_GROUP = "233.252.0.1";
const ALL_HOSTS = "224.0.0.1";
const ALL_ROUTERS = "224.0.0.2";
const IPTV_SERVER = "198.51.100.90";

function igmpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "IGMPv2 (IP Proto 2)", summary, fields };
}

export const igmpFlow = defineFlow({
  meta: {
    slug: "igmp",
    kind: "flow",
    collection: "protocols",
    group: "calls",
    title: "IGMP",
    fullName: "Internet Group Management Protocol",
    tagline: "Joining multicast TV channels without flooding idle ports",
    layer: { tcpip: "internet", osi: 3 },
    prerequisites: ["ip", "ethernet"],
    related: ["udp", "ip", "ethernet", "rtsp"],
    tags: ["igmp", "multicast", "iptv", "snooping", "groups"],
    sources: [
      {
        label: "RFC 2236: Internet Group Management Protocol, Version 2",
        url: "https://www.rfc-editor.org/rfc/rfc2236",
      },
      {
        label: "RFC 9776: Internet Group Management Protocol, Version 3 (obsoletes RFC 3376)",
        url: "https://www.rfc-editor.org/rfc/rfc9776",
      },
      {
        label: "RFC 4541: Considerations for IGMP Snooping Switches",
        url: "https://www.rfc-editor.org/rfc/rfc4541",
      },
      {
        label: "RFC 4605: IGMP/MLD-Based Multicast Forwarding (IGMP Proxy)",
        url: "https://www.rfc-editor.org/rfc/rfc4605",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[multicast|Multicast]] transmits one live TV feed to a group address (`233.252.0.1`), copying packets only onto paths with viewers. [[igmp|IGMP]] lets TV boxes tell routers what they want while switches snoop to isolate traffic.",
    technical:
      "Defined in RFC 2236 (IGMPv2) and RFC 9776 (IGMPv3, updating RFC 2236), IGMP rides inside IP protocol 2. Together with RFC 4541 IGMP snooping switches, LANs replicate IPTV streams solely to joined ports.",
  },
  facts: [
    { label: "Layer", value: "Internet (IP protocol 2)" },
    { label: "Group range", value: "224.0.0.0 - 239.255.255.255" },
    { label: "Control verbs", value: "Report (Join), Query, Leave" },
    { label: "Switch optimization", value: "IGMP snooping filters idle ports" },
    { label: "Defined in", value: "RFC 2236, RFC 9776, RFC 4541" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 100, y: 140 } },
      { id: "tvbox", kind: "tv-box", label: "TV box (port 2)", sublabel: TVBOX_IP, at: { x: 100, y: 380 } },
      { id: "switch", kind: "switch", label: "LAN switch", sublabel: SWITCH_MAC, at: { x: 370, y: 260 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 635, y: 260 } },
      { id: "iptv", kind: "server", label: "ISP IPTV headend", sublabel: IPTV_SERVER, at: { x: 890, y: 260 } },
    ],
    links: [
      { id: "l-p1", from: "laptop", to: "switch", medium: "ethernet" },
      { id: "l-p2", from: "tvbox", to: "switch", medium: "ethernet" },
      { id: "l-rtr", from: "switch", to: "router", medium: "ethernet" },
      { id: "l-isp", from: "router", to: "iptv", medium: "fiber" },
    ],
    start: {
      visible: ["laptop", "tvbox", "switch", "router", "iptv"],
      focus: ["tvbox", "switch", "router", "iptv"],
    },
  },
  steps: [
    {
      id: "tv-join",
      title: "TV box sends IGMP Report to join",
      simple:
        "Tuning to `233.252.0.1`, the TV box emits an IGMP Report {{igmp-join1}}. Snooping port 2, the switch logs the port and forwards the join only to the router {{igmp-join2}}.",
      technical:
        `RFC 2236 Type \`0x16\` Membership Report targets group \`${MCAST_GROUP}\`. RFC 4541 snooping adds port 2 to the \`${MCAST_GROUP}\` port table without flooding the laptop.`,
      facts: [
        { label: "Channel 1", value: MCAST_GROUP },
        { label: "Message", value: "IGMPv2 Membership Report (0x16)" },
        { label: "Switch learns", value: "Port 2 wants 233.252.0.1" },
      ],
      events: [
        {
          type: "packet",
          id: "igmp-join1",
          from: "tvbox",
          to: "switch",
          tone: "control",
          label: "JOIN 233.252.0.1",
          layers: [
            ethernetLayer({ srcMac: TVBOX_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: TVBOX_IP, dst: MCAST_GROUP, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer(`Membership Report group ${MCAST_GROUP}`, [{ name: "Port", value: "Switch port 2" }]),
          ],
          capture: {
            time: 0.0,
            src: TVBOX_IP,
            dst: MCAST_GROUP,
            protocol: "IGMPv2",
            info: `Membership Report group ${MCAST_GROUP} (port 2)`,
            bytes: padFrameBytes(14 + 28),
          },
        },
        {
          type: "packet",
          id: "igmp-join2",
          from: "switch",
          to: "router",
          tone: "control",
          label: "JOIN -> ROUTER",
          layers: [
            ethernetLayer({ srcMac: TVBOX_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: TVBOX_IP, dst: MCAST_GROUP, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer("Forwarded to router port only", [{ name: "Snooping", value: "Port 2 registered" }]),
          ],
          capture: {
            time: 0.001,
            src: TVBOX_IP,
            dst: MCAST_GROUP,
            protocol: "IGMPv2",
            info: `Membership Report -> router only`,
            bytes: padFrameBytes(14 + 28),
          },
        },
      ],
    },
    {
      id: "proxy-join",
      title: "Router joins once for the home",
      simple:
        "Acting as an IGMP proxy, your router submits a single upstream Membership Report from its public IP to the ISP {{igmp-wan-join}}. One upstream TV feed serves the entire house.",
      technical:
        `The IGMP proxy translates LAN subscription into one upstream WAN Membership Report from \`${ROUTER_WAN_IP}\`, regardless of how many LAN screens watch.`,
      facts: [
        { label: "Router role", value: "IGMP proxy (RFC 4605)" },
        { label: "Source IP", value: ROUTER_WAN_IP },
        { label: "Upstream copies", value: "1 stream per home" },
      ],
      events: [
        {
          type: "packet",
          id: "igmp-wan-join",
          from: "router",
          to: "iptv",
          tone: "request",
          label: "PROXY JOIN",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: ROUTER_WAN_IP, dst: MCAST_GROUP, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer(`WAN Membership Report ${MCAST_GROUP}`, [{ name: "Efficiency", value: "Single upstream join" }]),
          ],
          capture: {
            time: 0.01,
            src: ROUTER_WAN_IP,
            dst: MCAST_GROUP,
            protocol: "IGMPv2",
            info: `WAN Proxy Report group ${MCAST_GROUP}`,
            bytes: padFrameBytes(14 + 28),
          },
        },
        { type: "wait", ms: 600 },
      ],
    },
    {
      id: "flow-port2",
      title: "Deliver stream solely to port 2",
      simple:
        "The ISP sends 1,316 B UDP datagrams (7 MPEG-TS packets each) to `233.252.0.1` {{igmp-tv-wan}}. The switch sends them solely out port 2 to the TV {{igmp-tv-p2}}; your laptop gets none.",
      technical:
        "Switch hardware matches multicast MAC `01:00:5e:7c:00:01` against its snooped forwarding entry, isolating high-bitrate video away from unsubscribed ports.",
      facts: [
        { label: "UDP payload", value: "1,316 B (7 x 188 B MPEG-TS)" },
        { label: "Switch filter", value: "Forwarded to port 2 only" },
        { label: "Laptop receives", value: "Nothing" },
      ],
      events: [
        {
          type: "packet",
          id: "igmp-tv-wan",
          from: "iptv",
          to: "switch",
          via: ["router"],
          tone: "data",
          label: "CHANNEL 1 (1,316 B)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: IPTV_SERVER, dst: MCAST_GROUP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 1316 }),
            udpLayer({ sport: 5004, dport: 5004, length: UDP_HEADER + 1316 }),
            igmpLayer("IPTV Stream (7 MPEG-TS packets)", [{ name: "Target group", value: MCAST_GROUP }]),
          ],
          capture: {
            time: 0.03,
            src: IPTV_SERVER,
            dst: MCAST_GROUP,
            protocol: "UDP",
            info: "Channel 1 MPEG-TS (1,316 B UDP)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 1316),
          },
        },
        {
          type: "packet",
          id: "igmp-tv-p2",
          from: "switch",
          to: "tvbox",
          tone: "data",
          label: "PORT 2 ONLY",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: IPTV_SERVER, dst: MCAST_GROUP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 1316 }),
            udpLayer({ sport: 5004, dport: 5004, length: UDP_HEADER + 1316 }),
            igmpLayer("Delivered to port 2 (laptop idle)", [{ name: "Port 1", value: "Filtered out" }]),
          ],
          capture: {
            time: 0.031,
            src: IPTV_SERVER,
            dst: MCAST_GROUP,
            protocol: "UDP",
            info: "Switch Out Port 2 (port 1 isolated)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 1316),
          },
        },
      ],
    },
    {
      id: "second-screen",
      title: "Replicate locally for 2nd host",
      simple:
        "VLC on your laptop joins `233.252.0.1` {{igmp-join-lap}}. The switch copies frames locally to ports 1 and 2 {{igmp-fan1}} {{igmp-fan2}}, keeping one upstream feed.",
      technical:
        "Router detects the existing active upstream subscription and suppresses duplicate WAN joins while the LAN switch copies frames to ports 1 and 2.",
      facts: [
        { label: "Switch outputs", value: "Ports 1 and 2 replicated" },
        { label: "Upstream ISP link", value: "Still 1 single stream" },
        { label: "Router WAN ask", value: "None (already active)" },
      ],
      events: [
        { type: "focus", actors: ["laptop", "tvbox", "switch", "router"] },
        {
          type: "packet",
          id: "igmp-join-lap",
          from: "laptop",
          to: "switch",
          tone: "control",
          label: "LAPTOP JOIN (P1)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: LAPTOP_IP, dst: MCAST_GROUP, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer("Membership Report port 1", [{ name: "Updated table", value: "Ports 1 + 2" }]),
          ],
          capture: {
            time: 0.5,
            src: LAPTOP_IP,
            dst: MCAST_GROUP,
            protocol: "IGMPv2",
            info: `Membership Report ${MCAST_GROUP} (port 1 added)`,
            bytes: padFrameBytes(14 + 28),
          },
        },
        {
          type: "together",
          events: [
            {
              type: "packet",
              id: "igmp-fan1",
              from: "switch",
              to: "laptop",
              tone: "data",
              label: "CHANNEL 1 (P1)",
              fast: true,
              layers: [
                ethernetLayer({ srcMac: SERVER_MAC, dstMac: "01:00:5e:7c:00:01" }),
                ipv4Layer({ src: IPTV_SERVER, dst: MCAST_GROUP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 1316 }),
                udpLayer({ sport: 5004, dport: 5004, length: UDP_HEADER + 1316 }),
              ],
              capture: {
                time: 0.52,
                src: IPTV_SERVER,
                dst: MCAST_GROUP,
                protocol: "UDP",
                info: "Switch Out Port 1 (laptop copy)",
                bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 1316),
              },
            },
            {
              type: "packet",
              id: "igmp-fan2",
              from: "switch",
              to: "tvbox",
              tone: "data",
              label: "CHANNEL 1 (P2)",
              fast: true,
              layers: [
                ethernetLayer({ srcMac: SERVER_MAC, dstMac: "01:00:5e:7c:00:01" }),
                ipv4Layer({ src: IPTV_SERVER, dst: MCAST_GROUP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 1316 }),
                udpLayer({ sport: 5004, dport: 5004, length: UDP_HEADER + 1316 }),
              ],
              capture: {
                time: 0.52,
                src: IPTV_SERVER,
                dst: MCAST_GROUP,
                protocol: "UDP",
                info: "Switch Out Port 2 (TV copy)",
                bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 1316),
              },
            },
          ],
        },
      ],
    },
    {
      id: "periodic-query",
      title: "Keep active via 125s queries",
      simple:
        "Every 125 s the router broadcasts an all-hosts General Query (`224.0.0.1`) {{igmp-q-all}}. Subscribed listeners reply randomly inside 10 s {{igmp-rep-keep}} to prove viewers remain tuned in.",
      technical:
        `IGMPv2 Querier Interval (125 s) emits Type \`0x11\` General Queries to \`${ALL_HOSTS}\` with Max Response Time 10 s; IGMPv3 (RFC 9776) adds source-specific filtering.`,
      facts: [
        { label: "Query interval", value: "Every 125 seconds" },
        { label: "Sent to", value: `${ALL_HOSTS} (all multicast hosts)` },
        { label: "Jitter window", value: "Random reply within 10 s" },
      ],
      events: [
        {
          type: "packet",
          id: "igmp-q-all",
          from: "router",
          to: "tvbox",
          via: ["switch"],
          tone: "control",
          label: "GENERAL QUERY (224.0.0.1)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: "01:00:5e:00:00:01" }),
            ipv4Layer({ src: ROUTER_LAN_IP, dst: ALL_HOSTS, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer("General Membership Query (MaxResp 10 s)", [{ name: "Target", value: "All groups (0.0.0.0)" }]),
          ],
          capture: {
            time: 125.0,
            src: ROUTER_LAN_IP,
            dst: ALL_HOSTS,
            protocol: "IGMPv2",
            info: "Membership Query, general (every 125 s)",
            bytes: padFrameBytes(14 + 28),
          },
        },
        {
          type: "packet",
          id: "igmp-rep-keep",
          from: "tvbox",
          to: "router",
          via: ["switch"],
          tone: "response",
          label: "STILL WATCHING",
          layers: [
            ethernetLayer({ srcMac: TVBOX_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: TVBOX_IP, dst: MCAST_GROUP, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer(`Membership Report ${MCAST_GROUP}`, [{ name: "Result", value: "Timer refreshed" }]),
          ],
          capture: {
            time: 125.4,
            src: TVBOX_IP,
            dst: MCAST_GROUP,
            protocol: "IGMPv2",
            info: `Membership Report ${MCAST_GROUP} (keepalive)`,
            bytes: padFrameBytes(14 + 28),
          },
        },
      ],
    },
    {
      id: "leave-group",
      title: "Leave port 1 while TV stays on",
      simple:
        "Closing VLC sends `Leave` to `224.0.0.2` {{igmp-leave}}. Checking for remaining viewers, the router sends a Group-Specific Query {{igmp-gsq}}; the TV box answers {{igmp-tv-stay}}, keeping Channel 1 live.",
      technical:
        `RFC 2236 Leave (\`0x17\`) prompts a Group-Specific Query (1 s response window). The switch prunes port 1 only while preserving port 2.`,
      facts: [
        { label: "Leave target", value: `${ALL_ROUTERS} (all routers)` },
        { label: "Verification", value: "1 s Group-Specific Query" },
        { label: "Result", value: "Port 1 stops; port 2 stays live" },
      ],
      events: [
        {
          type: "packet",
          id: "igmp-leave",
          from: "laptop",
          to: "router",
          via: ["switch"],
          tone: "control",
          label: "LEAVE 233.252.0.1",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: "01:00:5e:00:00:02" }),
            ipv4Layer({ src: LAPTOP_IP, dst: ALL_ROUTERS, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer(`Leave Group ${MCAST_GROUP}`, [{ name: "Target", value: ALL_ROUTERS }]),
          ],
          capture: {
            time: 140.0,
            src: LAPTOP_IP,
            dst: ALL_ROUTERS,
            protocol: "IGMPv2",
            info: `Leave Group ${MCAST_GROUP} -> ${ALL_ROUTERS}`,
            bytes: padFrameBytes(14 + 28),
          },
        },
        {
          type: "packet",
          id: "igmp-gsq",
          from: "router",
          to: "tvbox",
          via: ["switch"],
          tone: "control",
          label: "ANYONE LEFT?",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: ROUTER_LAN_IP, dst: MCAST_GROUP, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer(`Group-Specific Query ${MCAST_GROUP}`, [{ name: "MaxResp", value: "1 s" }]),
          ],
          capture: {
            time: 140.005,
            src: ROUTER_LAN_IP,
            dst: MCAST_GROUP,
            protocol: "IGMPv2",
            info: `Group-Specific Query ${MCAST_GROUP}`,
            bytes: padFrameBytes(14 + 28),
          },
        },
        {
          type: "packet",
          id: "igmp-tv-stay",
          from: "tvbox",
          to: "router",
          via: ["switch"],
          tone: "response",
          label: "TV STILL HERE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: TVBOX_MAC, dstMac: "01:00:5e:7c:00:01" }),
            ipv4Layer({ src: TVBOX_IP, dst: MCAST_GROUP, protocol: "IGMP (2)", totalLength: 28, ttl: 1 }),
            igmpLayer(`Membership Report ${MCAST_GROUP}`, [{ name: "Outcome", value: "Port 2 stays active" }]),
          ],
          capture: {
            time: 140.2,
            src: TVBOX_IP,
            dst: MCAST_GROUP,
            protocol: "IGMPv2",
            info: `Membership Report ${MCAST_GROUP} (TV box remains)`,
            bytes: padFrameBytes(14 + 28),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Replicated only where viewers tuned in",
    simple:
      "The TV box and laptop subscribed with IGMP reports. Your router joined the provider stream once, the switch copied video only onto active ports, and leaving pruned port 1 without interrupting the TV.",
    technical:
      "IGMPv2 proxy joins, RFC 4541 switch snooping, periodic 125 s queries, and group-specific Leave handling isolated multicast IPTV traffic cleanly.",
    facts: [
      { label: "Group IP", value: MCAST_GROUP },
      { label: "ISP feed", value: "1 stream for multiple screens" },
      { label: "LAN switch", value: "Copies strictly to joined ports" },
      { label: "Query interval", value: "125 s (IGMPv3: RFC 9776)" },
    ],
  },
  tryIt: [
    {
      title: "Inspect local IPv4 multicast group memberships",
      explain: "List which multicast groups your host interfaces have joined via IGMP.",
      commands: [
        { os: "windows", cmd: "netsh interface ipv4 show joins" },
        { os: "macos", cmd: "netstat -g" },
        { os: "linux", cmd: "ip maddr show" },
      ],
    },
  ],
});
