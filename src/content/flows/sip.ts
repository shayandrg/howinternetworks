import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import { ALICE_EMAIL, BOB_EMAIL, LAPTOP_IP, LAPTOP_MAC, ROUTER_MAC, ROUTER_WAN_IP, SERVER_MAC } from "../world";

const SIP_PROXY_IP = "203.0.113.50";
const BOB_SIP_IP = "198.51.100.200";
const SIP_PORT = 5060;

function sipLayer(name: string, summary: string, fields: Array<{ name: string; value: string }>) {
  return { name, summary, fields };
}

export const sipFlow = defineFlow({
  meta: {
    slug: "sip",
    kind: "flow",
    collection: "protocols",
    group: "calls",
    title: "SIP",
    fullName: "Session Initiation Protocol",
    tagline: "Setting up internet phone calls and routing RTP voice",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["udp"],
    related: ["webrtc", "rtsp", "udp", "dns"],
    tags: ["sip", "voip", "rtp", "sdp", "invite"],
    sources: [
      {
        label: "RFC 3261: SIP: Session Initiation Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc3261",
      },
      {
        label: "RFC 5621: Message Body Handling in SIP (Proxy Integrity)",
        url: "https://www.rfc-editor.org/rfc/rfc5621",
      },
      {
        label: "RFC 4566: SDP: Session Description Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc4566",
      },
      {
        label: "RFC 3550: RTP: A Transport Protocol for Real-Time Applications",
        url: "https://www.rfc-editor.org/rfc/rfc3550",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[sip|SIP]] starts, manages, and ends internet phone calls. Phones register with their provider, trade `INVITE`, `180 Ringing`, and `200 OK` messages to pick codecs, and then stream voice over [[rtp|RTP]] packets.",
    technical:
      "Session Initiation Protocol (RFC 3261) uses HTTP-like text requests over UDP/TCP port 5060 (or TLS 5061). SIP sets up sessions carrying SDP bodies (RFC 4566); continuous G.711 audio then streams via RTP (RFC 3550).",
  },
  facts: [
    { label: "Layer", value: "Application (UDP/TCP 5060, SIPS 5061)" },
    { label: "Call handshake", value: "INVITE -> 180 -> 200 OK -> ACK" },
    { label: "Audio plane", value: "RTP (G.711, 160 B / 20 ms)" },
    { label: "Proxy vs SBC", value: "Proxy adds Via; SBC relays media" },
    { label: "Defined in", value: "RFC 3261, RFC 5621, RFC 3550" },
  ],
  scene: {
    actors: [
      { id: "alice", kind: "laptop", label: "Alice's phone", sublabel: LAPTOP_IP, at: { x: 100, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_WAN_IP, at: { x: 310, y: 300 } },
      { id: "proxy", kind: "proxy", label: "SIP proxy + SBC", sublabel: SIP_PROXY_IP, at: { x: 600, y: 300 } },
      { id: "bob", kind: "phone", label: "Bob's phone", sublabel: BOB_SIP_IP, at: { x: 890, y: 300 } },
    ],
    links: [
      { id: "l-lan", from: "alice", to: "router", medium: "wifi" },
      { id: "l-prx", from: "router", to: "proxy", medium: "fiber" },
      { id: "l-bob", from: "proxy", to: "bob", medium: "internet" },
    ],
    start: {
      visible: ["alice", "router", "proxy", "bob"],
      focus: ["alice", "router", "proxy", "bob"],
    },
  },
  steps: [
    {
      id: "register",
      title: "Register phone location with 401",
      simple:
        "Alice's SIP app sends `REGISTER` to UDP 5060 {{sip-reg1}}. The server challenges with `401 Unauthorized` {{sip-401}}; Alice answers with a Digest hash (hiding her password) and receives `200 OK` for 3,600 s {{sip-reg2}}.",
      technical:
        "RFC 3261 §10 binds `sip:alice@example.com` to Alice's contact URI for 3,600 s using HTTP Digest challenge-response without transmitting the password.",
      facts: [
        { label: "Port", value: "UDP 5060" },
        { label: "Auth", value: "Digest MD5 nonce hash" },
        { label: "Registration TTL", value: "3,600 seconds" },
      ],
      events: [
        {
          type: "packet",
          id: "sip-reg1",
          from: "alice",
          to: "proxy",
          via: ["router"],
          tone: "request",
          label: "REGISTER",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SIP_PROXY_IP, protocol: "UDP (17)", totalLength: 340 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 320 }),
            sipLayer("SIP", `REGISTER sip:example.com (${ALICE_EMAIL})`, [{ name: "Expires", value: "3600" }]),
          ],
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: SIP_PROXY_IP,
            protocol: "SIP",
            info: `REGISTER sip:example.com`,
            bytes: padFrameBytes(14 + 340),
          },
        },
        {
          type: "packet",
          id: "sip-401",
          from: "proxy",
          to: "alice",
          via: ["router"],
          tone: "control",
          label: "401 CHALLENGE",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SIP_PROXY_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: 390 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 370 }),
            sipLayer("SIP", "401 Unauthorized (WWW-Authenticate nonce)", [{ name: "Challenge", value: "Digest nonce" }]),
          ],
          capture: {
            time: 0.015,
            src: SIP_PROXY_IP,
            dst: LAPTOP_IP,
            protocol: "SIP",
            info: "401 Unauthorized (Digest nonce)",
            bytes: padFrameBytes(14 + 390),
          },
        },
        {
          type: "packet",
          id: "sip-reg2",
          from: "alice",
          to: "proxy",
          via: ["router"],
          tone: "response",
          label: "REGISTER -> 200 OK",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SIP_PROXY_IP, protocol: "UDP (17)", totalLength: 420 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 400 }),
            sipLayer("SIP", "REGISTER with Digest hash -> 200 OK", [{ name: "Status", value: "Registered 3600 s" }]),
          ],
          capture: {
            time: 0.02,
            src: LAPTOP_IP,
            dst: SIP_PROXY_IP,
            protocol: "SIP",
            info: "REGISTER (Digest hash) -> 200 OK",
            bytes: padFrameBytes(14 + 420),
          },
        },
      ],
    },
    {
      id: "invite",
      title: "Send INVITE via proxy and SBC",
      simple:
        "Alice invites `bob@example.net` with G.711 SDP {{sip-inv1}}. An RFC 3261 proxy adds `Via` & `Record-Route` untouched; a paired SBC rewrites SDP to relay ports `40000`/`40002` {{sip-inv2}}.",
      technical:
        "RFC 3261/RFC 5621 proxies do not modify message bodies. Providers pair a Session Border Controller (SBC) B2BUA to anchor SDP RTP media (`40000`/`40002`) so NAT firewalls allow voice through.",
      facts: [
        { label: "Target", value: `sip:${BOB_EMAIL}` },
        { label: "Proxy headers", value: "Via + Record-Route added" },
        { label: "SBC role", value: "Rewrites SDP IP/port for NAT relay" },
      ],
      events: [
        {
          type: "packet",
          id: "sip-inv1",
          from: "alice",
          to: "proxy",
          via: ["router"],
          tone: "request",
          label: "INVITE (SDP G.711)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SIP_PROXY_IP, protocol: "UDP (17)", totalLength: 620 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 600 }),
            sipLayer("SIP + SDP", `INVITE sip:${BOB_EMAIL} (G.711 port 49170)`, [
              { name: "Codec", value: "PCMU (G.711, 64 kb/s)" },
            ]),
          ],
          capture: {
            time: 0.05,
            src: LAPTOP_IP,
            dst: SIP_PROXY_IP,
            protocol: "SIP/SDP",
            info: `INVITE sip:${BOB_EMAIL} (SDP port 49170)`,
            bytes: padFrameBytes(14 + 620),
          },
        },
        {
          type: "packet",
          id: "sip-inv2",
          from: "proxy",
          to: "bob",
          tone: "request",
          label: "INVITE (+SBC SDP)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: SIP_PROXY_IP, dst: BOB_SIP_IP, protocol: "UDP (17)", totalLength: 710 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 690 }),
            sipLayer("SIP + SDP", `INVITE (Via + Record-Route; SBC media :40000)`, [
              { name: "Proxy rules", value: "RFC 3261 Via/Record-Route" },
              { name: "SBC relay", value: "Anchors RTP at port 40000" },
            ]),
          ],
          capture: {
            time: 0.06,
            src: SIP_PROXY_IP,
            dst: BOB_SIP_IP,
            protocol: "SIP/SDP",
            info: `INVITE sip:${BOB_EMAIL} (SBC relay :40000)`,
            bytes: padFrameBytes(14 + 710),
          },
        },
      ],
    },
    {
      id: "ringing",
      title: "Trace 180 Ringing back via Via",
      simple:
        "Bob's phone rings and returns `180 Ringing` {{sip-180a}}. Each hop follows the stack of `Via` headers in reverse, removing its own `Via` before forwarding to Alice {{sip-180b}} so Alice hears the ringback tone.",
      technical:
        "SIP responses navigate backward solely using top `Via` headers stamped on the incoming `INVITE`, requiring no routing table lookup.",
      facts: [
        { label: "Status", value: "180 Ringing" },
        { label: "Reverse routing", value: "Pops top Via header per hop" },
        { label: "Alice hears", value: "Local ringback tone" },
      ],
      events: [
        {
          type: "packet",
          id: "sip-180a",
          from: "bob",
          to: "proxy",
          tone: "control",
          label: "180 RINGING",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            ipv4Layer({ src: BOB_SIP_IP, dst: SIP_PROXY_IP, protocol: "UDP (17)", totalLength: 320 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 300 }),
            sipLayer("SIP", "180 Ringing (Via proxy -> Alice)", [{ name: "Top Via", value: SIP_PROXY_IP }]),
          ],
          capture: {
            time: 0.1,
            src: BOB_SIP_IP,
            dst: SIP_PROXY_IP,
            protocol: "SIP",
            info: "Status: 180 Ringing",
            bytes: padFrameBytes(14 + 320),
          },
        },
        {
          type: "packet",
          id: "sip-180b",
          from: "proxy",
          to: "alice",
          via: ["router"],
          tone: "control",
          label: "180 RINGING",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SIP_PROXY_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: 290 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 270 }),
            sipLayer("SIP", "180 Ringing (forwarded to Alice)", [{ name: "UI", value: "Play ringback audio" }]),
          ],
          capture: {
            time: 0.115,
            src: SIP_PROXY_IP,
            dst: LAPTOP_IP,
            protocol: "SIP",
            info: "Status: 180 Ringing",
            bytes: padFrameBytes(14 + 290),
          },
        },
      ],
    },
    {
      id: "answer-ack",
      title: "Pick up with 200 OK and ACK",
      simple:
        "When Bob answers, his phone sends `200 OK` with its G.711 SDP (SBC sets media relay port `40002`) {{sip-200}}. Alice sends `ACK` back across the SIP path to finalize call setup {{sip-ack}}.",
      technical:
        "RFC 3261 uses a 3-way `INVITE -> 200 OK -> ACK` handshake so unreliable UDP retries cannot start voice unacknowledged.",
      facts: [
        { label: "Bob SDP codec", value: "G.711 PCMU" },
        { label: "SBC relay ports", value: "40000 (Bob) / 40002 (Alice)" },
        { label: "Confirmed by", value: "ACK request" },
      ],
      events: [
        {
          type: "packet",
          id: "sip-200",
          from: "bob",
          to: "alice",
          via: ["proxy", "router"],
          tone: "response",
          label: "200 OK (ANSWER)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_SIP_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: 640 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 620 }),
            sipLayer("SIP/SDP", "200 OK (Call answered, G.711 SDP)", [{ name: "Relay port", value: "40002" }]),
          ],
          capture: {
            time: 1.5,
            src: BOB_SIP_IP,
            dst: LAPTOP_IP,
            protocol: "SIP/SDP",
            info: "Status: 200 OK (with SDP answer)",
            bytes: padFrameBytes(14 + 640),
          },
        },
        {
          type: "packet",
          id: "sip-ack",
          from: "alice",
          to: "bob",
          via: ["router", "proxy"],
          tone: "handshake",
          label: "ACK",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_SIP_IP, protocol: "UDP (17)", totalLength: 310 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 290 }),
            sipLayer("SIP", `ACK sip:${BOB_EMAIL}`, [{ name: "Dialog", value: "Call established" }]),
          ],
          capture: {
            time: 1.52,
            src: LAPTOP_IP,
            dst: BOB_SIP_IP,
            protocol: "SIP",
            info: `ACK sip:${BOB_EMAIL}`,
            bytes: padFrameBytes(14 + 310),
          },
        },
      ],
    },
    {
      id: "rtp-voice",
      title: "Stream G.711 voice via RTP",
      simple:
        "Every 20 ms each phone emits an [[rtp|RTP]] UDP datagram holding 160 bytes of G.711 audio, sequence number, and timestamp {{sip-rtp-a}} {{sip-rtp-b}}. SIP itself sits quiet until someone hangs up.",
      technical:
        "RFC 3550 RTP carries 50 audio packets/second (160 samples at 8 kHz = 64 kb/s) through the media relay; RTP flows independently of SIP signaling.",
      facts: [
        { label: "Packet rate", value: "50 packets/s (every 20 ms)" },
        { label: "Audio payload", value: "160 B G.711 PCMU" },
        { label: "SIP traffic", value: "Idle while talking" },
      ],
      events: [
        {
          type: "packet",
          id: "sip-rtp-a",
          from: "alice",
          to: "bob",
          via: ["router", "proxy"],
          tone: "data",
          label: "RTP VOICE (160 B)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SIP_PROXY_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 172 }),
            udpLayer({ sport: 49170, dport: 40002, length: UDP_HEADER + 172 }),
            sipLayer("RTP (PT=0 PCMU)", "Seq=1001, TS=160 (160 B audio)", [{ name: "Header + audio", value: "12 B RTP + 160 B G.711" }]),
          ],
          capture: {
            time: 1.54,
            src: LAPTOP_IP,
            dst: SIP_PROXY_IP,
            protocol: "RTP",
            info: "PT=ITU-T G.711 PCMU, Seq=1001, 160 B",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 172),
          },
        },
        {
          type: "packet",
          id: "sip-rtp-b",
          from: "bob",
          to: "alice",
          via: ["proxy", "router"],
          tone: "data",
          label: "RTP VOICE (160 B)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_SIP_IP, dst: SIP_PROXY_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 172 }),
            udpLayer({ sport: 49172, dport: 40000, length: UDP_HEADER + 172 }),
            sipLayer("RTP (PT=0 PCMU)", "Seq=4201, TS=160 (160 B audio)", [{ name: "Cadence", value: "20 ms intervals" }]),
          ],
          capture: {
            time: 1.555,
            src: BOB_SIP_IP,
            dst: LAPTOP_IP,
            protocol: "RTP",
            info: "PT=ITU-T G.711 PCMU, Seq=4201, 160 B",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 172),
          },
        },
      ],
    },
    {
      id: "bye",
      title: "Hang up with BYE and 200 OK",
      simple:
        "Bob hangs up by sending `BYE` along the `Record-Route` path {{sip-bye}}, and Alice returns `200 OK` {{sip-bye-ok}}. Both phones immediately cease sending RTP packets.",
      technical:
        "In-dialog `BYE` closes the SIP session cleanly. Note that classic UDP 5060 SIP + RTP is unencrypted; enterprise VoIP uses SIPS (TLS 5061) plus SRTP.",
      facts: [
        { label: "Teardown", value: "BYE -> 200 OK" },
        { label: "Route", value: "Follows Record-Route proxy path" },
        { label: "Encryption option", value: "SIPS (TLS) + SRTP" },
      ],
      events: [
        {
          type: "packet",
          id: "sip-bye",
          from: "bob",
          to: "alice",
          via: ["proxy", "router"],
          tone: "control",
          label: "BYE",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: BOB_SIP_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: 280 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 260 }),
            sipLayer("SIP", `BYE sip:${ALICE_EMAIL}`, [{ name: "Dialog", value: "End call" }]),
          ],
          capture: {
            time: 15.0,
            src: BOB_SIP_IP,
            dst: LAPTOP_IP,
            protocol: "SIP",
            info: `BYE sip:${ALICE_EMAIL}`,
            bytes: padFrameBytes(14 + 280),
          },
        },
        {
          type: "packet",
          id: "sip-bye-ok",
          from: "alice",
          to: "bob",
          via: ["router", "proxy"],
          tone: "response",
          label: "200 OK (ENDED)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: BOB_SIP_IP, protocol: "UDP (17)", totalLength: 250 }),
            udpLayer({ sport: SIP_PORT, dport: SIP_PORT, length: 230 }),
            sipLayer("SIP", "200 OK (BYE acknowledged)", [{ name: "Media", value: "RTP stopped" }]),
          ],
          capture: {
            time: 15.02,
            src: LAPTOP_IP,
            dst: BOB_SIP_IP,
            protocol: "SIP",
            info: "Status: 200 OK (Call terminated)",
            bytes: padFrameBytes(14 + 250),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Signaling set up the call; RTP carried voice",
    simple:
      "Alice's phone signed in without exposing its password, invited Bob through the provider's SIP proxy and SBC relay, heard it ring, and exchanged 20 ms RTP audio packets until BYE ended the session.",
    technical:
      "Completed RFC 3261 Digest registration, INVITE/180/200/ACK signaling with SBC NAT media anchoring, G.711 RTP audio streaming, and BYE teardown.",
    facts: [
      { label: "Core methods", value: "REGISTER, INVITE, ACK, BYE" },
      { label: "Audio stream", value: "50 RTP packets/s each way" },
      { label: "NAT helper", value: "SBC media relay (ports 40000/40002)" },
      { label: "Encrypted upgrade", value: "SIPS (TLS 5061) + SRTP" },
    ],
  },
  tryIt: [
    {
      title: "Send an unauthenticated SIP OPTIONS ping",
      explain: "Tools like `sngrep` or `sipsak` let network engineers inspect live SIP signaling messages on port 5060.",
      commands: [
        { os: "windows", cmd: "Test-NetConnection -ComputerName sip.example.net -Port 5061" },
        { os: "macos", cmd: "nc -zv sip.example.net 5061" },
        { os: "linux", cmd: "sipsak -vv -s sip:example.net" },
      ],
    },
  ],
});
