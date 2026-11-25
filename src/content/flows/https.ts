import { defineFlow } from "../schema";
import { dnsQuery, dnsResponse } from "../builders/dns";
import { httpRequest, httpResponse } from "../builders/http";
import { tcpHandshake } from "../builders/tcp";
import { tlsHandshake13 } from "../builders/tls";
import {
  LAPTOP_IP,
  RESOLVER_IP,
  ROUTER_LAN_IP,
  WEB_DOMAIN,
  WEB_SERVER_IP,
} from "../world";

const CLIENT_PORT = 52411;

export const httpsFlow = defineFlow({
  meta: {
    slug: "https",
    kind: "flow",
    collection: "protocols",
    group: "web",
    title: "HTTPS",
    fullName: "HTTP Secure",
    tagline: "Web pages delivered inside an encrypted TLS connection",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["http", "tls"],
    related: ["http", "tls", "dns", "dns-over-https", "quic"],
    tags: ["https", "tls", "web", "hsts", "port-443"],
    sources: [
      {
        label: "RFC 9110: HTTP Semantics",
        url: "https://www.rfc-editor.org/rfc/rfc9110",
      },
      {
        label: "RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3",
        url: "https://www.rfc-editor.org/rfc/rfc8446",
      },
      {
        label: "RFC 6797: HTTP Strict Transport Security (HSTS)",
        url: "https://www.rfc-editor.org/rfc/rfc6797",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[https|HTTPS]] carries normal [[http|HTTP]] web requests inside an encrypted [[tls|TLS]] tunnel. It proves you reached the real website and hides the page contents from anyone watching the network.",
    technical:
      "HTTP Secure runs HTTP semantics (RFC 9110) over [[tls|TLS]] (RFC 8446) on TCP [[port|port]] 443. After plain [[dns|DNS]] resolution and a TCP handshake, TLS 1.3 verifies the server [[certificate]] and encrypts HTTP requests, headers, and responses.",
  },
  facts: [
    { label: "Layer", value: "Application (HTTP over TLS)" },
    { label: "Default port", value: "443 (TCP)" },
    { label: "Security", value: "TLS 1.3 (1.2 fallback)" },
    { label: "Verifies", value: "Domain identity via certificate" },
    { label: "Defined in", value: "RFC 9110, RFC 8446" },
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
      id: "secure-url",
      title: "Request https://www.example.com",
      simple:
        "You type `https://www.example.com`. The `s` tells your browser to connect on port 443 and wrap the session in [[tls|TLS]].",
      technical:
        "Targeting `https://www.example.com/` instructs the browser to establish TCP port 443 and authenticate the origin via TLS before sending any HTTP bytes.",
      facts: [
        { label: "URL", value: "https://www.example.com/" },
        { label: "Port", value: "443" },
        { label: "Next hop", value: ROUTER_LAN_IP },
      ],
      events: [
        {
          type: "screen",
          at: "laptop",
          screen: { app: "browser", url: `https://${WEB_DOMAIN}`, secure: true, state: "typing" },
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
      id: "dns-lookup",
      title: "Resolve the domain name",
      simple:
        "Your laptop asks `8.8.8.8` for the address {{https-dns-q}} and gets `203.0.113.10` {{https-dns-a}}. Standard [[dns|DNS]] queries are not encrypted.",
      technical:
        "Over UDP port 53, the stub resolver queries `8.8.8.8` {{https-dns-q}} and receives the cached A record {{https-dns-a}}. Unless DNS over HTTPS is enabled, onlookers see the queried domain name.",
      facts: [
        { label: "Resolver", value: RESOLVER_IP },
        { label: "Encrypted", value: "No (plain UDP DNS)" },
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
          id: "https-dns-q",
          from: "laptop",
          to: "dns",
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          srcPort: 61744,
          txId: 0x7c42,
          qname: WEB_DOMAIN,
          rd: true,
          time: 0.0,
          label: "DNS query",
        }),
        dnsResponse({
          id: "https-dns-a",
          from: "dns",
          to: "laptop",
          srcIp: RESOLVER_IP,
          dstIp: LAPTOP_IP,
          dstPort: 61744,
          txId: 0x7c42,
          qname: WEB_DOMAIN,
          rd: true,
          ra: true,
          answers: [{ name: WEB_DOMAIN, type: "A", ttl: 1722, value: WEB_SERVER_IP }],
          time: 0.012,
          label: "DNS reply",
          tone: "lookup",
        }),
      ],
    },
    {
      id: "tcp-connect",
      title: "Connect TCP on port 443",
      simple:
        "Before encryption starts, your laptop opens a [[tcp|TCP]] connection to port 443 {{https-tcp-syn}} {{https-tcp-syn-ack}} {{https-tcp-ack}}.",
      technical:
        `The browser opens a TCP socket from ephemeral port \`${CLIENT_PORT}\` to \`${WEB_SERVER_IP}:443\` via SYN, SYN-ACK, and ACK.`,
      facts: [
        { label: "Server port", value: "443" },
        { label: "Client port", value: String(CLIENT_PORT) },
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
          sport: CLIENT_PORT,
          dport: 443,
          startTime: 0.024,
          rtt: 0.034,
          prefix: "https-tcp",
        }),
      ],
    },
    {
      id: "tls-handshake",
      title: "Run the TLS handshake",
      simple:
        "Your laptop and the server negotiate keys {{https-tls-client-hello}} {{https-tls-server-hello}}, check the [[certificate]], and confirm the secure channel {{https-tls-client-finished}}.",
      technical:
        "TLS 1.3 exchanges key shares, validates `www.example.com`'s certificate chain, selects `http/1.1` via [[alpn|ALPN]], and completes with Client Finished (RFC 8446).",
      facts: [
        { label: "TLS version", value: "TLS 1.3" },
        { label: "SNI", value: `${WEB_DOMAIN} (sent in clear)` },
        { label: "Certificate", value: "Trusted CA chain verified" },
      ],
      events: [
        ...tlsHandshake13({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: CLIENT_PORT,
          dport: 443,
          serverName: WEB_DOMAIN,
          alpn: "h2, http/1.1",
          startTime: 0.058,
          rtt: 0.018,
          prefix: "https-tls",
        }),
        {
          type: "note",
          id: "note-https-cert",
          at: "laptop",
          text: "Certificate valid",
          tone: "secure",
        },
      ],
    },
    {
      id: "encrypted-http",
      title: "Exchange encrypted HTTP",
      simple:
        "Your `GET /` request {{https-get}} and the server's `200 OK` HTML page {{https-200}} travel sealed inside encrypted TLS records.",
      technical:
        "Both HTTP/1.1 messages travel as TLS Application Data records (RFC 8446). Observers on the network see only IP headers, TCP ports, and ciphertext lengths.",
      facts: [
        { label: "Inside tunnel", value: "GET / and HTTP 200 OK" },
        { label: "Wire protocol", value: "TLSv1.3 Application Data" },
        { label: "Visible on wire", value: "IPs, SNI, sizes, timing" },
      ],
      events: [
        {
          type: "screen",
          at: "laptop",
          screen: { app: "browser", url: `https://${WEB_DOMAIN}`, secure: true, state: "loading" },
        },
        httpRequest({
          id: "https-get",
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: CLIENT_PORT,
          dport: 443,
          host: WEB_DOMAIN,
          time: 0.094,
          encrypted: true,
          label: "Encrypted GET /",
        }),
        httpResponse({
          id: "https-200",
          from: "web",
          to: "laptop",
          srcIp: WEB_SERVER_IP,
          dstIp: LAPTOP_IP,
          sport: 443,
          dport: CLIENT_PORT,
          bodyBytes: 12500,
          time: 0.112,
          encrypted: true,
          label: "Encrypted 200 OK",
        }),
      ],
    },
    {
      id: "render-hsts",
      title: "Paint page and save HSTS",
      simple:
        "Your browser decrypts the HTML and shows the padlock. An [[hsts|HSTS]] header tells it to use HTTPS automatically on future visits.",
      technical:
        "The response's `Strict-Transport-Security: max-age=31536000` header (RFC 6797) pins future requests for `www.example.com` to HTTPS for one year.",
      facts: [
        { label: "Document", value: "12,500 bytes HTML" },
        { label: "HSTS policy", value: "HTTPS only for 1 year" },
        { label: "Padlock", value: "Confidential + authenticated" },
      ],
      events: [
        { type: "focus", actors: ["laptop"] },
        {
          type: "screen",
          at: "laptop",
          screen: { app: "browser", url: `https://${WEB_DOMAIN}`, secure: true, state: "page" },
        },
        { type: "badge", at: "laptop", text: "HTTPS + HSTS", tone: "secure" },
      ],
    },
  ],
  outro: {
    title: "Secure page loaded",
    simple:
      "Your browser looked up the address, opened TCP, checked the server's certificate with TLS, and fetched the page encrypted.",
    technical:
      "Completed DNS resolution, TCP port 443 handshake, 1-RTT TLS 1.3 handshake, and encrypted HTTP/1.1 exchange with HSTS enforcement.",
    facts: [
      { label: "Round trips", value: "4 (DNS, TCP, TLS, HTTP)" },
      { label: "Port", value: "TCP 443" },
      { label: "Cipher", value: "TLS_AES_128_GCM_SHA256" },
      { label: "Visible to wire", value: "IPs, SNI, sizes" },
    ],
  },
  tryIt: [
    {
      title: "Inspect an HTTPS response and TLS handshake",
      explain:
        "Watch curl verify the TLS certificate and print the decrypted HTTP headers returned by the server.",
      commands: [
        { os: "windows", cmd: "curl.exe -v https://example.com" },
        { os: "macos", cmd: "curl -v https://example.com" },
        { os: "linux", cmd: "curl -v https://example.com" },
      ],
    },
  ],
});
