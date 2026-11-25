import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

function quicLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "QUIC + HTTP/3", summary, fields };
}

export const quicFlow = defineFlow({
  meta: {
    slug: "quic",
    kind: "flow",
    collection: "protocols",
    group: "delivery",
    title: "QUIC & HTTP/3",
    fullName: "QUIC Transport and HTTP/3",
    tagline: "Multiplexed encrypted transport over UDP in one round trip",
    layer: { tcpip: "transport", osi: 4 },
    prerequisites: ["udp", "tls", "http"],
    related: ["udp", "tls", "https", "tcp"],
    tags: ["quic", "http3", "udp", "0-rtt", "multiplexing"],
    sources: [
      {
        label: "RFC 9000: QUIC: A UDP-Based Multiplexed and Secure Transport",
        url: "https://www.rfc-editor.org/rfc/rfc9000",
      },
      {
        label: "RFC 9001: Using TLS to Secure QUIC",
        url: "https://www.rfc-editor.org/rfc/rfc9001",
      },
      {
        label: "RFC 9114: HTTP/3",
        url: "https://www.rfc-editor.org/rfc/rfc9114",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[quic|QUIC]] builds reliable, encrypted [[tls|TLS]] 1.3 delivery directly over [[udp|UDP]] port 443. Merging transport and encryption cuts handshake latency to one round trip, keeps streams independent when packets drop, and survives Wi-Fi-to-cellular switches.",
    technical:
      "Defined in RFC 9000, RFC 9001, and RFC 9114, QUIC carries independent streams inside encrypted UDP datagrams identified by Connection IDs, preventing TCP head-of-line blocking and supporting 0-RTT resumption.",
  },
  facts: [
    { label: "Layer", value: "Transport (over UDP port 443)" },
    { label: "Encryption", value: "TLS 1.3 built directly in" },
    { label: "Setup time", value: "1 RTT (0 RTT when resuming)" },
    { label: "Streams", value: "Independent (no HoL blocking)" },
    { label: "Defined in", value: "RFC 9000, RFC 9001, RFC 9114" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "web", kind: "web-server", label: WEB_DOMAIN, sublabel: WEB_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "web", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "discovery",
      title: "Discover HTTP/3 support first",
      simple:
        "From an earlier `Alt-Svc: h3=\":443\"` header or a DNS `HTTPS` record, your browser already knows `www.example.com` speaks HTTP/3 on UDP 443. It skips TCP completely.",
      technical:
        "RFC 9114 clients discover QUIC endpoints via HTTP `Alt-Svc` headers or DNS `HTTPS` service bindings (SVCB), jumping straight to UDP port 443.",
      facts: [
        { label: "Discovery hint", value: 'Alt-Svc: h3=":443" or DNS HTTPS' },
        { label: "Transport", value: "UDP port 443" },
        { label: "Built-in crypto", value: "TLS 1.3 (ALPN: h3)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "web"] },
          ],
        },
        {
          type: "note",
          id: "quic-note-h3",
          at: "laptop",
          text: 'Hint cached: h3=":443"',
          tone: "lookup",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "initial",
      title: "Send padded Initial datagrams",
      simple:
        "No TCP handshake happens first: the opening packets carry TLS `ClientHello` inside two Initial datagrams padded to over 1,200 bytes {{quic-init-1}} {{quic-init-2}}. Padding prevents UDP amplification attacks.",
      technical:
        "RFC 9000 §14.1 requires client Initial datagrams to span at least 1,200 bytes; servers limit unverified responses to 3x the bytes received until the client proves ownership of its source IP.",
      facts: [
        { label: "Datagrams sent", value: "2 x 1,250 B Initial packets" },
        { label: "Payload", value: "TLS ClientHello (with PQ share)" },
        { label: "Anti-amplification", value: "Minimum 1,200 B padding; 3x cap" },
      ],
      events: [
        {
          type: "packet",
          id: "quic-init-1",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "handshake",
          label: "INITIAL 1",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "UDP (17)", totalLength: 1250 }),
            udpLayer({ sport: EPHEMERAL_PORT_START, dport: 443, length: 1230 }),
            quicLayer("QUIC Initial DCID=a1b2c3d4 (ClientHello fragment 1)", [
              { name: "CRYPTO offset", value: "0..1180" },
              { name: "Obfuscation", value: "Initial salt keys (RFC 9001)" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "QUIC",
            info: "Initial (ClientHello part 1), PKN=0, len=1250",
            bytes: padFrameBytes(14 + 1250),
          },
        },
        {
          type: "packet",
          id: "quic-init-2",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "handshake",
          label: "INITIAL 2",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "UDP (17)", totalLength: 1250 }),
            udpLayer({ sport: EPHEMERAL_PORT_START, dport: 443, length: 1230 }),
            quicLayer("QUIC Initial (ClientHello fragment 2 + PADDING)", [
              { name: "CRYPTO offset", value: "1180..1880 + PADDING" },
            ]),
          ],
          capture: {
            time: 0.001,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "QUIC",
            info: "Initial (ClientHello part 2 + PADDING), PKN=1",
            bytes: padFrameBytes(14 + 1250),
          },
        },
      ],
    },
    {
      id: "server-hello",
      title: "Receive ServerHello and keys",
      simple:
        "The server replies with `ServerHello` in an Initial packet {{quic-sh}}, then immediately sends its certificate, signature, and `Finished` in encrypted Handshake packets {{quic-hs}}.",
      technical:
        "Initial + Handshake packets coalesce within 4 UDP datagrams (well under the 3x server byte limit), establishing shared handshake keys before sending Certificate and CertificateVerify.",
      facts: [
        { label: "Initial", value: "ACK + TLS ServerHello" },
        { label: "Handshake", value: "Encrypted Cert + CertVerify + Finished" },
        { label: "Amplification budget", value: "Under 3x client Initial bytes" },
      ],
      events: [
        {
          type: "packet",
          id: "quic-sh",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "INITIAL (SH)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: 260 }),
            udpLayer({ sport: 443, dport: EPHEMERAL_PORT_START, length: 240 }),
            quicLayer("QUIC Initial (ACK + ServerHello)", [
              { name: "Key share", value: "X25519 / hybrid" },
            ]),
          ],
          capture: {
            time: 0.018,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "QUIC",
            info: "Initial (ServerHello + ACK)",
            bytes: padFrameBytes(14 + 260),
          },
        },
        {
          type: "packet",
          id: "quic-hs",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "HANDSHAKE (CERT)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: 1250 }),
            udpLayer({ sport: 443, dport: EPHEMERAL_PORT_START, length: 1230 }),
            quicLayer("QUIC Handshake (Protected Cert + Verify + Finished)", [
              { name: "Encryption", value: "Handshake AEAD keys" },
            ]),
          ],
          capture: {
            time: 0.02,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "QUIC",
            info: "Handshake (EncryptedExtensions, Certificate, Finished)",
            bytes: padFrameBytes(14 + 1250),
          },
        },
      ],
    },
    {
      id: "finished-get",
      title: "Send Finished and GET in 1 RTT",
      simple:
        "After checking the certificate, your laptop emits `Finished` {{quic-fin}} alongside its HTTP/3 request in a 1-RTT packet {{quic-get}}: `HEADERS` compressed via QPACK on stream 0, one round trip faster than TCP + TLS.",
      technical:
        "RFC 9114 maps HTTP/3 requests onto bidirectional QUIC streams (`HEADERS` frame on Stream 0 with QPACK header compression), transmitting in 1 RTT from connection start (vs 2 RTT for TCP + TLS 1.3).",
      facts: [
        { label: "Total setup", value: "1 round trip before GET leaves" },
        { label: "HTTP/3 framing", value: "HEADERS (QPACK) on Stream 0" },
        { label: "Packet type", value: "QUIC 1-RTT Short Header" },
      ],
      events: [
        {
          type: "packet",
          id: "quic-fin",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "secure",
          label: "FINISHED",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "UDP (17)", totalLength: 100 }),
            udpLayer({ sport: EPHEMERAL_PORT_START, dport: 443, length: 80 }),
            quicLayer("QUIC Handshake (TLS Finished)", [{ name: "State", value: "Client handshake complete" }]),
          ],
          capture: {
            time: 0.036,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "QUIC",
            info: "Handshake (TLS Finished)",
            bytes: padFrameBytes(14 + 100),
          },
        },
        {
          type: "packet",
          id: "quic-get",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "request",
          label: "H3 GET /",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "UDP (17)", totalLength: 180 }),
            udpLayer({ sport: EPHEMERAL_PORT_START, dport: 443, length: 160 }),
            quicLayer("QUIC 1-RTT Stream 0: HTTP/3 HEADERS GET /", [
              { name: "Header compression", value: "QPACK" },
              { name: "Timing", value: "First app data at 1 RTT (36 ms)" },
            ]),
          ],
          capture: {
            time: 0.037,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "HTTP3",
            info: "1-RTT Stream 0: HEADERS GET /",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 152),
          },
        },
      ],
    },
    {
      id: "response-streams",
      title: "Run isolated streams in parallel",
      simple:
        "The server confirms `HANDSHAKE_DONE` and returns `200 OK` + page bytes on stream 0 {{quic-200}}. Because each HTTP/3 request uses an independent QUIC stream, one dropped packet only delays that stream.",
      technical:
        "Over TCP, a single lost segment pauses every multiplexed HTTP/2 stream (head-of-line blocking). QUIC schedules streams separately so unaffected streams keep rendering while lost frames retransmit {{quic-ack}}.",
      facts: [
        { label: "Packet loss", value: "Stalls only the affected stream" },
        { label: "Header bits", value: "Packet numbers & ACK encrypted" },
        { label: "Ack sent", value: "1-RTT ACK confirms receipt" },
      ],
      events: [
        {
          type: "packet",
          id: "quic-200",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "data",
          label: "200 + DATA",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: 1200 }),
            udpLayer({ sport: 443, dport: EPHEMERAL_PORT_START, length: 1180 }),
            quicLayer("1-RTT HANDSHAKE_DONE + Stream 0 HEADERS (200) + DATA", [
              { name: "Multiplexing", value: "Independent per-stream delivery" },
            ]),
          ],
          capture: {
            time: 0.056,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP3",
            info: "1-RTT Stream 0: HEADERS 200 OK + DATA",
            bytes: padFrameBytes(14 + 1200),
          },
        },
        {
          type: "packet",
          id: "quic-ack",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "handshake",
          label: "ACK (1-RTT)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "UDP (17)", totalLength: 84 }),
            udpLayer({ sport: EPHEMERAL_PORT_START, dport: 443, length: 64 }),
            quicLayer("1-RTT ACK (encrypted header fields)", [{ name: "Status", value: "All stream 0 bytes received" }]),
          ],
          capture: {
            time: 0.06,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "QUIC",
            info: "1-RTT ACK",
            bytes: padFrameBytes(14 + 84),
          },
        },
      ],
    },
    {
      id: "migration",
      title: "Survive IP swaps via Connect ID",
      simple:
        "QUIC identifies a session by a Connection ID rather than IP and port. Moving from Wi-Fi to cellular keeps the download alive after a quick path check, and return visits can send data in 0 RTT.",
      technical:
        "RFC 9000 §9 Connection Migration validates a new client IP/port with `PATH_CHALLENGE` / `PATH_RESPONSE` without breaking active TLS keys or streams; session tickets enable 0-RTT early data on subsequent visits.",
      facts: [
        { label: "Session key", value: "Connection ID (not IP:port 4-tuple)" },
        { label: "Network roaming", value: "Continues cleanly across IP changes" },
        { label: "Repeat visits", value: "0-RTT sends GET in Initial flight" },
      ],
      events: [
        {
          type: "note",
          id: "quic-note-cid",
          at: "laptop",
          text: "Connection ID survives Wi-Fi -> 5G",
          tone: "response",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "Page delivered in one round trip",
    simple:
      "QUIC combined transport setup and TLS 1.3 into one round trip so the page request left after 36 ms. Nearly every byte including transport acknowledgments stayed encrypted, and streams stayed isolated.",
    technical:
      "QUIC/HTTP3 established TLS 1.3 + transport in 1 RTT over UDP 443, multiplexed QPACK streams independently, and bound session state to Connection IDs.",
    facts: [
      { label: "Setup latency", value: "1 RTT (0 RTT returning)" },
      { label: "Transport", value: "UDP port 443" },
      { label: "Head-of-line fix", value: "Loss stalls one stream only" },
      { label: "Mobility", value: "Connection IDs survive IP change" },
    ],
  },
  tryIt: [
    {
      title: "Test HTTP/3 / QUIC support with curl",
      explain: "Modern curl builds (with HTTP/3 enabled) can request a URL directly over QUIC.",
      commands: [
        { os: "windows", cmd: "curl --http3 -I https://cloudflare-quic.com" },
        { os: "macos", cmd: "curl --http3 -I https://cloudflare-quic.com" },
        { os: "linux", cmd: "curl --http3 -I https://cloudflare-quic.com" },
      ],
    },
  ],
});
