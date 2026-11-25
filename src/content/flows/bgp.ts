import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import {
  HOSTING_ASN,
  ISP_ASN,
  LAPTOP_IP,
  LAPTOP_MAC,
  ROUTER_LAN_IP,
  ROUTER_MAC,
  SERVER_MAC,
  TRANSIT_ASN,
  WEB_DOMAIN,
  WEB_SERVER_IP,
} from "../world";

const ISP_IP = "198.51.100.1";
const TRANSIT_IP = "198.51.100.129";
const HOSTING_IP = "203.0.113.1";

function bgpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "BGP-4", summary, fields };
}

export const bgpFlow = defineFlow({
  meta: {
    slug: "bgp",
    kind: "flow",
    collection: "protocols",
    group: "routing",
    title: "BGP",
    fullName: "Border Gateway Protocol",
    tagline: "How autonomous networks advertise and choose internet routes",
    layer: {
      tcpip: "application",
      osi: 7,
      note: "Runs over TCP 179; controls Layer 3 routing",
    },
    prerequisites: ["ip", "tcp"],
    related: ["ip", "tcp", "icmp", "dns"],
    tags: ["bgp", "routing", "asn", "rpki", "prefix"],
    sources: [
      {
        label: "RFC 4271: A Border Gateway Protocol 4 (BGP-4)",
        url: "https://www.rfc-editor.org/rfc/rfc4271",
      },
      {
        label: "RFC 6811: BGP Prefix Origin Validation (RPKI)",
        url: "https://www.rfc-editor.org/rfc/rfc6811",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "The internet links tens of thousands of independent networks called Autonomous Systems ([[asn|ASNs]]). [[bgp|BGP]] lets border routers share which IP address blocks each network can reach so packets find a path anywhere.",
    technical:
      "Border Gateway Protocol 4 (RFC 4271) runs over TCP port 179 while controlling Layer 3 forwarding tables. Border routers exchange `OPEN`, `KEEPALIVE`, and `UPDATE` messages carrying IP prefixes and `AS_PATH` attributes.",
  },
  facts: [
    { label: "Layer", value: "TCP 179; controls Layer 3 routing" },
    { label: "Peers", value: "Configured neighbors across ASNs" },
    { label: "Global table", value: "Over 950,000 IPv4 routes" },
    { label: "Path choice", value: "Local policy, then shortest AS path" },
    { label: "Defined in", value: "RFC 4271, RFC 6811" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 85, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 245, y: 300 } },
      { id: "isp", kind: "router", label: `ISP AS ${ISP_ASN}`, sublabel: ISP_IP, at: { x: 425, y: 300 } },
      { id: "transit", kind: "router", label: `Transit AS ${TRANSIT_ASN}`, sublabel: TRANSIT_IP, at: { x: 605, y: 300 } },
      { id: "hosting", kind: "router", label: `Host AS ${HOSTING_ASN}`, sublabel: HOSTING_IP, at: { x: 780, y: 300 } },
      { id: "web", kind: "web-server", label: WEB_DOMAIN, sublabel: WEB_SERVER_IP, at: { x: 930, y: 300 } },
    ],
    links: [
      { id: "l-lan", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-isp", from: "router", to: "isp", medium: "fiber" },
      { id: "l-t1", from: "isp", to: "transit", medium: "fiber" },
      { id: "l-t2", from: "transit", to: "hosting", medium: "fiber" },
      { id: "l-host", from: "hosting", to: "web", medium: "ethernet" },
    ],
    start: {
      visible: ["laptop", "router", "isp", "transit", "hosting", "web"],
      focus: ["isp", "transit", "hosting"],
    },
  },
  steps: [
    {
      id: "ases",
      title: "Connect three numbered networks",
      simple:
        "Over 75,000 networks form the internet, each identified by an [[asn|AS number]]: your ISP (`AS 64500`), a transit carrier (`AS 64510`), and `www.example.com`'s host (`AS 64511`).",
      technical:
        "Autonomous Systems operate under independent routing policies. BGP propagates reachability announcements across administrative boundaries.",
      facts: [
        { label: "Your ISP", value: `AS ${ISP_ASN}` },
        { label: "Transit backbone", value: `AS ${TRANSIT_ASN}` },
        { label: "Hosting AS", value: `AS ${HOSTING_ASN}` },
      ],
      events: [
        {
          type: "note",
          id: "note-ases",
          at: "transit",
          text: `AS ${ISP_ASN} <-> AS ${TRANSIT_ASN} <-> AS ${HOSTING_ASN}`,
          tone: "lookup",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "peer-tcp",
      title: "Peer over TCP port 179 (TTL 1)",
      simple:
        "Operators configure peers explicitly rather than discovering them. AS 64500 opens TCP port 179 to AS 64510 with IP `TTL=1` {{bgp-tcp-syn}}, restricting eBGP peering strictly to directly attached links.",
      technical:
        "RFC 4271 sessions connect manually configured IP neighbors on port 179. Setting TTL=1 on single-hop external BGP packets ensures they cannot traverse extra hops.",
      facts: [
        { label: "Port", value: "TCP 179" },
        { label: "Discovery", value: "None (static configuration)" },
        { label: "eBGP safeguard", value: "IP TTL = 1 (direct neighbor)" },
      ],
      events: [
        ...tcpHandshake({
          from: "isp",
          to: "transit",
          srcIp: ISP_IP,
          dstIp: TRANSIT_IP,
          sport: 51179,
          dport: 179,
          startTime: 0.0,
          rtt: 0.008,
          prefix: "bgp-tcp",
        }),
        { type: "wait", ms: 200 },
      ],
    },
    {
      id: "open-keepalive",
      title: "Send OPEN and KEEPALIVE",
      simple:
        "Both routers trade `OPEN` messages naming their ASN, router ID, and 180-second Hold Time {{bgp-open-i}} {{bgp-open-t}}. Exchanging `KEEPALIVE` {{bgp-ka-i}} starts the session, repeating every 60 s.",
      technical:
        "Once `KEEPALIVE` confirms `OPEN` parameters (including 4-octet ASN capability), BGP enters `Established` state. If 180 s elapse without messages, the peer tears down all learned routes.",
      facts: [
        { label: "OPEN fields", value: "My ASN, Hold Time (180 s), ID" },
        { label: "Heartbeat", value: "KEEPALIVE every 60 s" },
        { label: "Timeout", value: "180 s drops session" },
      ],
      events: [
        {
          type: "packet",
          id: "bgp-open-i",
          from: "isp",
          to: "transit",
          tone: "control",
          label: "OPEN (AS 64500)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: ISP_IP, dst: TRANSIT_IP, protocol: "TCP (6)", totalLength: 92, ttl: 1 }),
            tcpLayer({ sport: 51179, dport: 179, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 52 }),
            bgpLayer(`OPEN (AS ${ISP_ASN}, HoldTime 180)`, [{ name: "Capabilities", value: "4-octet ASNs, Route Refresh" }]),
          ],
          capture: {
            time: 0.015,
            src: ISP_IP,
            dst: TRANSIT_IP,
            protocol: "BGP",
            info: `OPEN AS=${ISP_ASN}, HoldTime=180`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 52),
          },
        },
        {
          type: "packet",
          id: "bgp-open-t",
          from: "transit",
          to: "isp",
          tone: "control",
          label: "OPEN (AS 64510)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            ipv4Layer({ src: TRANSIT_IP, dst: ISP_IP, protocol: "TCP (6)", totalLength: 92, ttl: 1 }),
            tcpLayer({ sport: 179, dport: 51179, flags: "PSH, ACK", seq: 1, ack: 53, payloadBytes: 52 }),
            bgpLayer(`OPEN (AS ${TRANSIT_ASN}, HoldTime 180)`, [{ name: "State", value: "OpenConfirm" }]),
          ],
          capture: {
            time: 0.02,
            src: TRANSIT_IP,
            dst: ISP_IP,
            protocol: "BGP",
            info: `OPEN AS=${TRANSIT_ASN}, HoldTime=180`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 52),
          },
        },
        {
          type: "packet",
          id: "bgp-ka-i",
          from: "isp",
          to: "transit",
          tone: "response",
          label: "KEEPALIVE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: ISP_IP, dst: TRANSIT_IP, protocol: "TCP (6)", totalLength: 59, ttl: 1 }),
            tcpLayer({ sport: 51179, dport: 179, flags: "PSH, ACK", seq: 53, ack: 53, payloadBytes: 19 }),
            bgpLayer("KEEPALIVE (19 B header)", [{ name: "State", value: "Session Established" }]),
          ],
          capture: {
            time: 0.024,
            src: ISP_IP,
            dst: TRANSIT_IP,
            protocol: "BGP",
            info: "KEEPALIVE (Session Established)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 19),
          },
        },
        { type: "wait", ms: 200 },
      ],
    },
    {
      id: "announce-prefix",
      title: "Announce prefix 203.0.113.0/24",
      simple:
        "The hosting router tells its transit carrier: reach `203.0.113.0/24` through me {{bgp-upd1}}. Its `UPDATE` lists `AS_PATH: 64511` and sets `NEXT_HOP` to its own peering interface.",
      technical:
        "RFC 4271 §4.3 `UPDATE` carries NLRI prefix `203.0.113.0/24`, mandatory path attributes (`ORIGIN`, `AS_PATH = [64511]`, `NEXT_HOP = 203.0.113.1`).",
      facts: [
        { label: "Prefix", value: "203.0.113.0/24 (256 IPs)" },
        { label: "AS_PATH", value: `${HOSTING_ASN}` },
        { label: "NEXT_HOP", value: HOSTING_IP },
      ],
      events: [
        {
          type: "packet",
          id: "bgp-upd1",
          from: "hosting",
          to: "transit",
          tone: "lookup",
          label: "UPDATE (64511)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: HOSTING_IP, dst: TRANSIT_IP, protocol: "TCP (6)", totalLength: 108, ttl: 1 }),
            tcpLayer({ sport: 52179, dport: 179, flags: "PSH, ACK", seq: 100, ack: 100, payloadBytes: 68 }),
            bgpLayer(`UPDATE: 203.0.113.0/24 AS_PATH=${HOSTING_ASN}`, [
              { name: "NEXT_HOP", value: HOSTING_IP },
              { name: "ORIGIN", value: "IGP" },
            ]),
          ],
          capture: {
            time: 0.05,
            src: HOSTING_IP,
            dst: TRANSIT_IP,
            protocol: "BGP",
            info: `UPDATE 203.0.113.0/24, AS_PATH=${HOSTING_ASN}`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 68),
          },
        },
        { type: "wait", ms: 600 },
      ],
    },
    {
      id: "prepend-propagate",
      title: "Propagate with prepended ASN",
      simple:
        "The transit router accepts the route and forwards it to your ISP, prepending its own ASN (`AS_PATH: 64510 64511`) {{bgp-upd2}}. When offered multiple routes, routers weigh policy first, then shortest `AS_PATH`.",
      technical:
        `Prepending \`${TRANSIT_ASN}\` prevents routing loops (routers reject paths containing their own ASN) and lets AS ${ISP_ASN} evaluate Local Preference before AS-path length.`,
      facts: [
        { label: "AS_PATH", value: `${TRANSIT_ASN} ${HOSTING_ASN}` },
        { label: "NEXT_HOP", value: TRANSIT_IP },
        { label: "Selection order", value: "Business policy, then hop count" },
      ],
      events: [
        {
          type: "packet",
          id: "bgp-upd2",
          from: "transit",
          to: "isp",
          tone: "lookup",
          label: "UPDATE (64510 64511)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            ipv4Layer({ src: TRANSIT_IP, dst: ISP_IP, protocol: "TCP (6)", totalLength: 112, ttl: 1 }),
            tcpLayer({ sport: 179, dport: 51179, flags: "PSH, ACK", seq: 72, ack: 72, payloadBytes: 72 }),
            bgpLayer(`UPDATE: 203.0.113.0/24 AS_PATH=${TRANSIT_ASN} ${HOSTING_ASN}`, [
              { name: "NEXT_HOP", value: TRANSIT_IP },
            ]),
          ],
          capture: {
            time: 0.06,
            src: TRANSIT_IP,
            dst: ISP_IP,
            protocol: "BGP",
            info: `UPDATE 203.0.113.0/24, AS_PATH=${TRANSIT_ASN} ${HOSTING_ASN}`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 72),
          },
        },
        {
          type: "note",
          id: "note-rib",
          at: "isp",
          text: "Installed route: 64510 64511",
          tone: "response",
        },
      ],
    },
    {
      id: "follow-route",
      title: "Forward live packets along route",
      simple:
        "When your laptop sends TCP `SYN` to `203.0.113.10` {{bgp-syn}}, the ISP forwarding table aims it via AS 64510 to AS 64511. Return traffic chooses its own path independently and is often asymmetric {{bgp-synack}}.",
      technical:
        "BGP programs the router FIB (Forwarding Information Base). Forward and reverse paths may cross different transit providers depending on each network's local routing policies.",
      facts: [
        { label: "Destination", value: WEB_SERVER_IP },
        { label: "Forward path", value: `AS ${ISP_ASN} -> ${TRANSIT_ASN} -> ${HOSTING_ASN}` },
        { label: "Return path", value: "Independent (often asymmetric)" },
      ],
      events: [
        { type: "focus", actors: ["laptop", "router", "isp", "transit", "hosting", "web"] },
        {
          type: "packet",
          id: "bgp-syn",
          from: "laptop",
          to: "web",
          via: ["router", "isp", "transit", "hosting"],
          tone: "handshake",
          label: "SYN (FOLLOWS BGP)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 52810, dport: 443, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.1,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: "52810 -> 443 [SYN] (routed AS 64500 -> 64510 -> 64511)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "packet",
          id: "bgp-synack",
          from: "web",
          to: "laptop",
          via: ["hosting", "transit", "isp", "router"],
          tone: "response",
          label: "SYN-ACK",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 443, dport: 52810, flags: "SYN, ACK", seq: 0, ack: 1, optionsBytes: 12 }),
          ],
          capture: {
            time: 0.125,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "TCP",
            info: "443 -> 52810 [SYN, ACK] Seq=0 Ack=1",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
      ],
    },
    {
      id: "withdraw-route",
      title: "Withdraw routes on link failure",
      simple:
        "If an upstream link fails, the origin sends a `WITHDRAW` update for `203.0.113.0/24` {{bgp-wd1}}, propagated across peers within seconds to minutes {{bgp-wd2}} so stale paths vanish worldwide.",
      technical:
        "BGP `UPDATE` Withdrawn Routes fields remove unreachable prefixes globally without scanning every table periodically; dropped sessions purge all learned routes after 180 s.",
      facts: [
        { label: "Withdrawn", value: "203.0.113.0/24" },
        { label: "Convergence", value: "Seconds to minutes globally" },
        { label: "Session drop", value: "Purges all routes from peer" },
      ],
      events: [
        {
          type: "packet",
          id: "bgp-wd1",
          from: "hosting",
          to: "transit",
          tone: "error",
          label: "WITHDRAW",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: HOSTING_IP, dst: TRANSIT_IP, protocol: "TCP (6)", totalLength: 68, ttl: 1 }),
            tcpLayer({ sport: 52179, dport: 179, flags: "PSH, ACK", seq: 168, ack: 100, payloadBytes: 28 }),
            bgpLayer("UPDATE: Withdrawn 203.0.113.0/24", [{ name: "Trigger", value: "Link failure / maintenance" }]),
          ],
          capture: {
            time: 2.0,
            src: HOSTING_IP,
            dst: TRANSIT_IP,
            protocol: "BGP",
            info: "UPDATE Withdrawn Routes: 203.0.113.0/24",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 28),
          },
        },
        {
          type: "packet",
          id: "bgp-wd2",
          from: "transit",
          to: "isp",
          tone: "error",
          label: "WITHDRAW",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            ipv4Layer({ src: TRANSIT_IP, dst: ISP_IP, protocol: "TCP (6)", totalLength: 68, ttl: 1 }),
            tcpLayer({ sport: 179, dport: 51179, flags: "PSH, ACK", seq: 144, ack: 72, payloadBytes: 28 }),
            bgpLayer("UPDATE: Withdrawn 203.0.113.0/24", [{ name: "Action", value: "Purge route from FIB" }]),
          ],
          capture: {
            time: 2.01,
            src: TRANSIT_IP,
            dst: ISP_IP,
            protocol: "BGP",
            info: "UPDATE Withdrawn Routes: 203.0.113.0/24",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 28),
          },
        },
      ],
    },
    {
      id: "rpki-trust",
      title: "Guard against hijacks with RPKI",
      simple:
        "Classic BGP trusts peer claims, so a misconfigured AS announcing someone else's addresses hijacks global traffic. [[rpki|RPKI]] Route Origin Authorizations let validating routers drop unauthorized origins.",
      technical:
        "RFC 6811 matches `UPDATE` `(prefix, origin_AS)` against signed RPKI ROAs, marking hijack or route-leak origins Invalid alongside per-neighbor prefix filters.",
      facts: [
        { label: "Threat", value: "Accidental route leaks & hijacks" },
        { label: "RPKI defense", value: "Cryptographic ROAs bind prefix->AS" },
        { label: "Complements", value: "Strict neighbor IRR prefix filters" },
      ],
      events: [
        {
          type: "note",
          id: "note-rpki",
          at: "transit",
          text: "RPKI checks origin ASN",
          tone: "response",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "Decentralized map built from peers",
    simple:
      "Origin AS 64511 advertised its block, transit AS 64510 prepended its number and passed it on, and AS 64500 routed packets there without any central authority.",
    technical:
      "Demonstrated BGP-4 port 179 peering, UPDATE propagation (`AS_PATH`), packet forwarding, route withdrawal, and RFC 6811 RPKI validation.",
    facts: [
      { label: "Protocol messages", value: "OPEN, KEEPALIVE, UPDATE" },
      { label: "Learned path", value: `${TRANSIT_ASN} ${HOSTING_ASN}` },
      { label: "Architecture", value: "No central routing directory" },
      { label: "Security", value: "RPKI validation + peer filters" },
    ],
  },
  tryIt: [
    {
      title: "Inspect public BGP routing tables (looking glass)",
      explain: "Use `whois` against RADb or Team Cymru to inspect which AS number originates any public IP prefix.",
      commands: [
        { os: "windows", cmd: "nslookup -type=txt 10.113.0.203.origin.asn.cymru.com" },
        { os: "macos", cmd: "dig +short TXT 10.113.0.203.origin.asn.cymru.com" },
        { os: "linux", cmd: "whois -h whois.radb.net 203.0.113.0/24" },
      ],
    },
  ],
});
