import { defineFlow } from "../schema";
import { tlsHandshake13 } from "../builders/tls";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import {
  EPHEMERAL_PORT_START,
  LAPTOP_IP,
  LAPTOP_MAC,
  ROUTER_LAN_IP,
  ROUTER_MAC,
  ROUTER_WAN_IP,
  SERVER_MAC,
  WEB_DOMAIN,
  WEB_SERVER_IP,
} from "../world";

const APP_IP = "10.0.1.15";
const APP_PORT = 8080;

function edgeHttpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "HTTP + Edge", summary, fields };
}

export const reverseProxyFlow = defineFlow({
  meta: {
    slug: "reverse-proxy",
    kind: "flow",
    collection: "protocols",
    group: "web",
    title: "Reverse Proxy",
    fullName: "Reverse Proxy and TLS Offloading",
    tagline: "Terminating HTTPS at the edge before backend app servers",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["https", "http-proxy"],
    related: ["http-proxy", "https", "tls", "http"],
    tags: ["reverse-proxy", "tls-offload", "load-balancer", "nginx", "edge"],
    sources: [
      {
        label: "RFC 9110: HTTP Semantics",
        url: "https://www.rfc-editor.org/rfc/rfc9110",
      },
      {
        label: "RFC 7239: Forwarded HTTP Extension",
        url: "https://www.rfc-editor.org/rfc/rfc7239",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "A [[reverse-proxy|reverse proxy]] sits in front of website app servers to balance traffic, cache assets, and shield backends. Often it decrypts HTTPS at the edge so backend servers handle plain HTTP cleanly (TLS offloading).",
    technical:
      "Tools like nginx, HAProxy, and cloud load balancers accept client HTTPS on `203.0.113.10:443`, terminate TLS, inject forwarding headers (`Forwarded` RFC 7239, `X-Forwarded-For`), and dispatch requests to private upstreams.",
  },
  facts: [
    { label: "Layer", value: "Application (HTTP intermediary)" },
    { label: "Client connects to", value: "Edge proxy (port 443)" },
    { label: "Certificate lives", value: "On the reverse proxy" },
    { label: "Backend protocol", value: "Plain HTTP (or re-encrypted TLS)" },
    { label: "Defined in", value: "RFC 9110, RFC 7239" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 95, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 270, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 470, y: 300 } },
      { id: "edge", kind: "load-balancer", label: "Reverse proxy", sublabel: WEB_SERVER_IP, at: { x: 690, y: 300 } },
      { id: "app", kind: "server", label: "App server", sublabel: APP_IP, at: { x: 900, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-edge", from: "internet", to: "edge", medium: "internet" },
      { id: "l-dc", from: "edge", to: "app", medium: "ethernet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "front-door",
      title: "Handshake TLS at the edge",
      simple:
        "DNS sends `www.example.com` to `203.0.113.10`, the reverse proxy's address. The proxy holds the TLS certificate and runs the handshake {{rp-tls-client-hello}}, hiding the backend servers behind it.",
      technical:
        "From the visitor's view, the reverse proxy IS the origin server, presenting `www.example.com`'s certificate and terminating TLS 1.3 at the edge.",
      facts: [
        { label: "Public IP", value: `${WEB_SERVER_IP}:443` },
        { label: "Certificate", value: "Stored at reverse proxy" },
        { label: "Common names", value: "Edge proxy, load balancer, CDN" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "edge", "app"] },
            { type: "focus", actors: ["laptop", "router", "internet", "edge", "app"] },
          ],
        },
        ...tlsHandshake13({
          from: "laptop",
          to: "edge",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START + 3,
          dport: 443,
          serverName: WEB_DOMAIN,
          startTime: 0.0,
          rtt: 0.02,
          prefix: "rp-tls",
        }),
      ],
    },
    {
      id: "tls-offload",
      title: "Decrypt HTTPS at the edge",
      simple:
        "Your encrypted `GET /dashboard` arrives at the reverse proxy {{rp-req-enc}}, which decrypts TLS once at the edge. Now the proxy can inspect paths, headers, and cookies to pick an app backend.",
      technical:
        "Offloading centralizes CPU-heavy TLS termination on specialized front ends, enabling HTTP Layer 7 routing, WAF checks, and caching without modifying app code.",
      facts: [
        { label: "TLS ends at", value: "Reverse proxy (offloading)" },
        { label: "Inspectable now", value: "Path, Host header, cookies" },
        { label: "Next hop", value: "Selected healthy backend pool" },
      ],
      events: [
        {
          type: "packet",
          id: "rp-req-enc",
          from: "laptop",
          to: "edge",
          via: ["router", "internet"],
          tone: "secure",
          label: "APP DATA (TLS)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 210 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 3, dport: 443, flags: "PSH, ACK", seq: 582, ack: 1665, payloadBytes: 170 }),
            edgeHttpLayer("Encrypted HTTP GET /dashboard", [{ name: "Cipher", value: "TLS 1.3 AEAD" }]),
          ],
          capture: {
            time: 0.04,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "TLSv1.3",
            info: "Application Data (encrypted HTTPS request)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 170),
          },
        },
        {
          type: "note",
          id: "note-offload",
          at: "edge",
          text: "TLS terminated here",
          tone: "lookup",
        },
      ],
    },
    {
      id: "plain-backend",
      title: "Forward plain HTTP to app server",
      simple:
        "Across the private data-center LAN, the proxy forwards plain HTTP to `10.0.1.15:8080` {{rp-be-req}}, adding `Forwarded` / `X-Forwarded-For` and `X-Forwarded-Proto: https` so the app knows visitor context.",
      technical:
        `Because the backend TCP connection originates from the proxy, headers (\`Forwarded: for=${ROUTER_WAN_IP};proto=https\` per RFC 7239) preserve client IP and original scheme.`,
      facts: [
        { label: "Backend target", value: `${APP_IP}:${APP_PORT}` },
        { label: "Transport", value: "Unencrypted HTTP on private LAN" },
        { label: "Added headers", value: "Forwarded, X-Forwarded-For, -Proto" },
      ],
      events: [
        {
          type: "packet",
          id: "rp-be-req",
          from: "edge",
          to: "app",
          tone: "request",
          label: "GET /dashboard",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: SERVER_MAC }),
            ipv4Layer({ src: "10.0.1.10", dst: APP_IP, protocol: "TCP (6)", totalLength: 260 }),
            tcpLayer({ sport: 41200, dport: APP_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 220 }),
            edgeHttpLayer("GET /dashboard HTTP/1.1 (Forwarded: proto=https)", [
              { name: "Forwarded", value: `for=${ROUTER_WAN_IP};proto=https` },
              { name: "Encryption", value: "None on internal LAN hop" },
            ]),
          ],
          capture: {
            time: 0.042,
            src: "10.0.1.10",
            dst: APP_IP,
            protocol: "HTTP",
            info: `GET /dashboard (Forwarded: for=${ROUTER_WAN_IP};proto=https)`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 220),
          },
        },
        { type: "wait", ms: 600 },
      ],
    },
    {
      id: "app-reply",
      title: "App replies in plain HTTP",
      simple:
        "The application builds the HTML response (`200 OK`, 2,400 bytes across two TCP segments) and sends it back to the proxy in clear HTTP {{rp-be-res}}, untouched by TLS certificates.",
      technical:
        "Upstream server `10.0.1.15` emits a 2,400-byte HTML body over two TCP segments, remaining completely unaware of public certificate rotation.",
      facts: [
        { label: "Response", value: "HTTP/1.1 200 OK" },
        { label: "Body size", value: "2,400 bytes (text/html)" },
        { label: "Segments", value: "2 TCP segments" },
      ],
      events: [
        {
          type: "packet",
          id: "rp-be-res",
          from: "app",
          to: "edge",
          tone: "response",
          label: "200 OK (2,400 B)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: APP_IP, dst: "10.0.1.10", protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: APP_PORT, dport: 41200, flags: "PSH, ACK", seq: 1, ack: 221, payloadBytes: 2400 }),
            edgeHttpLayer("HTTP/1.1 200 OK (plain text HTML)", [{ name: "Segments", value: "2 TCP segments" }]),
          ],
          capture: {
            time: 0.048,
            src: APP_IP,
            dst: "10.0.1.10",
            protocol: "HTTP",
            info: "HTTP/1.1 200 OK (2,400 B HTML in clear text)",
            bytes: 2400 + 2 * (14 + IPV4_HEADER + TCP_BASE_HEADER),
          },
        },
        { type: "wait", ms: 600 },
      ],
    },
    {
      id: "reencrypt-out",
      title: "Encrypt response back to client",
      simple:
        "The reverse proxy seals the HTML inside your TLS session {{rp-out-enc}}, sending a normal HTTPS page home. Certificates are managed in one place at the edge.",
      technical:
        "Wrapping the backend response in the client's TLS 1.3 stream lets teams rotate certificates and tune TLS ciphers once at the edge.",
      facts: [
        { label: "Client view", value: "Standard HTTPS website" },
        { label: "App servers", value: "Offloaded from crypto and certs" },
        { label: "Ops benefit", value: "Central certificate renewal" },
      ],
      events: [
        {
          type: "packet",
          id: "rp-out-enc",
          from: "edge",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "APP DATA (2,422 B)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: 443, dport: EPHEMERAL_PORT_START + 3, flags: "PSH, ACK", seq: 1665, ack: 752, payloadBytes: 2422 }),
            edgeHttpLayer("TLS 1.3 encrypted HTML response", [{ name: "TLS overhead", value: "+22 B record header + AEAD tag" }]),
          ],
          capture: {
            time: 0.07,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "TLSv1.3",
            info: "Application Data (encrypted 200 OK page)",
            bytes: 2422 + 2 * (14 + IPV4_HEADER + TCP_BASE_HEADER),
          },
        },
        { type: "wait", ms: 300 },
      ],
    },
    {
      id: "modes",
      title: "Compare three TLS edge modes",
      simple:
        "Offloading leaves internal traffic readable on the private LAN. Re-encryption starts a second TLS link to the app, while passthrough forwards TLS unread using SNI routing only.",
      technical:
        "Architects balance simplicity (offload), defense in depth inside shared clouds (re-encrypt), and zero-proxy-key visibility (TLS passthrough routed on ClientHello SNI).",
      facts: [
        { label: "Offload", value: "Plain HTTP behind proxy" },
        { label: "Re-encrypt", value: "TLS client->edge AND edge->app" },
        { label: "Passthrough", value: "Proxy forwards raw TLS untouched" },
      ],
      events: [
        {
          type: "note",
          id: "note-inner",
          at: "app",
          text: "Plain HTTP inside (or re-encrypt)",
          tone: "lookup",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "Decrypted at the edge, served inside",
    simple:
      "Visitors talked HTTPS to the reverse proxy, which decrypted requests once, forwarded plain HTTP across the private LAN with visitor headers, and re-encrypted replies on the way back.",
    technical:
      "TLS offloading at the edge proxy simplified certificate management and inspection while RFC 7239 forwarding preserved client IP and scheme.",
    facts: [
      { label: "TLS span", value: "Laptop <-> reverse proxy" },
      { label: "Internal link", value: "Plain HTTP (port 8080)" },
      { label: "Visitor IP header", value: "Forwarded / X-Forwarded-For" },
      { label: "Certificates", value: "Managed at the edge" },
    ],
  },
  tryIt: [
    {
      title: "Look for reverse proxy headers on responses",
      explain: "Response headers such as Server, Via, or X-Cache often show the edge proxy sitting in front of an app.",
      commands: [
        { os: "windows", cmd: "curl -I https://example.com" },
        { os: "macos", cmd: "curl -I https://example.com" },
        { os: "linux", cmd: "curl -I https://example.com" },
      ],
    },
  ],
});
