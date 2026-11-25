import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, ROUTER_WAN_IP, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

const PROXY_IP = "192.0.2.80"; // RFC 5737 TEST-NET-1
const PROXY_PORT = 8080;

function proxyHttpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "HTTP + Proxy", summary, fields };
}

export const httpProxyFlow = defineFlow({
  meta: {
    slug: "http-proxy",
    kind: "flow",
    collection: "protocols",
    group: "web",
    title: "HTTP Proxy",
    fullName: "Forward HTTP Proxy and CONNECT Tunneling",
    tagline: "Intermediaries fetching HTTP and tunneling HTTPS via CONNECT",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["http", "https"],
    related: ["reverse-proxy", "socks5", "http", "https"],
    tags: ["proxy", "forward-proxy", "connect", "http", "tunnel"],
    sources: [
      {
        label: "RFC 9110: HTTP Semantics (CONNECT §9.3.6)",
        url: "https://www.rfc-editor.org/rfc/rfc9110",
      },
      {
        label: "RFC 9112: HTTP/1.1 (Proxy Request Form)",
        url: "https://www.rfc-editor.org/rfc/rfc9112",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "A [[forward-proxy|forward proxy]] fetches web requests for clients inside schools or companies to cache pages, enforce policies, or hide client IPs. Plain HTTP is readable to the proxy, while HTTPS uses a `CONNECT` byte tunnel.",
    technical:
      "Defined in RFC 9110 and RFC 9112, an HTTP proxy on port 8080/3128 receives absolute-URI requests (`GET http://...`) for plain HTTP and relays opaque TLS connections for `CONNECT host:443` (§9.3.6).",
  },
  facts: [
    { label: "Layer", value: "Application (HTTP intermediary)" },
    { label: "Common ports", value: "8080, 3128" },
    { label: "Plain HTTP", value: "Parsed, cached, and re-issued by proxy" },
    { label: "HTTPS sites", value: "Opaque tunnel via CONNECT" },
    { label: "Defined in", value: "RFC 9110 (§9.3.6), RFC 9112" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your browser", sublabel: LAPTOP_IP, at: { x: 100, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 290, y: 300 } },
      { id: "proxy", kind: "proxy", label: "HTTP proxy", sublabel: PROXY_IP, at: { x: 560, y: 300 } },
      { id: "web", kind: "web-server", label: WEB_DOMAIN, sublabel: WEB_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-lan", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-prx", from: "router", to: "proxy", medium: "fiber" },
      { id: "l-web", from: "proxy", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "connect-proxy",
      title: "Connect TCP to proxy port 8080",
      simple:
        "Configured to use proxy `192.0.2.80:8080`, the browser does not resolve or dial `www.example.com` itself. Instead it opens a TCP socket directly to the proxy {{prx-tcp-syn}}.",
      technical:
        `The client initiates TCP to \`${PROXY_IP}:${PROXY_PORT}\`, delegating destination DNS lookup and upstream socket creation to the intermediary.`,
      facts: [
        { label: "Configured proxy", value: `${PROXY_IP}:8080` },
        { label: "Site DNS", value: "Resolved by proxy" },
        { label: "Target URL", value: `http://${WEB_DOMAIN}/` },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "proxy", "web"] },
            { type: "focus", actors: ["laptop", "router", "proxy", "web"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "proxy",
          srcIp: LAPTOP_IP,
          dstIp: PROXY_IP,
          dport: PROXY_PORT,
          startTime: 0.0,
          rtt: 0.015,
          prefix: "prx-tcp",
        }),
      ],
    },
    {
      id: "absolute-uri",
      title: "Send full URL to the proxy",
      simple:
        "Because the proxy serves many sites, the request line includes the entire URL (`GET http://www.example.com/ HTTP/1.1`) rather than just `/` {{prx-get-in}}.",
      technical:
        "RFC 9112 §3.2.2 specifies absolute-form request targets (`GET http://www.example.com/`) when talking to a forward proxy, sent in clear text over port 8080.",
      facts: [
        { label: "Request line", value: `GET http://${WEB_DOMAIN}/` },
        { label: "Direct server line", value: "GET / (origin-form)" },
        { label: "Inspection", value: "Fully readable by proxy" },
      ],
      events: [
        {
          type: "packet",
          id: "prx-get-in",
          from: "laptop",
          to: "proxy",
          via: ["router"],
          tone: "request",
          label: "GET http://...",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PROXY_IP, protocol: "TCP (6)", totalLength: 170 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: PROXY_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 130 }),
            proxyHttpLayer(`GET http://${WEB_DOMAIN}/ HTTP/1.1`, [
              { name: "Host", value: WEB_DOMAIN },
              { name: "Proxy-Connection", value: "keep-alive" },
            ]),
          ],
          capture: {
            time: 0.025,
            src: LAPTOP_IP,
            dst: PROXY_IP,
            protocol: "HTTP",
            info: `GET http://${WEB_DOMAIN}/ HTTP/1.1`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 130),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "proxy-fetches",
      title: "Proxy opens upstream HTTP socket",
      simple:
        "The proxy resolves the website, opens its own connection to `203.0.113.10`, and forwards `GET /` with `Via` and `X-Forwarded-For` headers {{prx-get-out}}.",
      technical:
        `Using its own socket, the proxy strips absolute-form to \`GET /\` and attaches \`Via: 1.1 proxy.example.net\` plus \`X-Forwarded-For: ${ROUTER_WAN_IP}\` (RFC 9110 §7.6.3).`,
      facts: [
        { label: "Connection", value: "Separate proxy -> server socket" },
        { label: "Via header", value: "1.1 proxy.example.net" },
        { label: "X-Forwarded-For", value: ROUTER_WAN_IP },
      ],
      events: [
        {
          type: "packet",
          id: "prx-get-out",
          from: "proxy",
          to: "web",
          tone: "request",
          label: "GET / (+Via)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: PROXY_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 196 }),
            tcpLayer({ sport: 40210, dport: 80, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 156 }),
            proxyHttpLayer(`GET / HTTP/1.1 (Via proxy)`, [
              { name: "Via", value: "1.1 proxy.example.net" },
              { name: "X-Forwarded-For", value: ROUTER_WAN_IP },
            ]),
          ],
          capture: {
            time: 0.04,
            src: PROXY_IP,
            dst: WEB_SERVER_IP,
            protocol: "HTTP",
            info: "GET / HTTP/1.1 (forwarded by proxy)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 156),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "relay-response",
      title: "Relay and optionally cache reply",
      simple:
        "The website answers the proxy (seeing only the proxy's IP) {{prx-200-in}}, and the proxy relays the page to your browser adding `X-Cache: MISS` {{prx-200-out}}. Cached pages could be served directly next time.",
      technical:
        "Origin logs record `192.0.2.80`. Returning through the proxy lets it apply content filtering, store cacheable responses, or modify headers.",
      facts: [
        { label: "Server sees IP", value: `${PROXY_IP} (proxy)` },
        { label: "Cache status", value: "X-Cache: MISS" },
        { label: "Proxy abilities", value: "Filter, log, cache, rewrite HTTP" },
      ],
      events: [
        {
          type: "packet",
          id: "prx-200-in",
          from: "web",
          to: "proxy",
          tone: "response",
          label: "200 OK",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: PROXY_IP, protocol: "TCP (6)", totalLength: 820 }),
            tcpLayer({ sport: 80, dport: 40210, flags: "PSH, ACK", seq: 1, ack: 157, payloadBytes: 780 }),
            proxyHttpLayer("HTTP/1.1 200 OK (780 B)", [{ name: "Content-Type", value: "text/html" }]),
          ],
          capture: {
            time: 0.055,
            src: WEB_SERVER_IP,
            dst: PROXY_IP,
            protocol: "HTTP",
            info: "HTTP/1.1 200 OK (to proxy)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 780),
          },
        },
        {
          type: "packet",
          id: "prx-200-out",
          from: "proxy",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "200 OK (+X-Cache)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: PROXY_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 860 }),
            tcpLayer({ sport: PROXY_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1, ack: 131, payloadBytes: 820 }),
            proxyHttpLayer("HTTP/1.1 200 OK (Via + X-Cache: MISS)", [
              { name: "Via", value: "1.1 proxy.example.net" },
              { name: "X-Cache", value: "MISS" },
            ]),
          ],
          capture: {
            time: 0.07,
            src: PROXY_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP",
            info: "HTTP/1.1 200 OK (X-Cache: MISS)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 820),
          },
        },
      ],
    },
    {
      id: "https-connect",
      title: "Request CONNECT tunnel for HTTPS",
      simple:
        "For HTTPS sites, the proxy cannot fetch pages without breaking TLS. Your browser asks for a tunnel via `CONNECT www.example.com:443` {{prx-conn}} and receives `200 Connection Established` {{prx-200-conn}}.",
      technical:
        "RFC 9110 §9.3.6 defines `CONNECT authority`. Upon opening a TCP connection to `203.0.113.10:443`, the proxy returns `200` and converts both sockets into a raw bidirectional pipe.",
      facts: [
        { label: "Request", value: `CONNECT ${WEB_DOMAIN}:443` },
        { label: "Proxy socket", value: `TCP -> ${WEB_SERVER_IP}:443` },
        { label: "Tunnel ready", value: "200 Connection Established" },
      ],
      events: [
        {
          type: "packet",
          id: "prx-conn",
          from: "laptop",
          to: "proxy",
          via: ["router"],
          tone: "control",
          label: "CONNECT :443",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PROXY_IP, protocol: "TCP (6)", totalLength: 108 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 1, dport: PROXY_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 68 }),
            proxyHttpLayer(`CONNECT ${WEB_DOMAIN}:443 HTTP/1.1`, [{ name: "RFC 9110", value: "Open blind TCP tunnel" }]),
          ],
          capture: {
            time: 0.1,
            src: LAPTOP_IP,
            dst: PROXY_IP,
            protocol: "HTTP",
            info: `CONNECT ${WEB_DOMAIN}:443 HTTP/1.1`,
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 68),
          },
        },
        {
          type: "packet",
          id: "prx-200-conn",
          from: "proxy",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "200 TUNNEL OK",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: PROXY_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 80 }),
            tcpLayer({ sport: PROXY_PORT, dport: EPHEMERAL_PORT_START + 1, flags: "PSH, ACK", seq: 1, ack: 69, payloadBytes: 40 }),
            proxyHttpLayer("HTTP/1.1 200 Connection Established", [{ name: "Mode", value: "Byte-copy pipe active" }]),
          ],
          capture: {
            time: 0.125,
            src: PROXY_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP",
            info: "HTTP/1.1 200 Connection Established",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 40),
          },
        },
      ],
    },
    {
      id: "tunnel-bytes",
      title: "Copy encrypted bytes unread",
      simple:
        "From then on, the proxy copies bytes blindly. Your TLS `ClientHello` enters {{prx-ch-in}} and leaves byte-for-byte toward the website {{prx-ch-out}}; only the hostname and sizes show, not URLs or cookies.",
      technical:
        "TLS runs end-to-end between laptop and origin inside the CONNECT pipe (corporate TLS-inspection proxies differ by installing a local enterprise root CA to decrypt and re-sign traffic).",
      facts: [
        { label: "Proxy learns", value: "Hostname, byte counts, timing" },
        { label: "Hidden inside TLS", value: "Paths, cookies, page contents" },
        { label: "Encryption span", value: "Browser <-> Origin server" },
      ],
      events: [
        {
          type: "packet",
          id: "prx-ch-in",
          from: "laptop",
          to: "proxy",
          via: ["router"],
          tone: "secure",
          label: "CLIENT HELLO",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PROXY_IP, protocol: "TCP (6)", totalLength: 557 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 1, dport: PROXY_PORT, flags: "PSH, ACK", seq: 69, ack: 41, payloadBytes: 517 }),
            proxyHttpLayer("TLS 1.3 ClientHello inside CONNECT", [{ name: "SNI", value: WEB_DOMAIN }]),
          ],
          capture: {
            time: 0.13,
            src: LAPTOP_IP,
            dst: PROXY_IP,
            protocol: "TLSv1.3",
            info: "ClientHello (tunneled via CONNECT)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 517),
          },
        },
        {
          type: "note",
          id: "note-blind",
          at: "proxy",
          text: "Copies encrypted bytes blindly",
          tone: "lookup",
        },
        {
          type: "packet",
          id: "prx-ch-out",
          from: "proxy",
          to: "web",
          tone: "secure",
          label: "CLIENT HELLO",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: PROXY_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 557 }),
            tcpLayer({ sport: 40211, dport: 443, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 517 }),
            proxyHttpLayer("Unmodified TLS ClientHello relayed to 443", [{ name: "Payload", value: "Exact bytes forwarded" }]),
          ],
          capture: {
            time: 0.14,
            src: PROXY_IP,
            dst: WEB_SERVER_IP,
            protocol: "TLSv1.3",
            info: "ClientHello (relayed unchanged)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 517),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Parsed HTTP, opaque HTTPS tunnel",
    simple:
      "For plain HTTP, the proxy read, logged, and fetched URLs on its own socket; for HTTPS, CONNECT switched the proxy into a blind pipe forwarding end-to-end TLS unchanged.",
    technical:
      "Demonstrated RFC 9112 forward HTTP request rewriting (`Via`, `X-Forwarded-For`) and RFC 9110 §9.3.6 `CONNECT` TLS tunneling.",
    facts: [
      { label: "Origin sees IP", value: `${PROXY_IP} (proxy)` },
      { label: "Plain HTTP", value: "Proxy reads and caches full text" },
      { label: "HTTPS tunnel", value: "Proxy sees host and size only" },
      { label: "DNS resolution", value: "Handled by proxy" },
    ],
  },
  tryIt: [
    {
      title: "Route a curl request through an HTTP proxy",
      explain: "Observe verbose CONNECT and proxy headers when passing traffic via `-x`.",
      commands: [
        { os: "windows", cmd: "curl -v -x http://192.0.2.80:8080 https://example.com" },
        { os: "macos", cmd: "curl -v -x http://192.0.2.80:8080 https://example.com" },
        { os: "linux", cmd: "curl -v -x http://192.0.2.80:8080 https://example.com" },
      ],
    },
  ],
});
