import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, TCP_BASE_HEADER, tcpFrameBytes } from "../builders/sizes";
import { tcpClose } from "../builders/tcp";
import { tlsHandshake13 } from "../builders/tls";
import { httpRequest, httpResponse } from "../builders/http";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

const TLS_OVERHEAD = 22; // 5 B record header + 1 B inner content type + 16 B AEAD tag (RFC 8446)

export const tlsFlow = defineFlow({
  meta: {
    slug: "tls",
    kind: "flow",
    collection: "protocols",
    group: "security",
    title: "TLS",
    fullName: "Transport Layer Security",
    tagline: "Encrypting connections and verifying identity on the wire",
    layer: {
      tcpip: "application",
      note: "Sits between TCP and the application. Often called layer 6, but it does not map neatly onto OSI",
    },
    prerequisites: ["tcp"],
    related: ["tcp", "https", "quic", "ssh", "dns-over-https"],
    tags: ["tls", "encryption", "certificates", "handshake", "rfc8446"],
    sources: [
      {
        label: "RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3",
        url: "https://www.rfc-editor.org/rfc/rfc8446",
      },
      {
        label: "RFC 7301: Transport Layer Security (TLS) Application-Layer Protocol Negotiation",
        url: "https://www.rfc-editor.org/rfc/rfc7301",
      },
      {
        label: "RFC 6066: Transport Layer Security (TLS) Extensions (SNI)",
        url: "https://www.rfc-editor.org/rfc/rfc6066",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[tls|TLS]] wraps a [[tcp|TCP]] connection in encryption and checks the server's [[certificate]]. It keeps eavesdroppers from reading or altering messages in transit.",
    technical:
      "Transport Layer Security 1.3 (RFC 8446) sits above TCP and below application protocols such as [[https|HTTPS]] or [[imap|IMAP]]. In one round trip it negotiates cipher suites, exchanges ephemeral keys, verifies the server certificate chain, and derives AEAD session keys.",
  },
  facts: [
    { label: "Layer", value: "Between TCP and application" },
    { label: "Current version", value: "TLS 1.3 (1-RTT handshake)" },
    { label: "Legacy retired", value: "SSL 2/3, TLS 1.0, TLS 1.1" },
    { label: "Identity proof", value: "X.509 certificate chain" },
    { label: "Defined in", value: "RFC 8446, RFC 7301" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 360, y: 300 } },
      { id: "internet", kind: "cloud", label: "Internet", at: { x: 610, y: 300 } },
      { id: "web", kind: "web-server", label: "Web server", sublabel: WEB_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop", "router", "internet", "web"],
      focus: ["laptop", "router", "internet", "web"],
    },
  },
  steps: [
    {
      id: "client-hello",
      title: "Offer versions and key shares",
      simple:
        "After TCP connects, your laptop sends a ClientHello {{tls13-client-hello}} listing supported ciphers, key shares, and the domain name it wants to reach.",
      technical:
        "The client sends ClientHello carrying TLS 1.3, AEAD cipher suites, key-share groups (`x25519` or hybrid), [[sni|SNI]] (`www.example.com`, RFC 6066), and [[alpn|ALPN]] (`http/1.1`, RFC 7301) {{tls13-client-hello}}.",
      facts: [
        { label: "Versions", value: "TLS 1.3 (legacy 1.2 fallback)" },
        { label: "SNI", value: WEB_DOMAIN },
        { label: "ALPN", value: "h2, http/1.1" },
      ],
      events: [
        tlsHandshake13({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START,
          dport: 443,
          serverName: WEB_DOMAIN,
          alpn: "h2, http/1.1",
          startTime: 0.0,
          rtt: 0.02,
          prefix: "tls13",
        })[0],
      ],
    },
    {
      id: "server-hello-cert",
      title: "Pick cipher and prove identity",
      simple:
        "The server picks TLS 1.3 and sends its key share {{tls13-server-hello}}. Both sides compute the shared secret, and the server's [[certificate]] arrives already encrypted.",
      technical:
        "The server sends ServerHello in the clear with its chosen cipher and key share, then encrypts EncryptedExtensions, Certificate chain, CertificateVerify signature, and Finished under handshake keys {{tls13-server-hello}} (RFC 8446).",
      facts: [
        { label: "Cipher suite", value: "TLS_AES_128_GCM_SHA256" },
        { label: "Chain", value: "Leaf -> intermediate -> root CA" },
        { label: "Encrypted from", value: "Right after ServerHello" },
      ],
      events: [
        tlsHandshake13({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START,
          dport: 443,
          serverName: WEB_DOMAIN,
          alpn: "h2, http/1.1",
          startTime: 0.0,
          rtt: 0.02,
          prefix: "tls13",
        })[1],
        {
          type: "note",
          id: "note-cert-ok",
          at: "laptop",
          text: "Certificate verified",
          tone: "secure",
        },
      ],
    },
    {
      id: "client-finished",
      title: "Confirm transcript with Finished",
      simple:
        "Your laptop verifies the certificate chain and sends its Finished check {{tls13-client-finished}}. Any tampering during the handshake would fail this check.",
      technical:
        "The client sends an encrypted Finished MAC over the entire handshake transcript {{tls13-client-finished}}. TLS 1.3 completes key agreement in 1 round trip (compared to 2 in TLS 1.2).",
      facts: [
        { label: "Round trips", value: "1 RTT (TLS 1.2 needed 2)" },
        { label: "Transcript check", value: "HMAC over all handshake bytes" },
        { label: "Keys active", value: "Application traffic keys" },
      ],
      events: [
        tlsHandshake13({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START,
          dport: 443,
          serverName: WEB_DOMAIN,
          alpn: "h2, http/1.1",
          startTime: 0.0,
          rtt: 0.02,
          prefix: "tls13",
        })[2],
        { type: "wait", ms: 800 },
      ],
    },
    {
      id: "encrypted-data",
      title: "Send encrypted application data",
      simple:
        "Application messages now travel inside encrypted TLS records {{tls-app-req}} {{tls-app-res}}. Outsiders see only addresses, SNI, packet sizes, and timing.",
      technical:
        `Each TLS 1.3 record adds ${TLS_OVERHEAD} bytes (5 B record header + 1 B inner type + 16 B AEAD authentication tag) around encrypted application bytes {{tls-app-req}} {{tls-app-res}} (RFC 8446).`,
      facts: [
        { label: "Record overhead", value: `${TLS_OVERHEAD} bytes per record` },
        { label: "Authentication", value: "16-byte AEAD tag detects tampering" },
        { label: "Still visible", value: "IPs, ports, SNI, byte lengths" },
      ],
      events: [
        httpRequest({
          id: "tls-app-req",
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START,
          dport: 443,
          host: WEB_DOMAIN,
          time: 0.025,
          encrypted: true,
          label: "App Data (Req)",
        }),
        httpResponse({
          id: "tls-app-res",
          from: "web",
          to: "laptop",
          srcIp: WEB_SERVER_IP,
          dstIp: LAPTOP_IP,
          sport: 443,
          dport: EPHEMERAL_PORT_START,
          bodyBytes: 1200,
          time: 0.045,
          encrypted: true,
          label: "App Data (Res)",
        }),
      ],
    },
    {
      id: "close-notify",
      title: "End cleanly with close_notify",
      simple:
        "Before closing TCP, the server sends an encrypted `close_notify` alert {{tls-alert}} so your laptop knows the stream ended on purpose, not from an attacker cutting it.",
      technical:
        "Sending an authenticated `close_notify` alert {{tls-alert}} prevents truncation attacks before tearing down the underlying TCP socket {{tls-fin-fin-1}} {{tls-fin-ack-1}} {{tls-fin-fin-2}} {{tls-fin-ack-2}} (RFC 8446).",
      facts: [
        { label: "Alert", value: "close_notify (encrypted)" },
        { label: "Purpose", value: "Prevents truncation attacks" },
        { label: "Followed by", value: "TCP FIN handshake" },
      ],
      events: [
        {
          type: "packet",
          id: "tls-alert",
          from: "web",
          to: "laptop",
          tone: "secure",
          label: "close_notify",
          locked: true,
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: IPV4_HEADER + TCP_BASE_HEADER + 24 }),
            tcpLayer({ sport: 443, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1500, ack: 700, payloadBytes: 24 }),
            {
              name: "TLS 1.3 Encrypted Alert",
              encrypted: true,
              summary: "Alert: close_notify (24 B)",
              fields: [{ name: "Alert Description", value: "close_notify (0)" }],
            },
          ],
          capture: {
            time: 0.07,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "TLSv1.3",
            info: "Encrypted Alert (close_notify)",
            bytes: tcpFrameBytes(0, 24).frameBytes,
          },
        },
        ...tcpClose({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          sport: EPHEMERAL_PORT_START,
          dport: 443,
          clientSeq: 700,
          serverSeq: 1524,
          startTime: 0.075,
          rtt: 0.02,
          prefix: "tls-fin",
        }),
      ],
    },
  ],
  outro: {
    title: "Channel authenticated and sealed",
    simple:
      "In one round trip, both sides agreed on keys and verified the server's certificate. Every message after ServerHello was encrypted and protected against tampering.",
    technical:
      "TLS 1.3 negotiated AEAD encryption, verified the server's X.509 certificate, protected application records with 22 bytes of overhead, and closed with `close_notify`.",
    facts: [
      { label: "Version", value: "TLS 1.3 (RFC 8446)" },
      { label: "Setup", value: "1 round trip" },
      { label: "Cipher", value: "TLS_AES_128_GCM_SHA256" },
      { label: "Record overhead", value: `${TLS_OVERHEAD} bytes` },
    ],
  },
  tryIt: [
    {
      title: "Inspect a live TLS 1.3 handshake",
      explain:
        "Connect to example.com on port 443 and inspect the negotiated TLS version, cipher suite, and certificate chain.",
      commands: [
        { os: "windows", cmd: "openssl s_client -connect example.com:443 -servername example.com" },
        { os: "macos", cmd: "openssl s_client -connect example.com:443 -servername example.com" },
        { os: "linux", cmd: "openssl s_client -connect example.com:443 -servername example.com" },
      ],
    },
  ],
});
