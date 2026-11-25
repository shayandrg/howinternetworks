import { defineFlow } from "../schema";
import { dnsQuery, dnsResponse } from "../builders/dns";
import { httpRequest, httpResponse } from "../builders/http";
import { splitIntoSegments, IPV4_MSS } from "../builders/sizes";
import { tcpHandshake } from "../builders/tcp";
import {
  EPHEMERAL_PORT_START,
  LAPTOP_IP,
  RESOLVER_IP,
  ROUTER_LAN_IP,
  WEB_DOMAIN,
  WEB_SERVER_IP,
} from "../world";

const BODY_BYTES = 12500;
const BODY_SEGMENTS = splitIntoSegments(BODY_BYTES, IPV4_MSS).length;

export const httpFlow = defineFlow({
  meta: {
    slug: "http",
    kind: "flow",
    collection: "protocols",
    group: "web",
    title: "HTTP",
    fullName: "Hypertext Transfer Protocol",
    tagline: "Plain-text requests and responses that load web resources",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["dns", "tcp"],
    related: ["dns", "tcp", "https", "websocket", "http-proxy"],
    tags: ["http", "web", "get", "tcp", "rfc9110"],
    sources: [
      {
        label: "RFC 9110: HTTP Semantics",
        url: "https://www.rfc-editor.org/rfc/rfc9110",
      },
      {
        label: "RFC 9112: HTTP/1.1",
        url: "https://www.rfc-editor.org/rfc/rfc9112",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[http|HTTP]] is how a browser asks a server for a web page and gets it back. The browser sends a readable request, and the server replies with a status code, headers, and the page content.",
    technical:
      "Hypertext Transfer Protocol (RFC 9110, RFC 9112) runs over a reliable transport such as [[tcp|TCP]] on [[port|port]] 80 by default (443 for [[https|HTTPS]]). HTTP/1.1 exchanges structured text start-lines and headers followed by an optional message body.",
  },
  facts: [
    { label: "Layer", value: "Application (OSI Layer 7)" },
    { label: "Default port", value: "80 (HTTPS uses 443)" },
    { label: "Transport", value: "TCP" },
    { label: "Format", value: "Readable text headers + body" },
    { label: "Defined in", value: "RFC 9110, RFC 9112" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 100, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 300, y: 300 } },
      { id: "internet", kind: "cloud", label: "Internet", at: { x: 520, y: 300 } },
      { id: "dns", kind: "dns-server", label: "DNS resolver", sublabel: RESOLVER_IP, at: { x: 820, y: 150 } },
      { id: "web", kind: "web-server", label: "Web server", sublabel: WEB_SERVER_IP, at: { x: 820, y: 430 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-dns", from: "internet", to: "dns", medium: "internet" },
      { id: "l-web", from: "internet", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "prepare-request",
      title: "Prepare the request",
      simple:
        "You enter `http://www.example.com` in the browser. Before it can connect, your laptop needs the server's numerical [[ip-address]].",
      technical:
        "The browser prepares an HTTP/1.1 `GET /` request targeting `www.example.com` on port 80, sending traffic via the [[default-gateway]] at `192.168.1.1`. Modern browsers often try HTTPS first before plain HTTP.",
      facts: [
        { label: "URL", value: "http://www.example.com/" },
        { label: "Method", value: "GET" },
        { label: "Gateway", value: ROUTER_LAN_IP },
      ],
      events: [
        {
          type: "screen",
          at: "laptop",
          screen: { app: "browser", url: WEB_DOMAIN, state: "typing" },
        },
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router"] },
            { type: "focus", actors: ["laptop", "router"] },
          ],
        },
      ],
    },
    {
      id: "resolve-name",
      title: "Look up the IP address",
      simple:
        "Your laptop asks the [[dns|DNS]] resolver {{http-dns-q}} for `www.example.com`. The resolver already has it cached and returns `203.0.113.10` {{http-dns-a}}.",
      technical:
        "The client sends a standard [[a-record]] query over [[udp|UDP]] port 53 to `8.8.8.8` {{http-dns-q}} and receives the cached `203.0.113.10` response {{http-dns-a}}.",
      facts: [
        { label: "Resolver", value: RESOLVER_IP },
        { label: "Transport", value: "UDP port 53" },
        { label: "Answer", value: `A ${WEB_SERVER_IP}` },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["internet", "dns"] },
            { type: "focus", actors: ["laptop", "router", "internet", "dns"] },
          ],
        },
        dnsQuery({
          id: "http-dns-q",
          from: "laptop",
          to: "dns",
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          srcPort: 59321,
          txId: 0x3d1a,
          qname: WEB_DOMAIN,
          rd: true,
          time: 0.0,
          label: "DNS query",
        }),
        dnsResponse({
          id: "http-dns-a",
          from: "dns",
          to: "laptop",
          srcIp: RESOLVER_IP,
          dstIp: LAPTOP_IP,
          dstPort: 59321,
          txId: 0x3d1a,
          qname: WEB_DOMAIN,
          rd: true,
          ra: true,
          answers: [
            { name: WEB_DOMAIN, type: "A", ttl: 1745, value: WEB_SERVER_IP },
          ],
          time: 0.012,
          label: "DNS reply",
          tone: "lookup",
        }),
      ],
    },
    {
      id: "open-tcp",
      title: "Open a TCP connection",
      simple:
        "Now that it has the address, your laptop opens a reliable [[tcp|TCP]] connection to port 80 with a three-step handshake {{http-tcp-syn}} {{http-tcp-syn-ack}} {{http-tcp-ack}}.",
      technical:
        "HTTP/1.1 opens a TCP connection from ephemeral port `52344` to `203.0.113.10:80` using SYN, SYN-ACK, and ACK (RFC 9112).",
      facts: [
        { label: "Server port", value: "80" },
        { label: "Client port", value: String(EPHEMERAL_PORT_START) },
        { label: "Handshake", value: "SYN -> SYN-ACK -> ACK" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "web"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START,
          dport: 80,
          startTime: 0.024,
          rtt: 0.034,
          prefix: "http-tcp",
        }),
      ],
    },
    {
      id: "exchange-http",
      title: "Send GET and receive 200 OK",
      simple:
        "The browser sends a `GET /` request {{http-get}}. The server responds with `200 OK` and the HTML page {{http-200}} in plain text.",
      technical:
        `The client sends \`GET / HTTP/1.1\` with a \`Host: www.example.com\` header {{http-get}}. The server returns \`HTTP/1.1 200 OK\` with \`text/html\` and a 12,500-byte body split across ${BODY_SEGMENTS} TCP segments {{http-200}} (RFC 9110).`,
      facts: [
        { label: "Status", value: "200 OK" },
        { label: "Body size", value: "12,500 bytes (text/html)" },
        { label: "TCP segments", value: `${BODY_SEGMENTS} segments (MSS 1460)` },
      ],
      events: [
        {
          type: "screen",
          at: "laptop",
          screen: { app: "browser", url: WEB_DOMAIN, state: "loading" },
        },
        httpRequest({
          id: "http-get",
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START,
          dport: 80,
          host: WEB_DOMAIN,
          time: 0.058,
          label: "GET /",
        }),
        httpResponse({
          id: "http-200",
          from: "web",
          to: "laptop",
          srcIp: WEB_SERVER_IP,
          dstIp: LAPTOP_IP,
          sport: 80,
          dport: EPHEMERAL_PORT_START,
          bodyBytes: BODY_BYTES,
          time: 0.076,
          label: "200 OK",
        }),
      ],
    },
    {
      id: "render-page",
      title: "Render the page",
      simple:
        "Your browser reads the HTML and paints the page. It keeps the TCP connection open so stylesheets or images can reuse it right away.",
      technical:
        "With `Connection: keep-alive` (default in HTTP/1.1 per RFC 9112), the browser keeps the TCP socket open for subsequent requests while parsing the HTML document.",
      facts: [
        { label: "Content-Type", value: "text/html; charset=utf-8" },
        { label: "Connection", value: "Persistent (keep-alive)" },
        { label: "Encryption", value: "None (readable on wire)" },
      ],
      events: [
        { type: "focus", actors: ["laptop"] },
        {
          type: "screen",
          at: "laptop",
          screen: { app: "browser", url: WEB_DOMAIN, state: "page" },
        },
        { type: "badge", at: "laptop", text: "200 OK loaded", tone: "response" },
      ],
    },
  ],
  outro: {
    title: "Page delivered over HTTP",
    simple:
      "Three exchanges fetched the page: a DNS lookup, a TCP handshake, and one HTTP request and response. Because HTTP uses plain text, anyone along the path could read it.",
    technical:
      "HTTP/1.1 resolved `www.example.com` via DNS, established TCP port 80, exchanged `GET /` and `200 OK`, and delivered 12,500 bytes of HTML.",
    facts: [
      { label: "Round trips", value: "3 (DNS, TCP, HTTP)" },
      { label: "Port", value: "TCP 80" },
      { label: "Body size", value: "12,500 bytes" },
      { label: "Body segments", value: `${BODY_SEGMENTS} at MSS 1460` },
    ],
  },
  tryIt: [
    {
      title: "Fetch a page and inspect HTTP headers",
      explain:
        "See the plain-text HTTP request line, Host header, status code, and response headers in your terminal.",
      commands: [
        { os: "windows", cmd: "curl.exe -v http://example.com" },
        { os: "macos", cmd: "curl -v http://example.com" },
        { os: "linux", cmd: "curl -v http://example.com" },
      ],
    },
  ],
});
