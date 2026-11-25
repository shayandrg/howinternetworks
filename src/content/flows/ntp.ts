import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import { LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const NTP_SERVER_IP = "203.0.113.123"; // RFC 5737 TEST-NET-3

function ntpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "NTP", summary, fields };
}

export const ntpFlow = defineFlow({
  meta: {
    slug: "ntp",
    kind: "flow",
    collection: "protocols",
    group: "names",
    title: "NTP",
    fullName: "Network Time Protocol",
    tagline: "Synchronizing computer clocks across the network",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["udp"],
    related: ["udp", "tls", "dhcp"],
    tags: ["ntp", "clock", "timestamps", "udp", "time"],
    sources: [
      {
        label: "RFC 5905: Network Time Protocol Version 4",
        url: "https://www.rfc-editor.org/rfc/rfc5905",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "Quartz crystals inside computers slowly drift, yet [[tls|TLS]] certificates, logins, and logs rely on accurate time. [[ntp|NTP]] measures clock offset and round-trip latency from just one UDP request and reply carrying four timestamps.",
    technical:
      "Network Time Protocol (RFC 5905) uses 48-byte datagrams over [[udp|UDP]] port 123. Over the open internet NTP reaches tens of milliseconds of accuracy (often sub-millisecond on a LAN), adjusting local clocks smoothly.",
  },
  facts: [
    { label: "Layer", value: "Application (UDP port 123)" },
    { label: "Packet size", value: "48 bytes" },
    { label: "Timestamps", value: "T1, T2, T3, T4" },
    { label: "Accuracy", value: "Tens of ms online; <1 ms on LAN" },
    { label: "Defined in", value: "RFC 5905" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "ntp", kind: "server", label: "time.example.net", sublabel: NTP_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "ntp", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "drift",
      title: "Notice a quarter-second drift",
      simple:
        "Hardware quartz oscillators drift by seconds per week. This laptop's clock is running 0.250 seconds behind true time, so it contacts `time.example.net` after resolving its IP.",
      technical:
        "Left unsynchronized, crystal drift breaks certificate validity checks, authentication tokens, and distributed log ordering.",
      facts: [
        { label: "Local error", value: "0.250 s behind" },
        { label: "Time server", value: "time.example.net (Stratum 2)" },
        { label: "Risk of drift", value: "Auth failures and skewed logs" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "ntp"] },
            { type: "focus", actors: ["laptop", "router", "internet", "ntp"] },
          ],
        },
        {
          type: "note",
          id: "note-slow",
          at: "laptop",
          text: "Local clock 0.250 s slow",
          tone: "error",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "request",
      title: "Record T1 when request leaves",
      simple:
        "The laptop sends a 48-byte NTP client packet to UDP port 123 {{ntp-req}}, stamping its own current Transmit time (`T1 = 09:40:59.750`) and leaving the remaining timestamps blank.",
      technical:
        "Mode 3 (client) sends 48 octets to UDP 123 with Transmit Timestamp `T1` encoded as 64-bit NTP epoch seconds + fraction.",
      facts: [
        { label: "T1 (origin)", value: "09:40:59.750000" },
        { label: "NTP mode", value: "Mode 3 (client), Version 4" },
        { label: "UDP payload", value: "48 bytes" },
      ],
      events: [
        {
          type: "packet",
          id: "ntp-req",
          from: "laptop",
          to: "ntp",
          via: ["router", "internet"],
          tone: "request",
          label: "NTP REQUEST (T1)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: NTP_SERVER_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 48 }),
            udpLayer({ sport: 123, dport: 123, length: UDP_HEADER + 48 }),
            ntpLayer("Client (Mode 3), T1 = 09:40:59.750000", [
              { name: "Transmit T1", value: "09:40:59.750000 (laptop clock)" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: NTP_SERVER_IP,
            protocol: "NTP",
            info: "NTP Version 4, client (T1=09:40:59.750)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 48),
          },
        },
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "response",
      title: "Stamp T2 and T3 at the server",
      simple:
        "The [[stratum]]-2 server echoes `T1` and fills in when it arrived (`T2`) and when the reply left (`T3`) by its own clock {{ntp-res}}. On receipt, the laptop reads `T4` from its clock.",
      technical:
        "Mode 4 (server) echoes `T1` as Origin Timestamp alongside Receive (`T2 = 09:41:00.012000`) and Transmit (`T3 = 09:41:00.012100`); arrival captures `T4 = 09:40:59.774100`.",
      facts: [
        { label: "T2 / T3 (server)", value: "09:41:00.012000 / .012100" },
        { label: "T4 (laptop)", value: "09:40:59.774100" },
        { label: "Server tier", value: "Stratum 2 (synced to Stratum 1)" },
      ],
      events: [
        {
          type: "packet",
          id: "ntp-res",
          from: "ntp",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "NTP REPLY (T2, T3)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: NTP_SERVER_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 48 }),
            udpLayer({ sport: 123, dport: 123, length: UDP_HEADER + 48 }),
            ntpLayer("Server (Mode 4), Stratum 2, T2/T3 stamped", [
              { name: "Origin T1", value: "09:40:59.750000" },
              { name: "Receive T2", value: "09:41:00.012000" },
              { name: "Transmit T3", value: "09:41:00.012100" },
            ]),
          ],
          capture: {
            time: 0.012,
            src: NTP_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "NTP",
            info: "NTP Version 4, server Stratum 2 (T2, T3)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 48),
          },
        },
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "math",
      title: "Compute round trip and offset",
      simple:
        "From `T1..T4`, network round-trip delay is `(T4 - T1) - (T3 - T2) = 24.0 ms`. Assuming equal travel time each way, clock offset is `((T2 - T1) + (T3 - T4)) / 2 = +250.0 ms`.",
      technical:
        "RFC 5905 §8 equations compute `delta = 24.0 ms` and `theta = +0.250 s`. Path asymmetry limits absolute internet accuracy to half the difference between forward and reverse delays.",
      facts: [
        { label: "Round trip", value: "(T4 - T1) - (T3 - T2) = 24.0 ms" },
        { label: "Clock offset", value: "((T2 - T1) + (T3 - T4)) / 2 = +250.0 ms" },
        { label: "Limitation", value: "Assumes symmetric network delay" },
      ],
      events: [
        {
          type: "note",
          id: "ntp-note-offset",
          at: "laptop",
          text: "Offset +250.0 ms (RTT 24.0 ms)",
          tone: "lookup",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "slew",
      title: "Ease clock in without jumps",
      simple:
        "Rather than jumping forward abruptly, small errors are slewed by running the clock slightly fast until it catches up, so timers never jump backward. Polling slows down as drift stabilizes.",
      technical:
        "NTP disciplines local frequency via slewing (up to ~500 ppm) for small offsets and steps only large offsets; poll intervals scale from 64 s up to 1,024 s (Windows W32Time polls far less frequently).",
      facts: [
        { label: "Small offset", value: "Gradual rate adjustment (slew)" },
        { label: "Large offset", value: "Stepped immediately on startup" },
        { label: "Poll cadence", value: "64 s - 1,024 s (slower when stable)" },
      ],
      events: [
        {
          type: "note",
          id: "ntp-note-step",
          at: "laptop",
          text: "Clock slewing smoothly into sync",
          tone: "response",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "Four timestamps aligned the clock",
    simple:
      "One 48-byte request and reply delivered four timestamps that measured both the 24 ms round-trip network delay and the 250 ms clock error, letting the laptop adjust smoothly.",
    technical:
      "RFC 5905 NTPv4 4-timestamp calculation over UDP port 123 measured 24.0 ms delay and +250.0 ms offset.",
    facts: [
      { label: "Computed offset", value: "+250.0 ms (clock was slow)" },
      { label: "Network RTT", value: "24.0 ms" },
      { label: "Time source", value: "Stratum 2 server" },
      { label: "Transport", value: "UDP port 123 (48 B)" },
    ],
  },
  tryIt: [
    {
      title: "Check local NTP synchronization status",
      explain: "View the configured time peer, measured clock offset, and last poll status.",
      commands: [
        { os: "windows", cmd: "w32tm /query /status" },
        { os: "macos", cmd: "sntp -sS time.apple.com" },
        { os: "linux", cmd: "chronyc tracking" },
      ],
    },
  ],
});
