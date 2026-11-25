import { defineFlow } from "../schema";
import { dnsQuery, dnsResponse } from "../builders/dns";
import { tcpHandshake } from "../builders/tcp";
import { tlsHandshake13 } from "../builders/tls";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import {
  DNS_CLIENT_PORT,
  EPHEMERAL_PORT_START,
  LAPTOP_IP,
  LAPTOP_MAC,
  RESOLVER_IP,
  ROUTER_LAN_IP,
  ROUTER_MAC,
  WEB_DOMAIN,
  WEB_SERVER_IP,
} from "../world";

function h2Layer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "HTTP/2 + DoH", summary, fields };
}

export const dnsOverHttpsFlow = defineFlow({
  meta: {
    slug: "dns-over-https",
    kind: "flow",
    collection: "protocols",
    group: "names",
    title: "DNS over HTTPS",
    fullName: "DNS Queries over HTTPS (DoH)",
    tagline: "Sealing DNS lookups inside encrypted HTTPS traffic",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["dns", "https"],
    related: ["dns", "dnssec", "https", "tls"],
    tags: ["doh", "dns", "https", "privacy", "rfc8484"],
    sources: [
      {
        label: "RFC 8484: DNS Queries over HTTPS (DoH)",
        url: "https://www.rfc-editor.org/rfc/rfc8484",
      },
      {
        label: "RFC 1035: Domain Names - Implementation and Specification",
        url: "https://www.rfc-editor.org/rfc/rfc1035",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "Classic DNS sends every queried site name in plain text so local routers and ISPs can read or forge replies. [[doh|DoH]] packs those same DNS messages inside an encrypted HTTPS session to the [[resolver]].",
    technical:
      "DNS over HTTPS (RFC 8484) transports standard wire-format DNS queries (`application/dns-message`) over HTTPS/2 or HTTP/3 on port 443, shielding domain lookups from on-path eavesdropping and tampering.",
  },
  facts: [
    { label: "Layer", value: "Application (over HTTPS / TCP 443)" },
    { label: "Media type", value: "application/dns-message" },
    { label: "Protects", value: "Queries and answers in transit" },
    { label: "Sibling", value: "DNS over TLS (port 853)" },
    { label: "Defined in", value: "RFC 8484, RFC 1035" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Cafe router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "dns", kind: "dns-server", label: "dns.google", sublabel: RESOLVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "dns", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "plain-dns",
      title: "Compare plain UDP port 53 DNS",
      simple:
        "Before enabling DoH, a lookup sends unencrypted UDP on port 53 {{doh-plain-q}} {{doh-plain-a}}. Anyone on the cafe Wi-Fi or ISP path sees every domain asked and could inject a fake IP address.",
      technical:
        "Standard RFC 1035 DNS packets leave both Question and Answer sections in clear text on UDP 53, exposing browsing metadata and leaving replies unsigned unless paired with DNSSEC.",
      facts: [
        { label: "Transport", value: "Plain UDP port 53" },
        { label: "Readable by", value: "Local Wi-Fi and transit ISPs" },
        { label: "Tamperable", value: "Yes, unless integrity protected" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "dns"] },
            { type: "focus", actors: ["laptop", "router", "internet", "dns"] },
          ],
        },
        dnsQuery({
          id: "doh-plain-q",
          from: "laptop",
          to: "dns",
          via: ["router", "internet"],
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          srcPort: DNS_CLIENT_PORT,
          txId: 0x4101,
          qname: WEB_DOMAIN,
          qtype: "A",
          time: 0.0,
        }),
        {
          type: "note",
          id: "note-sniff",
          at: "router",
          text: "Readable in plain text",
          tone: "error",
        },
        dnsResponse({
          id: "doh-plain-a",
          from: "dns",
          to: "laptop",
          via: ["internet", "router"],
          srcIp: RESOLVER_IP,
          dstIp: LAPTOP_IP,
          dstPort: DNS_CLIENT_PORT,
          txId: 0x4101,
          qname: WEB_DOMAIN,
          qtype: "A",
          answers: [{ name: WEB_DOMAIN, type: "A", ttl: 300, value: WEB_SERVER_IP }],
          time: 0.015,
        }),
      ],
    },
    {
      id: "https-tunnel",
      title: "Open HTTPS session to resolver",
      simple:
        "With DoH active, your browser opens a regular TCP and [[tls|TLS]] 1.3 connection to `dns.google` (`8.8.8.8`) on port 443 {{doh-tcp-syn}} {{doh-tls-client-hello}}. One kept-open session serves future queries.",
      technical:
        `The DoH client establishes an HTTPS channel to \`${RESOLVER_IP}:443\` with ALPN \`h2\`, keeping the multiplexed HTTP/2 stream pool open across lookups.`,
      facts: [
        { label: "Resolver", value: `dns.google (${RESOLVER_IP})` },
        { label: "Port", value: "TCP 443 (blends with HTTPS)" },
        { label: "Persistence", value: "Reused across queries" },
      ],
      events: [
        ...tcpHandshake({
          from: "laptop",
          to: "dns",
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          sport: EPHEMERAL_PORT_START + 2,
          dport: 443,
          startTime: 0.03,
          rtt: 0.015,
          prefix: "doh-tcp",
        }),
        ...tlsHandshake13({
          from: "laptop",
          to: "dns",
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          sport: EPHEMERAL_PORT_START + 2,
          dport: 443,
          serverName: "dns.google",
          alpn: "h2",
          startTime: 0.048,
          rtt: 0.015,
          prefix: "doh-tls",
        }),
      ],
    },
    {
      id: "doh-query",
      title: "Wrap DNS query in HTTP request",
      simple:
        "The DNS wire message rides inside an encrypted HTTP/2 request (`GET /dns-query?dns=...` or `POST`) marked `application/dns-message` {{doh-h2-q}}. Onlookers see only TLS ciphertext to port 443.",
      technical:
        "RFC 8484 carries standard DNS binary messages base64url-encoded in `GET` queries (caching-friendly) or raw in `POST` bodies, encrypted under TLS 1.3.",
      facts: [
        { label: "Endpoint", value: "/dns-query?dns=..." },
        { label: "Content type", value: "application/dns-message" },
        { label: "On the wire", value: "Encrypted TLS records" },
      ],
      events: [
        {
          type: "packet",
          id: "doh-h2-q",
          from: "laptop",
          to: "dns",
          via: ["router", "internet"],
          tone: "request",
          label: "DoH QUERY",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: RESOLVER_IP, protocol: "TCP (6)", totalLength: 184 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: 443, flags: "PSH, ACK", seq: 582, ack: 1665, payloadBytes: 144 }),
            h2Layer("HTTP/2 GET /dns-query?dns=... (inside TLS)", [
              { name: "Accept", value: "application/dns-message" },
              { name: "Query", value: `${WEB_DOMAIN} IN A` },
            ]),
          ],
          capture: {
            time: 0.075,
            src: LAPTOP_IP,
            dst: RESOLVER_IP,
            protocol: "TLSv1.3",
            info: "Application Data (HTTP/2 DoH GET /dns-query)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 144),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "doh-answer",
      title: "Return signed answer in HTTPS",
      simple:
        "The resolver answers HTTP `200 OK` holding the 49-byte binary DNS reply (`203.0.113.10`) inside TLS {{doh-h2-a}}. Because TLS authenticates `dns.google`, on-path attackers cannot forge the IP.",
      technical:
        "RFC 8484 §4.2 wraps the wire-format DNS response inside `200 OK` (`Content-Type: application/dns-message`), protecting confidentiality and integrity end to end between browser and resolver.",
      facts: [
        { label: "HTTP status", value: "200 OK" },
        { label: "DNS payload", value: `A ${WEB_SERVER_IP} (49 bytes)` },
        { label: "Integrity", value: "Protected by TLS" },
      ],
      events: [
        {
          type: "packet",
          id: "doh-h2-a",
          from: "dns",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "DoH ANSWER",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: RESOLVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 162 }),
            tcpLayer({ sport: 443, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1665, ack: 726, payloadBytes: 122 }),
            h2Layer("HTTP/2 200 OK (application/dns-message)", [
              { name: "Answer", value: `${WEB_DOMAIN} -> ${WEB_SERVER_IP}` },
            ]),
          ],
          capture: {
            time: 0.09,
            src: RESOLVER_IP,
            dst: LAPTOP_IP,
            protocol: "TLSv1.3",
            info: "Application Data (HTTP/2 200 DoH A 203.0.113.10)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 122),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "trust-limits",
      title: "Understand what stays visible",
      simple:
        "Your Wi-Fi network sees only HTTPS to `8.8.8.8`, not queried names. However, the DoH provider still sees every lookup, and subsequent visits expose the destination server IP and TLS [[sni|SNI]] unless ECH is used.",
      technical:
        "DoH shifts query visibility from your local ISP to the DoH resolver. Traffic analysis and subsequent TCP/TLS handshakes still reveal destination IPs and cleartext SNI hostnames without Encrypted Client Hello.",
      facts: [
        { label: "DoH resolver", value: "Sees every queried domain" },
        { label: "Next step", value: "Destination IP + SNI still visible" },
        { label: "Alternative", value: "DNS over TLS (port 853)" },
      ],
      events: [
        {
          type: "note",
          id: "note-trust",
          at: "dns",
          text: "Trust shifts to the resolver",
          tone: "lookup",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "Lookups shielded from the local path",
    simple:
      "Plain UDP lookups leak every site name and invite tampering. Over DoH, the same DNS wire message rides inside TLS on port 443, keeping names private on the path while placing trust in the resolver.",
    technical:
      "RFC 8484 DoH sealed binary DNS queries inside HTTP/2 over TLS 1.3 to dns.google, preventing on-path inspection or spoofing.",
    facts: [
      { label: "Path visibility", value: "HTTPS to 8.8.8.8 only" },
      { label: "Resolver view", value: "Sees every queried name" },
      { label: "Spoof defense", value: "TLS prevents MITM reply injection" },
      { label: "Follow-up leak", value: "Site IP & SNI unless ECH active" },
    ],
  },
  tryIt: [
    {
      title: "Send a DoH query directly with curl",
      explain: "Query a DoH JSON or wire endpoint over HTTPS to see the resolver respond on port 443.",
      commands: [
        { os: "windows", cmd: "curl -H \"accept: application/dns-json\" \"https://dns.google/resolve?name=example.com&type=A\"" },
        { os: "macos", cmd: "curl -H 'accept: application/dns-json' 'https://dns.google/resolve?name=example.com&type=A'" },
        { os: "linux", cmd: "curl -H 'accept: application/dns-json' 'https://dns.google/resolve?name=example.com&type=A'" },
      ],
    },
  ],
});
