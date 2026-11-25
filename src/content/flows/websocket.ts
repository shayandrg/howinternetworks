import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, WEB_DOMAIN, WEB_SERVER_IP } from "../world";

function wsLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "WebSocket", summary, fields };
}

export const websocketFlow = defineFlow({
  meta: {
    slug: "websocket",
    kind: "flow",
    collection: "protocols",
    group: "web",
    title: "WebSocket",
    fullName: "The WebSocket Protocol",
    tagline: "Full-duplex framed messaging upgraded from HTTP",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["http", "tcp"],
    related: ["http", "https", "tls", "tcp"],
    tags: ["websocket", "ws", "upgrade", "push", "realtime"],
    sources: [
      {
        label: "RFC 6455: The WebSocket Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc6455",
      },
      {
        label: "WHATWG WebSockets Standard",
        url: "https://websockets.spec.whatwg.org/",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[websocket|WebSocket]] keeps one connection open between browser and server so either side can send messages immediately for chat, live scores, or games. It starts as an HTTP Upgrade request, then switches to tiny frames.",
    technical:
      "Defined in RFC 6455, WebSocket begins with an HTTP/1.1 `Upgrade: websocket` handshake (`101 Switching Protocols`) on port 80 (`ws://`) or TLS port 443 (`wss://`), then exchanges framed messages with 2-14 byte headers.",
  },
  facts: [
    { label: "Layer", value: "Application (over TCP / TLS)" },
    { label: "Ports", value: "80 (ws://), 443 (wss://)" },
    { label: "Handshake", value: "HTTP Upgrade -> 101 Switching" },
    { label: "Frame header", value: "2 to 14 bytes (masked from client)" },
    { label: "Defined in", value: "RFC 6455" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your browser", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
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
      id: "tcp-open",
      title: "Open TCP socket on port 80",
      simple:
        "Calling `new WebSocket(\"ws://www.example.com/chat\")` begins with an ordinary TCP handshake to port 80 {{ws-tcp-syn}}. Production apps use `wss://` over TLS on port 443; `ws://` shows raw bytes.",
      technical:
        "Plain WebSocket establishes TCP to port 80 (`wss://` layers TLS 1.3 via ALPN `http/1.1` before the HTTP Upgrade).",
      facts: [
        { label: "Target URL", value: `ws://${WEB_DOMAIN}/chat` },
        { label: "Transport", value: "TCP port 80" },
        { label: "Encrypted variant", value: "wss:// (TCP 443 + TLS)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "web"] },
            { type: "focus", actors: ["laptop", "router", "internet", "web"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "web",
          srcIp: LAPTOP_IP,
          dstIp: WEB_SERVER_IP,
          dport: 80,
          startTime: 0.0,
          rtt: 0.018,
          prefix: "ws-tcp",
        }),
      ],
    },
    {
      id: "upgrade-req",
      title: "Request Upgrade to WebSocket",
      simple:
        "The browser sends an HTTP `GET /chat` carrying `Upgrade: websocket` and a random 16-byte Base64 `Sec-WebSocket-Key` {{ws-req}}.",
      technical:
        "RFC 6455 §4.1 sends `Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Version: 13`, and a random 16-byte nonce in `Sec-WebSocket-Key`.",
      facts: [
        { label: "Method", value: "GET /chat HTTP/1.1" },
        { label: "Headers", value: "Upgrade: websocket, Connection: Upgrade" },
        { label: "Challenge", value: "Sec-WebSocket-Key (16 B Base64)" },
      ],
      events: [
        {
          type: "packet",
          id: "ws-req",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "request",
          label: "GET UPGRADE",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 260 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: 80, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 220 }),
            {
              name: "HTTP/1.1 Upgrade",
              summary: "GET /chat (Upgrade: websocket)",
              fields: [
                { name: "Upgrade / Connection", value: "websocket / Upgrade" },
                { name: "Sec-WebSocket-Key", value: "dGhlIHNhbXBsZSBub25jZQ==" },
              ],
            },
          ],
          capture: {
            time: 0.025,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "HTTP",
            info: "GET /chat HTTP/1.1 (Upgrade: websocket)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 220),
          },
        },
        { type: "wait", ms: 400 },
      ],
    },
    {
      id: "switch-101",
      title: "Accept switch with 101 status",
      simple:
        "The server replies `101 Switching Protocols` with `Sec-WebSocket-Accept` (SHA-1 of the key plus a fixed RFC GUID) {{ws-101}}. HTTP ends here and both peers now speak binary WebSocket frames.",
      technical:
        "`Sec-WebSocket-Accept` proves RFC 6455 handshake support without cross-protocol confusion (`SHA-1(key + 258EAFA5-E914-47DA-95CA-C5AB0DC85B11)` base64).",
      facts: [
        { label: "Status", value: "101 Switching Protocols" },
        { label: "Proof", value: "Sec-WebSocket-Accept (SHA-1)" },
        { label: "Protocol state", value: "HTTP ended -> WebSocket frames" },
      ],
      events: [
        {
          type: "packet",
          id: "ws-101",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "101 SWITCHING",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 190 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1, ack: 221, payloadBytes: 150 }),
            wsLayer("HTTP/1.1 101 Switching Protocols", [
              { name: "Sec-WebSocket-Accept", value: "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" },
            ]),
          ],
          capture: {
            time: 0.043,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "HTTP",
            info: "HTTP/1.1 101 Switching Protocols (WebSocket active)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 150),
          },
        },
        {
          type: "note",
          id: "note-ws",
          at: "laptop",
          text: "Switched to WebSocket",
          tone: "response",
        },
      ],
    },
    {
      id: "bidirectional-frames",
      title: "Send and push small frames",
      simple:
        "Sending `Hello` takes only 11 bytes: a 2-byte header, 4-byte browser masking key, and 5 masked bytes {{ws-c2s}}. Unmasked server replies can push back any time without a client request {{ws-s2c}}.",
      technical:
        "RFC 6455 §5.3 mandates XOR masking on all client-to-server frames (4-byte mask key) to prevent proxy cache poisoning, while server-to-client frames omit the mask key.",
      facts: [
        { label: "Client -> Server", value: "11 B (2 B hdr + 4 B mask + 5 B)" },
        { label: "Server -> Client", value: "Unmasked push whenever ready" },
        { label: "Opcode", value: "1 (UTF-8 Text frame)" },
      ],
      events: [
        {
          type: "packet",
          id: "ws-c2s",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "data",
          label: "TEXT 'Hello'",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 51 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: 80, flags: "PSH, ACK", seq: 221, ack: 151, payloadBytes: 11 }),
            wsLayer("FIN=1, Opcode=1 (Text), MASK=1, len=5", [
              { name: "Header + Mask", value: "2 bytes + 4-byte XOR mask" },
              { name: "Payload", value: "Hello (masked on wire)" },
            ]),
          ],
          capture: {
            time: 0.1,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "WebSocket",
            info: "Text (Opcode 1), Masked, len=5",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 11),
          },
        },
        {
          type: "packet",
          id: "ws-s2c",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "data",
          label: "TEXT PUSH",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 54 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 151, ack: 232, payloadBytes: 14 }),
            wsLayer("FIN=1, Opcode=1 (Text), MASK=0, len=12", [
              { name: "Push direction", value: "Server unsolicited frame (unmasked)" },
            ]),
          ],
          capture: {
            time: 2.1,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "WebSocket",
            info: "Text (Opcode 1), Unmasked push, len=12",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 14),
          },
        },
      ],
    },
    {
      id: "keepalive-ping",
      title: "Keep socket warm via Ping/Pong",
      simple:
        "During quiet periods the server sends a 2-byte control `Ping` (opcode 9) {{ws-ping}} so NATs and firewalls keep the mapping alive. The browser replies with `Pong` (opcode 10) automatically {{ws-pong}}.",
      technical:
        "Control frames (Ping `0x9`, Pong `0xA`) operate transparently inside the protocol layer without waking application JavaScript listeners.",
      facts: [
        { label: "Ping frame", value: "Opcode 9 (2 bytes header)" },
        { label: "Pong reply", value: "Opcode 10 (handled by browser)" },
        { label: "Purpose", value: "Prevent NAT/firewall idle timeout" },
      ],
      events: [
        {
          type: "packet",
          id: "ws-ping",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "control",
          label: "PING (OP 9)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 42 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 165, ack: 232, payloadBytes: 2 }),
            wsLayer("Ping (FIN=1, Opcode=9, 2 B)", [{ name: "Interval", value: "~30 s idle keepalive" }]),
          ],
          capture: {
            time: 32.0,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "WebSocket",
            info: "Ping (Opcode 9), len=0",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 2),
          },
        },
        {
          type: "packet",
          id: "ws-pong",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "control",
          label: "PONG (OP 10)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 46 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: 80, flags: "PSH, ACK", seq: 232, ack: 167, payloadBytes: 6 }),
            wsLayer("Pong (FIN=1, Opcode=10, Masked, 6 B)", [{ name: "Role", value: "Automatic browser heartbeat reply" }]),
          ],
          capture: {
            time: 32.018,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "WebSocket",
            info: "Pong (Opcode 10), Masked",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 6),
          },
        },
      ],
    },
    {
      id: "close",
      title: "Shut down cleanly via Close",
      simple:
        "Closing the socket exchanges `Close` frames (opcode 8) carrying status `1000` (normal closure) {{ws-close-c}} {{ws-close-s}} before TCP tears down.",
      technical:
        "RFC 6455 §5.5.1 exchanges `Close` control frames (`1000` normal closure, or `1001` going away on tab close) cleanly before ending TCP.",
      facts: [
        { label: "Close opcode", value: "Opcode 8" },
        { label: "Reason code", value: "1000 (Normal) or 1001 (Leaving)" },
        { label: "Next", value: "Underlying TCP connection closes" },
      ],
      events: [
        {
          type: "packet",
          id: "ws-close-c",
          from: "laptop",
          to: "web",
          via: ["router", "internet"],
          tone: "handshake",
          label: "CLOSE (1000)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: WEB_SERVER_IP, protocol: "TCP (6)", totalLength: 48 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: 80, flags: "PSH, ACK", seq: 238, ack: 167, payloadBytes: 8 }),
            wsLayer("Connection Close (Opcode=8, Code=1000)", [{ name: "Status", value: "1000 Normal Closure" }]),
          ],
          capture: {
            time: 40.0,
            src: LAPTOP_IP,
            dst: WEB_SERVER_IP,
            protocol: "WebSocket",
            info: "Connection Close (1000 Normal)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 8),
          },
        },
        {
          type: "packet",
          id: "ws-close-s",
          from: "web",
          to: "laptop",
          via: ["internet", "router"],
          tone: "handshake",
          label: "CLOSE (1000)",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: WEB_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 44 }),
            tcpLayer({ sport: 80, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 167, ack: 246, payloadBytes: 4 }),
            wsLayer("Connection Close (Opcode=8, Code=1000)", [{ name: "State", value: "Clean close confirmed" }]),
          ],
          capture: {
            time: 40.018,
            src: WEB_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "WebSocket",
            info: "Connection Close (1000 Normal ACK)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 4),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Upgraded HTTP became a two-way pipe",
    simple:
      "A single HTTP Upgrade handshake converted the TCP connection into a lightweight binary frame channel where either side could transmit messages immediately.",
    technical:
      "Completed RFC 6455 HTTP/1.1 101 Upgrade, bidirectional text frames, Ping/Pong keepalive, and status 1000 close handshake.",
    facts: [
      { label: "Upgrade", value: "GET Upgrade -> 101 Switching" },
      { label: "Control overhead", value: "2 bytes minimum (Ping)" },
      { label: "Push capability", value: "Either side can send unprompted" },
      { label: "Production", value: "wss:// inside TLS (port 443)" },
    ],
  },
  tryIt: [
    {
      title: "Inspect a WebSocket Upgrade handshake",
      explain: "Check the HTTP 101 Upgrade headers sent during an initial WebSocket negotiation.",
      commands: [
        { os: "windows", cmd: "curl -i -N -H \"Connection: Upgrade\" -H \"Upgrade: websocket\" -H \"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\" -H \"Sec-WebSocket-Version: 13\" https://echo.websocket.events" },
        { os: "macos", cmd: "curl -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13' https://echo.websocket.events" },
        { os: "linux", cmd: "curl -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13' https://echo.websocket.events" },
      ],
    },
  ],
});
