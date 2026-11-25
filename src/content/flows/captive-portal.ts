import { defineFlow } from "../schema";
import { dnsQuery, dnsResponse } from "../builders/dns";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { DNS_CLIENT_PORT, EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, RESOLVER_IP, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const TEST_DOMAIN = "www.msftconnecttest.com";
const TEST_IP = "203.0.113.80"; // RFC 5737 TEST-NET-3

function portalHttpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "HTTP (Captive Portal)", summary, fields };
}

export const captivePortalFlow = defineFlow({
  meta: {
    slug: "captive-portal",
    kind: "flow",
    collection: "protocols",
    group: "joining",
    title: "Captive Portal",
    fullName: "Captive Portal Wi-Fi Sign-In",
    tagline: "Intercepting plain HTTP checks to show a Wi-Fi login page",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["dhcp", "http"],
    related: ["wifi", "dhcp", "http", "https"],
    tags: ["captive-portal", "wifi", "redirect", "dhcp", "login"],
    sources: [
      {
        label: "RFC 8952: Captive Portal Architecture",
        url: "https://www.rfc-editor.org/rfc/rfc8952",
      },
      {
        label: "RFC 8910: Captive-Portal Identification in DHCP and RAs",
        url: "https://www.rfc-editor.org/rfc/rfc8910",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "Hotels and airports put a [[captive-portal|captive portal]] ahead of open Wi-Fi. Until you accept terms, the router hijacks your device's plain HTTP connectivity check with a redirect to its own login page.",
    technical:
      "Per RFC 8952, captive enforcement blocks general traffic while permitting DNS and portal access. When an OS plain-HTTP probe receives an unexpected `302`, it triggers a captive sign-in window; RFC 8910 adds explicit DHCP option 114.",
  },
  facts: [
    { label: "Layer", value: "Application trigger over L2/L3 filter" },
    { label: "Detection", value: "Plain HTTP OS connectivity test" },
    { label: "Modern signal", value: "DHCP option 114 (RFC 8910)" },
    { label: "Unlock key", value: "Client MAC allowlisted after submit" },
    { label: "Defined in", value: "RFC 8952, RFC 8910" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 100, y: 300 } },
      { id: "router", kind: "router", label: "Hotel router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "web", kind: "web-server", label: "Connectivity check", sublabel: TEST_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-web", from: "internet", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop", "router"],
      focus: ["laptop", "router"],
    },
  },
  steps: [
    {
      id: "walled-garden",
      title: "Join open Wi-Fi with no internet",
      simple:
        "After joining open hotel Wi-Fi and receiving `192.168.1.10` via [[dhcp|DHCP]], the router forwards DNS but drops outbound internet packets until your MAC signs in.",
      technical:
        "The captive router maintains a walled garden permitting DHCP, DNS, and portal IPs while blocking arbitrary internet flows before authentication (RFC 8952).",
      facts: [
        { label: "Leased IP", value: `${LAPTOP_IP} (via DHCP)` },
        { label: "Wi-Fi security", value: "Open (no passphrase)" },
        { label: "Firewall state", value: "MAC blocked except DNS & portal" },
      ],
      events: [
        {
          type: "note",
          id: "note-walled",
          at: "laptop",
          text: "Connected; no internet yet",
          tone: "error",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "os-probe",
      title: "OS runs plain HTTP check",
      simple:
        "Windows resolves `www.msftconnecttest.com` {{cp-dns-q}} {{cp-dns-a}} and sends a plain HTTP `GET /connecttest.txt` {{cp-get-fake}}. The router intercepts the TCP handshake itself, posing as `203.0.113.80`.",
      technical:
        "Expected response body is exact text `\"Microsoft Connect Test\"`. Redirecting TCP port 80 connections transparently terminates the probe inside the hotel router.",
      facts: [
        { label: "Probe URL", value: `http://${TEST_DOMAIN}/connecttest.txt` },
        { label: "Expected text", value: "Microsoft Connect Test" },
        { label: "Interceptor", value: "Hotel router answers port 80" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["internet", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "web"] },
          ],
        },
        dnsQuery({
          id: "cp-dns-q",
          from: "laptop",
          to: "router",
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          srcPort: DNS_CLIENT_PORT,
          txId: 0x6101,
          qname: TEST_DOMAIN,
          qtype: "A",
          time: 0.0,
        }),
        dnsResponse({
          id: "cp-dns-a",
          from: "router",
          to: "laptop",
          srcIp: RESOLVER_IP,
          dstIp: LAPTOP_IP,
          dstPort: DNS_CLIENT_PORT,
          txId: 0x6101,
          qname: TEST_DOMAIN,
          qtype: "A",
          answers: [{ name: TEST_DOMAIN, type: "A", ttl: 60, value: TEST_IP }],
          time: 0.01,
        }),
        {
          type: "packet",
          id: "cp-get-fake",
          from: "laptop",
          to: "router",
          tone: "request",
          label: "GET /connecttest.txt",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: TEST_IP, protocol: "TCP (6)", totalLength: 140 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 4, dport: 80, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 100 }),
            portalHttpLayer("GET /connecttest.txt HTTP/1.1", [{ name: "Intercepted", value: "Stopped at hotel router" }]),
          ],
          capture: {
            time: 0.025,
            src: LAPTOP_IP,
            dst: TEST_IP,
            protocol: "HTTP",
            info: "GET /connecttest.txt HTTP/1.1 (caught by router)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 100),
          },
        },
      ],
    },
    {
      id: "hijack-302",
      title: "Detect 302 redirect (HTTP only)",
      simple:
        "Instead of the expected phrase, the router returns `302 Found` pointing to `192.168.1.1/login` with an untouched TTL of 64 {{cp-302}}. Plain HTTP allows this hijack because HTTPS checks would fail certificate validation.",
      technical:
        "Seeing `302 Found` instead of HTTP `200` + expected body triggers OS captive-network UI. TTL=64 shows only one hop rather than a distant server.",
      facts: [
        { label: "Redirect", value: `302 -> http://${ROUTER_LAN_IP}/login` },
        { label: "Giveaway clue", value: "TTL = 64 (zero router hops)" },
        { label: "Why plain HTTP", value: "HTTPS prevents silent spoofing" },
      ],
      events: [
        {
          type: "packet",
          id: "cp-302",
          from: "router",
          to: "laptop",
          tone: "error",
          label: "302 FOUND (/login)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: TEST_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 184, ttl: 64 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START + 4, flags: "PSH, ACK", seq: 1, ack: 101, payloadBytes: 144 }),
            portalHttpLayer(`HTTP/1.1 302 Found (Location: http://${ROUTER_LAN_IP}/login)`, [
              { name: "IP TTL", value: "64 (forged locally at router)" },
            ]),
          ],
          capture: {
            time: 0.028,
            src: TEST_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP",
            info: "HTTP/1.1 302 Found (Location: /login, TTL=64)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 144),
          },
        },
        {
          type: "note",
          id: "note-action",
          at: "laptop",
          text: "Sign-in needed",
          tone: "lookup",
        },
      ],
    },
    {
      id: "login-page",
      title: "Load router's local login page",
      simple:
        "The captive browser opens `http://192.168.1.1/login` directly on the router {{cp-login-get}}, receiving an HTML welcome form with terms and an Accept button {{cp-login-200}}.",
      technical:
        "Portal UI assets are served straight from the router's embedded HTTP server without crossing onto the internet.",
      facts: [
        { label: "Portal URL", value: `http://${ROUTER_LAN_IP}/login` },
        { label: "Served by", value: "Hotel router itself" },
        { label: "HTML size", value: "1,120 bytes" },
      ],
      events: [
        {
          type: "packet",
          id: "cp-login-get",
          from: "laptop",
          to: "router",
          tone: "request",
          label: "GET /login",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: ROUTER_LAN_IP, protocol: "TCP (6)", totalLength: 120 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 5, dport: 80, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 80 }),
            portalHttpLayer("GET /login HTTP/1.1", [{ name: "Host", value: ROUTER_LAN_IP }]),
          ],
          capture: {
            time: 0.04,
            src: LAPTOP_IP,
            dst: ROUTER_LAN_IP,
            protocol: "HTTP",
            info: "GET /login HTTP/1.1",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 80),
          },
        },
        {
          type: "packet",
          id: "cp-login-200",
          from: "router",
          to: "laptop",
          tone: "response",
          label: "200 LOGIN HTML",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: ROUTER_LAN_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1160 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START + 5, flags: "PSH, ACK", seq: 1, ack: 81, payloadBytes: 1120 }),
            portalHttpLayer("HTTP/1.1 200 OK (terms + Accept form)", [{ name: "Length", value: "1,120 B HTML" }]),
          ],
          capture: {
            time: 0.045,
            src: ROUTER_LAN_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP",
            info: "HTTP/1.1 200 OK (portal HTML)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 1120),
          },
        },
      ],
    },
    {
      id: "accept-mac",
      title: "Accept terms and unlock MAC",
      simple:
        "Clicking Accept posts `accept=1` back to the router {{cp-post}}. The router adds your laptop's [[mac-address]] to its allowlist and redirects you onward {{cp-unlock-302}}.",
      technical:
        `Upon form submission (\`POST /login\`), firewall rules permit \`${LAPTOP_MAC}\` out to the WAN for the session duration.`,
      facts: [
        { label: "Submitted", value: "POST /login (accept=1)" },
        { label: "Allowlisted", value: `${LAPTOP_MAC} (laptop MAC)` },
        { label: "Security note", value: "HTTPS + VPN remain smart on open Wi-Fi" },
      ],
      events: [
        {
          type: "packet",
          id: "cp-post",
          from: "laptop",
          to: "router",
          tone: "request",
          label: "POST /login",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: ROUTER_LAN_IP, protocol: "TCP (6)", totalLength: 168 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 5, dport: 80, flags: "PSH, ACK", seq: 81, ack: 1121, payloadBytes: 128 }),
            portalHttpLayer("POST /login (accept=1)", [{ name: "Body", value: "accept=1" }]),
          ],
          capture: {
            time: 0.2,
            src: LAPTOP_IP,
            dst: ROUTER_LAN_IP,
            protocol: "HTTP",
            info: "POST /login HTTP/1.1",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 128),
          },
        },
        {
          type: "note",
          id: "note-allow",
          at: "router",
          text: `Allowed ${LAPTOP_MAC}`,
          tone: "response",
        },
        {
          type: "packet",
          id: "cp-unlock-302",
          from: "router",
          to: "laptop",
          tone: "response",
          label: "302 CONTINUE",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: ROUTER_LAN_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 160 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START + 5, flags: "PSH, ACK", seq: 1121, ack: 209, payloadBytes: 120 }),
            portalHttpLayer("HTTP/1.1 302 Found -> internet", [{ name: "Session", value: "MAC unlocked" }]),
          ],
          capture: {
            time: 0.21,
            src: ROUTER_LAN_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP",
            info: "HTTP/1.1 302 Found (access granted)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 120),
          },
        },
      ],
    },
    {
      id: "real-check",
      title: "Re-test hits the real web server",
      simple:
        "Windows repeats `/connecttest.txt` {{cp-real-get}}. Now the router lets packets reach the internet; the reply comes back with `" +
        "Microsoft Connect Test" +
        "` and TTL 52 (crossed 12 hops) {{cp-real-200}}.",
      technical:
        "Receiving HTTP `200` + expected probe string with remote TTL=52 clears the captive state and marks the Wi-Fi connection online.",
      facts: [
        { label: "Reply text", value: "Microsoft Connect Test" },
        { label: "Reply TTL", value: "52 (64 - 12 hops)" },
        { label: "OS status", value: "Connected to internet" },
      ],
      events: [
        ...tcpHandshake({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: TEST_IP,
          sport: EPHEMERAL_PORT_START + 6,
          dport: 80,
          startTime: 0.25,
          rtt: 0.02,
          prefix: "cp-real-tcp",
        }),
        {
          type: "packet",
          id: "cp-real-get",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "request",
          label: "GET /connecttest.txt",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: TEST_IP, protocol: "TCP (6)", totalLength: 140 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 6, dport: 80, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 100 }),
            portalHttpLayer("GET /connecttest.txt HTTP/1.1", [{ name: "Path", value: "Routed past hotel router" }]),
          ],
          capture: {
            time: 0.275,
            src: LAPTOP_IP,
            dst: TEST_IP,
            protocol: "HTTP",
            info: "GET /connecttest.txt HTTP/1.1",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 100),
          },
        },
        {
          type: "packet",
          id: "cp-real-200",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "200 CONNECT TEST",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: TEST_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 170, ttl: 52 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START + 6, flags: "PSH, ACK", seq: 1, ack: 101, payloadBytes: 130 }),
            portalHttpLayer('HTTP/1.1 200 OK ("Microsoft Connect Test")', [{ name: "IP TTL", value: "52 (from real server)" }]),
          ],
          capture: {
            time: 0.295,
            src: TEST_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP",
            info: 'HTTP/1.1 200 OK ("Microsoft Connect Test", TTL=52)',
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 130),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Portal cleared and internet unlocked",
    simple:
      "A plain HTTP test received an unexpected redirect instead of the expected text, opening the router's portal page. Submitting terms unlocked the laptop's MAC so the follow-up test succeeded.",
    technical:
      "Demonstrated RFC 8952 HTTP captive detection, local portal interaction, MAC allowlisting, and real connectivity verification (TTL 52).",
    facts: [
      { label: "Detected via", value: "Plain HTTP OS probe" },
      { label: "Spoof clue", value: "302 redirect with TTL 64" },
      { label: "Access key", value: "Client MAC allowlisted" },
      { label: "Safety tip", value: "Prefer HTTPS or a VPN on open Wi-Fi" },
    ],
  },
  tryIt: [
    {
      title: "Simulate an OS plain-HTTP connectivity probe",
      explain: "Fetch a known plain-HTTP probe URL; a healthy internet link returns 200 or 204 instead of a 302 portal redirect.",
      commands: [
        { os: "windows", cmd: "curl -i http://www.msftconnecttest.com/connecttest.txt" },
        { os: "macos", cmd: "curl -i http://captive.apple.com/hotspot-detect.html" },
        { os: "linux", cmd: "curl -i http://nmcheck.gnome.org/check_network_status.txt" },
      ],
    },
  ],
});
