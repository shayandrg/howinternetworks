import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, ROUTER_WAN_IP, SERVER_MAC, WEB_SERVER_IP } from "../world";

const BNG_IP = "198.51.100.1";
const SESSION_ID = "0x2f1c";

function pppoeLayer(name: string, summary: string, fields: Array<{ name: string; value: string }>) {
  return { name, summary, fields };
}

export const pppoeFlow = defineFlow({
  meta: {
    slug: "pppoe",
    kind: "flow",
    collection: "protocols",
    group: "joining",
    title: "PPPoE",
    fullName: "Point-to-Point Protocol over Ethernet",
    tagline: "Broadband router login, session framing, and 1,492-byte MTU",
    layer: { tcpip: "link", osi: 2 },
    prerequisites: ["ethernet"],
    related: ["ethernet", "radius", "ip", "dhcp"],
    tags: ["pppoe", "broadband", "chap", "mtu", "isp"],
    sources: [
      {
        label: "RFC 2516: A Method for Transmitting PPP Over Ethernet (PPPoE)",
        url: "https://www.rfc-editor.org/rfc/rfc2516",
      },
      {
        label: "RFC 1661: The Point-to-Point Protocol (PPP)",
        url: "https://www.rfc-editor.org/rfc/rfc1661",
      },
      {
        label: "RFC 1994: PPP Challenge Handshake Authentication Protocol (CHAP)",
        url: "https://www.rfc-editor.org/rfc/rfc1994",
      },
      {
        label: "RFC 1332: The PPP Internet Protocol Control Protocol (IPCP)",
        url: "https://www.rfc-editor.org/rfc/rfc1332",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "Many fiber and DSL providers require home routers to sign in before routing traffic. [[pppoe|PPPoE]] discovers an ISP access server, opens a numbered session, checks login credentials, and issues your public IPv4 address.",
    technical:
      "Defined in RFC 2516, PPPoE runs Discovery (`0x8863`) to obtain a 16-bit Session ID, then wraps RFC 1661 PPP (LCP, CHAP RFC 1994, IPCP RFC 1332) inside Ethernet (`0x8864`), leaving an 8-byte header and 1,492-byte MTU.",
  },
  facts: [
    { label: "Layer", value: "Link (EtherTypes 0x8863 / 0x8864)" },
    { label: "Discovery", value: "PADI -> PADO -> PADR -> PADS" },
    { label: "Authentication", value: "CHAP (MD5 hash) or PAP" },
    { label: "Address setup", value: "IPCP assigns WAN IP & DNS" },
    { label: "Defined in", value: "RFC 2516, RFC 1661, RFC 1994, RFC 1332" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 130, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 470, y: 300 } },
      { id: "bng", kind: "server", label: "bng-1.example.net", sublabel: BNG_IP, at: { x: 850, y: 300 } },
    ],
    links: [
      { id: "l-lan", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-wan", from: "router", to: "bng", medium: "fiber" },
    ],
    start: {
      visible: ["laptop", "router", "bng"],
      focus: ["router", "bng"],
    },
  },
  steps: [
    {
      id: "discovery",
      title: "Find server via PADI and PADO",
      simple:
        "Plugged into the ISP line, your router broadcasts `PADI` over EtherType `0x8863` asking for an access server {{pppoe-padi}}. `bng-1.example.net` answers with a `PADO` offer {{pppoe-pado}}.",
      technical:
        "RFC 2516 Discovery begins with broadcast `PADI`; Broadband Network Gateways respond with unicast `PADO` naming Service-Name and AC-Cookie tags.",
      facts: [
        { label: "Initiation", value: "PADI (to ff:ff:ff:ff:ff:ff)" },
        { label: "Offer", value: "PADO from bng-1.example.net" },
        { label: "EtherType", value: "0x8863 (PPPoE Discovery)" },
      ],
      events: [
        {
          type: "packet",
          id: "pppoe-padi",
          from: "router",
          to: "bng",
          tone: "lookup",
          label: "PADI",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: "ff:ff:ff:ff:ff:ff" }),
            pppoeLayer("PPPoE Discovery (0x8863)", "PADI (Active Discovery Initiation)", [
              { name: "Session ID", value: "0x0000 (broadcast)" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: ROUTER_MAC,
            dst: "ff:ff:ff:ff:ff:ff",
            protocol: "PPPoED",
            info: "PPPoE Active Discovery Initiation (PADI)",
            bytes: 60,
          },
        },
        {
          type: "packet",
          id: "pppoe-pado",
          from: "bng",
          to: "router",
          tone: "response",
          label: "PADO",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            pppoeLayer("PPPoE Discovery (0x8863)", "PADO from bng-1.example.net", [
              { name: "AC-Name", value: "bng-1.example.net" },
            ]),
          ],
          capture: {
            time: 0.006,
            src: SERVER_MAC,
            dst: ROUTER_MAC,
            protocol: "PPPoED",
            info: "PPPoE Active Discovery Offer (PADO)",
            bytes: 84,
          },
        },
      ],
    },
    {
      id: "session-id",
      title: "Claim Session ID (PADR/PADS)",
      simple:
        "The router picks the offer by sending `PADR` {{pppoe-padr}}, and the access server replies `PADS` assigning Session ID `0x2f1c` {{pppoe-pads}}. Every data frame on this line now carries `0x2f1c`.",
      technical:
        `\`PADS\` locks in Session ID \`${SESSION_ID}\`; EtherType transitions from \`0x8863\` to \`0x8864\` (PPPoE Session Stage).`,
      facts: [
        { label: "Request / Confirm", value: "PADR -> PADS" },
        { label: "Session ID", value: SESSION_ID },
        { label: "Session EtherType", value: "0x8864" },
      ],
      events: [
        {
          type: "packet",
          id: "pppoe-padr",
          from: "router",
          to: "bng",
          tone: "request",
          label: "PADR",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            pppoeLayer("PPPoE Discovery", "PADR (Request session + echo cookie)", [{ name: "AC-Cookie", value: "Echoed back" }]),
          ],
          capture: {
            time: 0.01,
            src: ROUTER_MAC,
            dst: SERVER_MAC,
            protocol: "PPPoED",
            info: "PPPoE Active Discovery Request (PADR)",
            bytes: 72,
          },
        },
        {
          type: "packet",
          id: "pppoe-pads",
          from: "bng",
          to: "router",
          tone: "response",
          label: `PADS (${SESSION_ID})`,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            pppoeLayer("PPPoE Discovery", `PADS Session ID=${SESSION_ID}`, [{ name: "Assigned ID", value: SESSION_ID }]),
          ],
          capture: {
            time: 0.016,
            src: SERVER_MAC,
            dst: ROUTER_MAC,
            protocol: "PPPoED",
            info: `PPPoE Session Confirmation (PADS, ID=${SESSION_ID})`,
            bytes: 60,
          },
        },
      ],
    },
    {
      id: "lcp-chap",
      title: "Negotiate 1,492 B MRU and CHAP",
      simple:
        "Inside PPP LCP, peers set a 1,492 B limit (8 B PPPoE fits in 1,500 B Ethernet) and CHAP login {{pppoe-lcp}}. CHAP sends salted MD5 proofs instead of clear passwords {{pppoe-chap}}.",
      technical:
        "LCP (RFC 1661) negotiates `MRU = 1492`, a loop-detection number (option 5), and `Auth-Proto = CHAP (0xc223)`. The ISP BNG verifies the CHAP MD5 response (RFC 1994) against backend RADIUS {{pppoe-chap-ok}}.",
      facts: [
        { label: "Max packet (MRU)", value: "1,492 bytes (1500 - 8 B overhead)" },
        { label: "Username", value: "alex@fiber.example" },
        { label: "Credential check", value: "CHAP Challenge/Response -> RADIUS" },
      ],
      events: [
        {
          type: "packet",
          id: "pppoe-lcp",
          from: "bng",
          to: "router",
          tone: "control",
          label: "LCP (MRU 1492, CHAP)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            pppoeLayer("PPP LCP (0xc021)", "Configure-Request / Ack (MRU=1492, Auth=CHAP)", [
              { name: "Overhead", value: "6 B PPPoE + 2 B PPP = 8 B" },
            ]),
          ],
          capture: {
            time: 0.022,
            src: SERVER_MAC,
            dst: ROUTER_MAC,
            protocol: "PPP LCP",
            info: "Configure-Request / Ack (MRU=1492, CHAP-MD5)",
            bytes: 60,
          },
        },
        {
          type: "packet",
          id: "pppoe-chap",
          from: "router",
          to: "bng",
          tone: "secure",
          label: "CHAP RESPONSE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            pppoeLayer("PPP CHAP (0xc223)", "Response MD5(id + secret + challenge)", [
              { name: "User", value: "alex@fiber.example" },
            ]),
          ],
          capture: {
            time: 0.03,
            src: ROUTER_MAC,
            dst: SERVER_MAC,
            protocol: "CHAP",
            info: "CHAP Response (user=alex@fiber.example)",
            bytes: 74,
          },
        },
        {
          type: "packet",
          id: "pppoe-chap-ok",
          from: "bng",
          to: "router",
          tone: "response",
          label: "CHAP SUCCESS",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            pppoeLayer("PPP CHAP (0xc223)", "Success (RADIUS approved)", [{ name: "Status", value: "Authenticated" }]),
          ],
          capture: {
            time: 0.04,
            src: SERVER_MAC,
            dst: ROUTER_MAC,
            protocol: "CHAP",
            info: "CHAP Success (verified with RADIUS)",
            bytes: 60,
          },
        },
      ],
    },
    {
      id: "ipcp",
      title: "Assign public IPv4 via IPCP",
      simple:
        "Now IPCP runs: the router proposes `0.0.0.0`, the ISP rejects that with `Config-Nak` offering `198.51.100.7` plus DNS IPs {{pppoe-nak}}, and a matching follow-up gets `Config-Ack` {{pppoe-ack}}.",
      technical:
        `RFC 1332 IPCP assigns point-to-point gateway \`${BNG_IP}\`, router WAN IP \`${ROUTER_WAN_IP}\`, and Primary/Secondary DNS options via Request/Nak/Request/Ack.`,
      facts: [
        { label: "Assigned WAN IP", value: ROUTER_WAN_IP },
        { label: "ISP peer IP", value: BNG_IP },
        { label: "DNS servers", value: "192.0.2.53, 192.0.2.54" },
      ],
      events: [
        {
          type: "packet",
          id: "pppoe-nak",
          from: "bng",
          to: "router",
          tone: "control",
          label: `IPCP NAK (${ROUTER_WAN_IP})`,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            pppoeLayer("PPP IPCP (0x8021)", `Configure-Nak: use ${ROUTER_WAN_IP} + DNS`, [
              { name: "DNS 1 / DNS 2", value: "192.0.2.53 / 192.0.2.54" },
            ]),
          ],
          capture: {
            time: 0.05,
            src: SERVER_MAC,
            dst: ROUTER_MAC,
            protocol: "IPCP",
            info: `IPCP Configure-Nak (assign ${ROUTER_WAN_IP})`,
            bytes: 60,
          },
        },
        {
          type: "packet",
          id: "pppoe-ack",
          from: "bng",
          to: "router",
          tone: "response",
          label: "IPCP ACK",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            pppoeLayer("PPP IPCP (0x8021)", `Configure-Ack (${ROUTER_WAN_IP} live)`, [{ name: "State", value: "Network layer up" }]),
          ],
          capture: {
            time: 0.058,
            src: SERVER_MAC,
            dst: ROUTER_MAC,
            protocol: "IPCP",
            info: `IPCP Configure-Ack (${ROUTER_WAN_IP})`,
            bytes: 60,
          },
        },
      ],
    },
    {
      id: "mss-clamping",
      title: "Clamp TCP MSS to 1,452 bytes",
      simple:
        "When your laptop sends a TCP `SYN` with `MSS=1460` {{pppoe-lan-syn}}, your router applies NAT, wraps it in the 8-byte PPPoE `0x2f1c` header, and clamps `MSS=1452` so remote replies fit in 1,492 bytes {{pppoe-wan-syn}}.",
      technical:
        `Reducing advertised TCP MSS from \`1460\` to \`1452\` (\`1492 - 20 IP - 20 TCP\`) prevents path-MTU blackholes across the ${SESSION_ID} PPPoE link.`,
      facts: [
        { label: "Overhead", value: "6 B PPPoE + 2 B PPP = 8 B" },
        { label: "MTU", value: "1,492 bytes" },
        { label: "TCP MSS clamp", value: "1460 -> 1452 bytes" },
      ],
      events: [
        { type: "focus", actors: ["laptop", "router", "bng"] },
        {
          type: "packet",
          id: "pppoe-lan-syn",
          from: "laptop",
          to: "router",
          tone: "handshake",
          label: "SYN (MSS=1460)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 10, dport: 443, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12, optionsNote: "MSS=1460" }),
          ],
          capture: {
            time: 0.1,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "TCP",
            info: `${EPHEMERAL_PORT_START + 10} -> 443 [SYN] MSS=1460`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
        {
          type: "packet",
          id: "pppoe-wan-syn",
          from: "router",
          to: "bng",
          tone: "data",
          label: `PPPoE ${SESSION_ID} (MSS 1452)`,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            pppoeLayer("PPPoE Session (0x8864)", `Session ${SESSION_ID}, PPP=0x0021 (IPv4)`, [{ name: "Header", value: "8 bytes" }]),
            ipv4Layer({ src: ROUTER_WAN_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: 40112, dport: 443, flags: "SYN", seq: 0, ack: 0, optionsBytes: 12, optionsNote: "MSS clamped to 1452" }),
          ],
          capture: {
            time: 0.102,
            src: ROUTER_WAN_IP,
            dst: WEB_SERVER_IP,
            protocol: "PPPoES",
            info: `PPPoE ${SESSION_ID}: 40112 -> 443 [SYN] MSS=1452`,
            bytes: padFrameBytes(14 + 8 + IPV4_HEADER + TCP_BASE_HEADER + 12),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Logged in with a PPPoE broadband session",
    simple:
      "Your router found the ISP access server, locked in Session ID 0x2f1c, logged in via CHAP, received its public IP via IPCP, and clamped TCP MSS to keep frames inside 1,492 bytes.",
    technical:
      "RFC 2516 discovery/session framing + RFC 1661 LCP + RFC 1994 CHAP + RFC 1332 IPCP provisioned WAN access until closed by PADT.",
    facts: [
      { label: "Session ID", value: SESSION_ID },
      { label: "Password on wire", value: "Never (CHAP hash)" },
      { label: "Assigned WAN IP", value: ROUTER_WAN_IP },
      { label: "Overhead", value: "8 B per packet (MTU 1,492)" },
    ],
  },
  tryIt: [
    {
      title: "Check interface MTU on a PPPoE connection",
      explain: "Look for a 1492 MTU on PPP/PPPoE WAN interfaces versus standard 1500 on Ethernet.",
      commands: [
        { os: "windows", cmd: "netsh interface ipv4 show subinterfaces" },
        { os: "macos", cmd: "ifconfig ppp0" },
        { os: "linux", cmd: "ip link show | grep mtu" },
      ],
    },
  ],
});
