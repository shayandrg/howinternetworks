import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { padFrameBytes } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, SERVER_MAC } from "../world";

const INGEST_IP = "203.0.113.60";
const RTMP_PORT = 1935;

function rtmpLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "RTMP", summary, fields };
}

export const rtmpFlow = defineFlow({
  meta: {
    slug: "rtmp",
    kind: "flow",
    collection: "protocols",
    group: "calls",
    title: "RTMP",
    fullName: "Real-Time Messaging Protocol",
    tagline: "Chunked live video and audio ingest to streaming servers",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["tcp"],
    related: ["rtsp", "webrtc", "tls", "tcp"],
    tags: ["rtmp", "streaming", "obs", "ingest", "amf0"],
    sources: [
      {
        label: "IANA Service Name and Transport Protocol Port Number Registry (rtmp 1935)",
        url: "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml",
      },
    ],
    status: "draft",
    lastVerified: "2026-11-26",
    reviewNotes: [
      "Marked draft: Adobe's 2012 RTMP 1.0 specification PDF is not hosted on an active allowlisted primary Adobe spec URL; TCP port 1935 registration verified via IANA, while RTMP v3 handshake and AMF0 chunk sizing match the research sheet for final primary-spec verification.",
    ],
  },
  intro: {
    simple:
      "[[rtmp|RTMP]] carries live broadcasts from streaming apps such as OBS up to an ingest server. Over one TCP port 1935 connection, commands, H.264 video, and AAC sound ride together sliced into compact chunks.",
    technical:
      "Originally built for Flash, RTMP multiplexes AMF0 commands and chunked video/audio frames over TCP port 1935. Because standard RTMP transmits the stream key in plain text, live platforms wrap it inside TLS as RTMPS.",
  },
  facts: [
    { label: "Layer", value: "Application (TCP port 1935)" },
    { label: "Encrypted mode", value: "RTMPS (wrapped in TLS)" },
    { label: "Control format", value: "AMF0 binary commands" },
    { label: "Chunk size", value: "Negotiated (often 4,096 bytes)" },
    { label: "Registry", value: "IANA port 1935; Adobe 2012 spec" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "OBS streamer", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "ingest", kind: "server", label: "Ingest server", sublabel: INGEST_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-ing", from: "internet", to: "ingest", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "handshake",
      title: "Run TCP and RTMP v3 handshakes",
      simple:
        "After connecting TCP to port 1935 {{rtmp-tcp-syn}}, OBS swaps unencrypted RTMP version 3 handshakes: `C0+C1` (1,537 B) {{rtmp-c01}}, `S0+S1+S2` (3,073 B) {{rtmp-s012}}, and `C2` echoing 1,536 random bytes.",
      technical:
        "RTMP v3 handshake (`C0/C1/C2` and `S0/S1/S2`) exchanges echoed 1,536-octet random blocks for timing calibration without encryption.",
      facts: [
        { label: "Port", value: "TCP 1935" },
        { label: "RTMP version", value: "3 (unencrypted echo)" },
        { label: "Total exchanged", value: "3,073 bytes each direction" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "ingest"] },
            { type: "focus", actors: ["laptop", "router", "internet", "ingest"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "ingest",
          srcIp: LAPTOP_IP,
          dstIp: INGEST_IP,
          sport: EPHEMERAL_PORT_START + 14,
          dport: RTMP_PORT,
          startTime: 0.0,
          rtt: 0.018,
          prefix: "rtmp-tcp",
        }),
        {
          type: "packet",
          id: "rtmp-c01",
          from: "laptop",
          to: "ingest",
          via: ["router", "internet"],
          tone: "handshake",
          label: "C0+C1 (1,537 B)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: INGEST_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 14, dport: RTMP_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 1537 }),
            rtmpLayer("Handshake C0 (0x03) + C1 (1536 B)", [{ name: "Encryption", value: "None" }]),
          ],
          capture: {
            time: 0.025,
            src: LAPTOP_IP,
            dst: INGEST_IP,
            protocol: "RTMP",
            info: "Handshake C0+C1 (Version 3, 1537 bytes)",
            bytes: 1537 + 2 * 54,
          },
        },
        {
          type: "packet",
          id: "rtmp-s012",
          from: "ingest",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "S0+S1+S2 (3,073 B)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: INGEST_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: RTMP_PORT, dport: EPHEMERAL_PORT_START + 14, flags: "PSH, ACK", seq: 1, ack: 1538, payloadBytes: 3073 }),
            rtmpLayer("Handshake S0 + S1 + S2 (echoed C1)", [{ name: "Response size", value: "3,073 bytes" }]),
          ],
          capture: {
            time: 0.045,
            src: INGEST_IP,
            dst: LAPTOP_IP,
            protocol: "RTMP",
            info: "Handshake S0+S1+S2 (3073 bytes)",
            bytes: 3073 + 3 * 54,
          },
        },
      ],
    },
    {
      id: "connect-app",
      title: "Set chunks and connect to live",
      simple:
        "OBS switches to 4,096-byte chunks and transmits an AMF0 `connect` targeting the `live` app {{rtmp-conn}}. The server configures bandwidth limits and replies `_result (Success)` {{rtmp-conn-ok}}.",
      technical:
        "Larger 4,096-byte chunks lower header overhead vs the default 128 bytes. Commands use AMF0 compact binary encoding on Message Stream 0.",
      facts: [
        { label: "Target app", value: "live" },
        { label: "Encoding", value: "AMF0 binary" },
        { label: "Chunk size", value: "4,096 bytes (up from 128 B)" },
      ],
      events: [
        {
          type: "packet",
          id: "rtmp-conn",
          from: "laptop",
          to: "ingest",
          via: ["router", "internet"],
          tone: "control",
          label: "CONNECT 'live'",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: INGEST_IP, protocol: "TCP (6)", totalLength: 260 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 14, dport: RTMP_PORT, flags: "PSH, ACK", seq: 3074, ack: 3074, payloadBytes: 220 }),
            rtmpLayer("SetChunkSize(4096) + AMF0 connect('live')", [{ name: "Stream ID", value: "0 (control)" }]),
          ],
          capture: {
            time: 0.06,
            src: LAPTOP_IP,
            dst: INGEST_IP,
            protocol: "RTMP",
            info: "SetChunkSize(4096) + connect('live')",
            bytes: padFrameBytes(14 + 260),
          },
        },
        {
          type: "packet",
          id: "rtmp-conn-ok",
          from: "ingest",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "_RESULT SUCCESS",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: INGEST_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 280 }),
            tcpLayer({ sport: RTMP_PORT, dport: EPHEMERAL_PORT_START + 14, flags: "PSH, ACK", seq: 3074, ack: 3294, payloadBytes: 240 }),
            rtmpLayer("WindowAck + SetPeerBandwidth + _result", [{ name: "Code", value: "NetConnection.Connect.Success" }]),
          ],
          capture: {
            time: 0.08,
            src: INGEST_IP,
            dst: LAPTOP_IP,
            protocol: "RTMP",
            info: "_result: NetConnection.Connect.Success",
            bytes: padFrameBytes(14 + 280),
          },
        },
      ],
    },
    {
      id: "create-stream",
      title: "Allocate Stream ID 1",
      simple:
        "OBS batches stream release/announce commands with `createStream` in one packet {{rtmp-cs}}. The ingest server allocates Stream ID `1` {{rtmp-cs-ok}} so audio and video carry message stream `1`.",
      technical:
        "Message Stream 0 handles connection commands while `createStream` allocates Stream 1 for publishing audio, video, and script metadata.",
      facts: [
        { label: "Control stream", value: "Stream 0" },
        { label: "Requested", value: "createStream (transId 4)" },
        { label: "Allocated ID", value: "Stream ID 1" },
      ],
      events: [
        {
          type: "packet",
          id: "rtmp-cs",
          from: "laptop",
          to: "ingest",
          via: ["router", "internet"],
          tone: "control",
          label: "CREATESTREAM",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: INGEST_IP, protocol: "TCP (6)", totalLength: 140 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 14, dport: RTMP_PORT, flags: "PSH, ACK", seq: 3294, ack: 3314, payloadBytes: 100 }),
            rtmpLayer("releaseStream + FCPublish + createStream", [{ name: "Batched", value: "3 AMF0 calls" }]),
          ],
          capture: {
            time: 0.09,
            src: LAPTOP_IP,
            dst: INGEST_IP,
            protocol: "RTMP",
            info: "releaseStream + FCPublish + createStream",
            bytes: padFrameBytes(14 + 140),
          },
        },
        {
          type: "packet",
          id: "rtmp-cs-ok",
          from: "ingest",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "_RESULT (ID=1)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: INGEST_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 92 }),
            tcpLayer({ sport: RTMP_PORT, dport: EPHEMERAL_PORT_START + 14, flags: "PSH, ACK", seq: 3314, ack: 3394, payloadBytes: 52 }),
            rtmpLayer("_result (Stream ID = 1)", [{ name: "Media stream", value: "1" }]),
          ],
          capture: {
            time: 0.11,
            src: INGEST_IP,
            dst: LAPTOP_IP,
            protocol: "RTMP",
            info: "_result (createStream -> Stream ID 1)",
            bytes: padFrameBytes(14 + 92),
          },
        },
      ],
    },
    {
      id: "publish",
      title: "Publish with a stream key",
      simple:
        "`publish` sends the secret stream key authorizing the broadcast {{rtmp-pub}}. Classic RTMP sends the key in plain text, so services recommend RTMPS over TLS; `onStatus Publish.Start` starts ingest {{rtmp-pub-ok}}.",
      technical:
        "Sending the private stream key inside unencrypted AMF0 invites interception; RTMPS protects credentials and media inside a standard TLS tunnel.",
      facts: [
        { label: "Publish arg", value: "Channel stream key" },
        { label: "Plain risk", value: "RTMPS wraps port 1935/443 in TLS" },
        { label: "Ready status", value: "NetStream.Publish.Start" },
      ],
      events: [
        {
          type: "packet",
          id: "rtmp-pub",
          from: "laptop",
          to: "ingest",
          via: ["router", "internet"],
          tone: "request",
          label: "PUBLISH (KEY)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: INGEST_IP, protocol: "TCP (6)", totalLength: 108 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 14, dport: RTMP_PORT, flags: "PSH, ACK", seq: 3394, ack: 3366, payloadBytes: 68 }),
            rtmpLayer("publish('<stream-key>', 'live') on Stream 1", [{ name: "Security", value: "Plain text without RTMPS" }]),
          ],
          capture: {
            time: 0.12,
            src: LAPTOP_IP,
            dst: INGEST_IP,
            protocol: "RTMP",
            info: "publish(stream-key, live) on Stream 1",
            bytes: padFrameBytes(14 + 108),
          },
        },
        {
          type: "packet",
          id: "rtmp-pub-ok",
          from: "ingest",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "ONSTATUS START",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: INGEST_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 164 }),
            tcpLayer({ sport: RTMP_PORT, dport: EPHEMERAL_PORT_START + 14, flags: "PSH, ACK", seq: 3366, ack: 3462, payloadBytes: 124 }),
            rtmpLayer("onStatus NetStream.Publish.Start", [{ name: "Status", value: "Ingest active" }]),
          ],
          capture: {
            time: 0.14,
            src: INGEST_IP,
            dst: LAPTOP_IP,
            protocol: "RTMP",
            info: "onStatus: NetStream.Publish.Start",
            bytes: padFrameBytes(14 + 164),
          },
        },
      ],
    },
    {
      id: "stream-frames",
      title: "Upload metadata and key frame",
      simple:
        "OBS sends `@setDataFrame` metadata (`1920x1080`, 30 fps H.264, 48 kHz AAC) and decoder headers {{rtmp-meta}}, followed by a ~30 KB video key frame sliced into eight 4,096 B chunks {{rtmp-kf}}.",
      technical:
        "Multiplexing H.264 Video (`type 9`), AAC Audio (`type 8`), and Data (`type 18`) chunks onto one TCP stream keeps audio frames responsive ahead of large video key frames.",
      facts: [
        { label: "Video codec", value: "H.264 1920x1080 @ 30 fps" },
        { label: "Audio codec", value: "AAC 48 kHz stereo" },
        { label: "Key frame", value: "~30 KB across 8 chunks" },
      ],
      events: [
        {
          type: "packet",
          id: "rtmp-meta",
          from: "laptop",
          to: "ingest",
          via: ["router", "internet"],
          tone: "control",
          label: "METADATA + INIT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: INGEST_IP, protocol: "TCP (6)", totalLength: 360 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 14, dport: RTMP_PORT, flags: "PSH, ACK", seq: 3462, ack: 3490, payloadBytes: 320 }),
            rtmpLayer("@setDataFrame + AVC/AAC sequence headers", [{ name: "Resolution", value: "1920x1080, 30 fps" }]),
          ],
          capture: {
            time: 0.16,
            src: LAPTOP_IP,
            dst: INGEST_IP,
            protocol: "RTMP",
            info: "AMF0 Data (@setDataFrame) + H.264/AAC config",
            bytes: padFrameBytes(14 + 360),
          },
        },
        {
          type: "packet",
          id: "rtmp-kf",
          from: "laptop",
          to: "ingest",
          via: ["router", "internet"],
          tone: "data",
          label: "KEY FRAME (30 KB)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: INGEST_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 14, dport: RTMP_PORT, flags: "PSH, ACK", seq: 3782, ack: 3490, payloadBytes: 30720 }),
            rtmpLayer("Video Chunk Stream (8 x 4,096 B chunks)", [{ name: "Frame", value: "H.264 IDR Key Frame (~30 KB)" }]),
          ],
          capture: {
            time: 0.18,
            src: LAPTOP_IP,
            dst: INGEST_IP,
            protocol: "RTMP",
            info: "Video Data (H.264 Key Frame, 8 chunks)",
            bytes: 30720,
          },
        },
      ],
    },
    {
      id: "stop",
      title: "End stream via deleteStream",
      simple:
        "Ending the broadcast sends `FCUnpublish` and `deleteStream` for Stream 1 {{rtmp-stop}}, prompting `Unpublish.Success` {{rtmp-stop-ok}} before closing the TCP socket.",
      technical:
        "Closing Stream 1 notifies ingest transcoders to finalize viewer playlists (HLS/DASH) cleanly before TCP `FIN` closes port 1935.",
      facts: [
        { label: "Commands", value: "FCUnpublish + deleteStream(1)" },
        { label: "Reply", value: "NetStream.Unpublish.Success" },
        { label: "Final step", value: "Close TCP port 1935" },
      ],
      events: [
        {
          type: "packet",
          id: "rtmp-stop",
          from: "laptop",
          to: "ingest",
          via: ["router", "internet"],
          tone: "control",
          label: "DELETESTREAM",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: INGEST_IP, protocol: "TCP (6)", totalLength: 120 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 14, dport: RTMP_PORT, flags: "PSH, ACK", seq: 34502, ack: 3490, payloadBytes: 80 }),
            rtmpLayer("FCUnpublish + deleteStream(1)", [{ name: "Stream ID", value: "1" }]),
          ],
          capture: {
            time: 60.0,
            src: LAPTOP_IP,
            dst: INGEST_IP,
            protocol: "RTMP",
            info: "FCUnpublish + deleteStream(1)",
            bytes: padFrameBytes(14 + 120),
          },
        },
        {
          type: "packet",
          id: "rtmp-stop-ok",
          from: "ingest",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "UNPUBLISH OK",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: INGEST_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 152 }),
            tcpLayer({ sport: RTMP_PORT, dport: EPHEMERAL_PORT_START + 14, flags: "PSH, ACK", seq: 3490, ack: 34582, payloadBytes: 112 }),
            rtmpLayer("onStatus NetStream.Unpublish.Success", [{ name: "Broadcast", value: "Offline" }]),
          ],
          capture: {
            time: 60.02,
            src: INGEST_IP,
            dst: LAPTOP_IP,
            protocol: "RTMP",
            info: "onStatus: NetStream.Unpublish.Success",
            bytes: padFrameBytes(14 + 152),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Live video multiplexed in one TCP stream",
    simple:
      "OBS ran the RTMP handshake, joined the live app, opened Stream 1, published with its stream key, and uploaded chunked H.264 and AAC frames until deleteStream ended the broadcast.",
    technical:
      "Demonstrated RTMP v3 handshake, 4 KB chunking, AMF0 connect/createStream/publish flow, 30 KB key-frame upload, and deleteStream teardown.",
    facts: [
      { label: "Socket", value: "Single TCP port 1935 (RTMPS uses TLS)" },
      { label: "Media stream", value: "Stream ID 1" },
      { label: "Chunk size", value: "4,096 bytes" },
      { label: "Key protection", value: "Use RTMPS to encrypt stream keys" },
    ],
  },
  tryIt: [
    {
      title: "Check RTMP / RTMPS ingest reachability",
      explain: "Verify TLS handshake and ingest readiness on an RTMPS endpoint using OpenSSL.",
      commands: [
        { os: "windows", cmd: "openssl s_client -connect live.example.net:443 -brief" },
        { os: "macos", cmd: "openssl s_client -connect live.example.net:443 -brief" },
        { os: "linux", cmd: "openssl s_client -connect live.example.net:443 -brief" },
      ],
    },
  ],
});
