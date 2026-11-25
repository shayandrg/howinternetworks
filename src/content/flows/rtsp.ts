import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, SERVER_MAC } from "../world";

const CAM_IP = "192.168.1.64";
const RTSP_PORT = 554;
const SESSION_ID = "1185d200";

function rtspLayer(name: string, summary: string, fields: Array<{ name: string; value: string }>) {
  return { name, summary, fields };
}

export const rtspFlow = defineFlow({
  meta: {
    slug: "rtsp",
    kind: "flow",
    collection: "protocols",
    group: "calls",
    title: "RTSP",
    fullName: "Real Time Streaming Protocol",
    tagline: "Controlling live IP camera feeds streamed over RTP",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["udp", "tcp"],
    related: ["sip", "rtmp", "udp", "igmp"],
    tags: ["rtsp", "camera", "rtp", "h264", "streaming"],
    sources: [
      {
        label: "RFC 2326: Real Time Streaming Protocol (RTSP)",
        url: "https://www.rfc-editor.org/rfc/rfc2326",
      },
      {
        label: "RFC 7826: Real-Time Streaming Protocol Version 2.0",
        url: "https://www.rfc-editor.org/rfc/rfc7826",
      },
      {
        label: "RFC 6184: RTP Payload Format for H.264 Video (FU-A §5.8)",
        url: "https://www.rfc-editor.org/rfc/rfc6184",
      },
      {
        label: "RFC 3550: RTP: A Transport Protocol for Real-Time Applications",
        url: "https://www.rfc-editor.org/rfc/rfc3550",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[rtsp|RTSP]] lets video players such as VLC control IP cameras like a remote control (`DESCRIBE`, `SETUP`, `PLAY`, `TEARDOWN`) over TCP 554. Live video itself travels separately in [[rtp|RTP]] UDP packets.",
    technical:
      "Defined in RFC 2326 and RFC 7826, RTSP exchanges HTTP-styled control lines numbered by `CSeq`. Negotiated media tracks then stream H.264 video frames over UDP RTP ports per RFC 6184.",
  },
  facts: [
    { label: "Layer", value: "Application (TCP port 554)" },
    { label: "Control verbs", value: "OPTIONS, DESCRIBE, SETUP, PLAY, TEARDOWN" },
    { label: "Media plane", value: "RTP over UDP (here H.264 PT 96)" },
    { label: "Session clock", value: "90 kHz video clock rate" },
    { label: "Defined in", value: "RFC 2326, RFC 7826, RFC 6184" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "VLC player", sublabel: LAPTOP_IP, at: { x: 140, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 490, y: 300 } },
      { id: "camera", kind: "camera", label: "IP camera", sublabel: CAM_IP, at: { x: 850, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-lan", from: "router", to: "camera", medium: "ethernet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "options",
      title: "Open port 554 and query OPTIONS",
      simple:
        "VLC opens TCP port 554 to `192.168.1.64` {{rtsp-tcp-syn}} and sends `OPTIONS` (`CSeq: 1`) {{rtsp-opt-q}}. The camera replies `200 OK` listing every supported control verb {{rtsp-opt-a}}.",
      technical:
        "Every RTSP control request carries an incrementing `CSeq` sequence header matching requests to responses over the TCP 554 control connection.",
      facts: [
        { label: "Control port", value: "TCP 554" },
        { label: "First command", value: "OPTIONS (CSeq: 1)" },
        { label: "Reply", value: "Public: DESCRIBE, SETUP, PLAY, TEARDOWN" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "camera"] },
            { type: "focus", actors: ["laptop", "router", "camera"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "camera",
          srcIp: LAPTOP_IP,
          dstIp: CAM_IP,
          sport: EPHEMERAL_PORT_START + 13,
          dport: RTSP_PORT,
          startTime: 0.0,
          rtt: 0.004,
          prefix: "rtsp-tcp",
        }),
        {
          type: "packet",
          id: "rtsp-opt-q",
          from: "laptop",
          to: "camera",
          via: ["router"],
          tone: "control",
          label: "OPTIONS",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: CAM_IP, protocol: "TCP (6)", totalLength: 112 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 13, dport: RTSP_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 72 }),
            rtspLayer("RTSP", `OPTIONS rtsp://${CAM_IP}/stream1 (CSeq: 1)`, [{ name: "CSeq", value: "1" }]),
          ],
          capture: {
            time: 0.01,
            src: LAPTOP_IP,
            dst: CAM_IP,
            protocol: "RTSP",
            info: "OPTIONS rtsp://192.168.1.64/stream1 RTSP/1.0",
            bytes: padFrameBytes(14 + 112),
          },
        },
        {
          type: "packet",
          id: "rtsp-opt-a",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "200 OPTIONS",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 164 }),
            tcpLayer({ sport: RTSP_PORT, dport: EPHEMERAL_PORT_START + 13, flags: "PSH, ACK", seq: 1, ack: 73, payloadBytes: 124 }),
            rtspLayer("RTSP", "200 OK (DESCRIBE, SETUP, PLAY, PAUSE, TEARDOWN)", [{ name: "CSeq", value: "1" }]),
          ],
          capture: {
            time: 0.014,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTSP",
            info: "Reply: RTSP/1.0 200 OK (Public methods)",
            bytes: padFrameBytes(14 + 164),
          },
        },
      ],
    },
    {
      id: "describe",
      title: "Authenticate and DESCRIBE stream",
      simple:
        "`DESCRIBE` hits a `401` Digest password challenge {{rtsp-desc1}}, so VLC retries with a hash {{rtsp-desc2}}. The `200 OK` returns an [[sdp|SDP]] listing an H.264 video track (`trackID=1`, RTP payload 96, 90 kHz).",
      technical:
        "Digest auth avoids plain passwords. The SDP response declares `m=video 0 RTP/AVP 96`, `a=rtpmap:96 H264/90000`, and `a=control:trackID=1`.",
      facts: [
        { label: "Auth", value: "401 Digest hash check" },
        { label: "Video codec", value: "H.264 (Payload Type 96)" },
        { label: "Track control", value: "trackID=1 (90 kHz clock)" },
      ],
      events: [
        {
          type: "packet",
          id: "rtsp-desc1",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "control",
          label: "DESCRIBE -> 401",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 210 }),
            tcpLayer({ sport: RTSP_PORT, dport: EPHEMERAL_PORT_START + 13, flags: "PSH, ACK", seq: 125, ack: 160, payloadBytes: 170 }),
            rtspLayer("RTSP", "401 Unauthorized (Digest realm)", [{ name: "CSeq", value: "2" }]),
          ],
          capture: {
            time: 0.02,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTSP",
            info: "Reply: 401 Unauthorized (Digest auth required)",
            bytes: padFrameBytes(14 + 210),
          },
        },
        {
          type: "packet",
          id: "rtsp-desc2",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "200 SDP (H.264)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 520 }),
            tcpLayer({ sport: RTSP_PORT, dport: EPHEMERAL_PORT_START + 13, flags: "PSH, ACK", seq: 295, ack: 340, payloadBytes: 480 }),
            rtspLayer("RTSP + SDP", "200 OK: trackID=1 (H.264 PT 96 / 90000 Hz)", [
              { name: "Video track", value: "trackID=1, H264/90000" },
            ]),
          ],
          capture: {
            time: 0.03,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTSP/SDP",
            info: "Reply: 200 OK (SDP H.264 trackID=1)",
            bytes: padFrameBytes(14 + 520),
          },
        },
      ],
    },
    {
      id: "setup-play",
      title: "Set up UDP ports and send PLAY",
      simple:
        "`SETUP trackID=1` reserves UDP ports `50000/50001` on VLC and `6970/6971` on the camera under session `1185d200` {{rtsp-setup}}. `PLAY` (`npt=0.000-`) receives `RTP-Info` naming first sequence `27493` {{rtsp-play}}.",
      technical:
        "`Transport: RTP/AVP;unicast;client_port=50000-50001` pairs even RTP video and odd RTCP report ports. `PLAY` replies with `RTP-Info: seq=27493` so playback syncs immediately.",
      facts: [
        { label: "Transport", value: "RTP/AVP over UDP" },
        { label: "Ports", value: "Cam 6970/6971 -> VLC 50000/50001" },
        { label: "Session ID", value: `${SESSION_ID} (first RTP Seq 27493)` },
      ],
      events: [
        {
          type: "packet",
          id: "rtsp-setup",
          from: "laptop",
          to: "camera",
          via: ["router"],
          tone: "request",
          label: "SETUP (50000-50001)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: CAM_IP, protocol: "TCP (6)", totalLength: 184 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 13, dport: RTSP_PORT, flags: "PSH, ACK", seq: 340, ack: 775, payloadBytes: 144 }),
            rtspLayer("RTSP", `SETUP trackID=1 -> Session: ${SESSION_ID}`, [{ name: "Client ports", value: "50000 (RTP), 50001 (RTCP)" }]),
          ],
          capture: {
            time: 0.04,
            src: LAPTOP_IP,
            dst: CAM_IP,
            protocol: "RTSP",
            info: `SETUP trackID=1 (UDP 50000-50001, Session ${SESSION_ID})`,
            bytes: padFrameBytes(14 + 184),
          },
        },
        {
          type: "packet",
          id: "rtsp-play",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "PLAY -> 200 OK",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 216 }),
            tcpLayer({ sport: RTSP_PORT, dport: EPHEMERAL_PORT_START + 13, flags: "PSH, ACK", seq: 920, ack: 484, payloadBytes: 176 }),
            rtspLayer("RTSP", "200 OK (PLAY npt=0.000-, seq=27493)", [{ name: "Next", value: "Video streams on UDP 50000" }]),
          ],
          capture: {
            time: 0.05,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTSP",
            info: "Reply: 200 OK PLAY (RTP-Info seq=27493)",
            bytes: padFrameBytes(14 + 216),
          },
        },
      ],
    },
    {
      id: "rtp-video",
      title: "Stream H.264 key-frame fragments",
      simple:
        "Video bypasses RTSP and streams over UDP port 50000. Key frames split into many RTP FU-A fragments (start, middle, `M=1` end drawn) sharing a 90 kHz clock {{rtsp-f1}} {{rtsp-f2}} {{rtsp-f3}}.",
      technical:
        "Per RFC 6184 §5.8, key frames exceeding MTU split into Fragmentation Units (FU-A) sharing an RTP timestamp, with the Marker bit (`M=1`) signaling the final fragment at 25 frames/s.",
      facts: [
        { label: "NAL framing", value: "FU-A fragments (3 representative drawn)" },
        { label: "Frame marker", value: "Same 90 kHz clock; M=1 on last" },
        { label: "Frame rate", value: "25 frames/s" },
      ],
      events: [
        {
          type: "packet",
          id: "rtsp-f1",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "data",
          label: "RTP FU-A (START)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 1400 }),
            udpLayer({ sport: 6970, dport: 50000, length: UDP_HEADER + 1400 }),
            rtspLayer("RTP / H.264 FU-A", "Seq=27493, Start=1, M=0", [{ name: "Timestamp", value: "360000 (90 kHz)" }]),
          ],
          capture: {
            time: 0.06,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTP",
            info: "PT=96 H264 FU-A Start, Seq=27493, TS=360000",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 1400),
          },
        },
        {
          type: "packet",
          id: "rtsp-f2",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "data",
          label: "RTP FU-A (MID)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 1400 }),
            udpLayer({ sport: 6970, dport: 50000, length: UDP_HEADER + 1400 }),
            rtspLayer("RTP / H.264 FU-A", "Seq=27494, Mid, M=0", [{ name: "Timestamp", value: "360000 (same frame)" }]),
          ],
          capture: {
            time: 0.061,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTP",
            info: "PT=96 H264 FU-A Middle, Seq=27494, TS=360000",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 1400),
          },
        },
        {
          type: "packet",
          id: "rtsp-f3",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "data",
          label: "RTP FU-A (END M=1)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 840 }),
            udpLayer({ sport: 6970, dport: 50000, length: UDP_HEADER + 840 }),
            rtspLayer("RTP / H.264 FU-A", "Seq=27495, End=1, M=1 (frame complete)", [{ name: "Marker", value: "M=1 ends key frame" }]),
          ],
          capture: {
            time: 0.062,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTP",
            info: "PT=96 H264 FU-A End (M=1), Seq=27495",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 840),
          },
        },
      ],
    },
    {
      id: "teardown",
      title: "Stop live feed with TEARDOWN",
      simple:
        "Closing VLC sends `TEARDOWN` naming Session `1185d200` on TCP 554 {{rtsp-td-q}}, and the camera halts RTP with `200 OK` {{rtsp-td-a}}. Silent crashed clients time out after 60 s.",
      technical:
        "`TEARDOWN` releases server session `1185d200` and frees UDP RTP/RTCP ports immediately rather than waiting for the default 60-second session timeout.",
      facts: [
        { label: "Command", value: `TEARDOWN (Session: ${SESSION_ID})` },
        { label: "Reply", value: "200 OK -> RTP halts" },
        { label: "Crash safeguard", value: "60 s idle timeout" },
      ],
      events: [
        {
          type: "packet",
          id: "rtsp-td-q",
          from: "laptop",
          to: "camera",
          via: ["router"],
          tone: "control",
          label: "TEARDOWN",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: CAM_IP, protocol: "TCP (6)", totalLength: 132 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 13, dport: RTSP_PORT, flags: "PSH, ACK", seq: 600, ack: 1096, payloadBytes: 92 }),
            rtspLayer("RTSP", `TEARDOWN rtsp://${CAM_IP}/stream1`, [{ name: "Session", value: SESSION_ID }]),
          ],
          capture: {
            time: 12.0,
            src: LAPTOP_IP,
            dst: CAM_IP,
            protocol: "RTSP",
            info: `TEARDOWN (Session ${SESSION_ID})`,
            bytes: padFrameBytes(14 + 132),
          },
        },
        {
          type: "packet",
          id: "rtsp-td-a",
          from: "camera",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "200 STOPPED",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: CAM_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 108 }),
            tcpLayer({ sport: RTSP_PORT, dport: EPHEMERAL_PORT_START + 13, flags: "PSH, ACK", seq: 1096, ack: 692, payloadBytes: 68 }),
            rtspLayer("RTSP", "200 OK (Session ended)", [{ name: "Stream", value: "UDP 6970 stopped" }]),
          ],
          capture: {
            time: 12.004,
            src: CAM_IP,
            dst: LAPTOP_IP,
            protocol: "RTSP",
            info: "Reply: 200 OK (stream closed)",
            bytes: padFrameBytes(14 + 108),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Control channel ran TCP; video rode UDP",
    simple:
      "VLC checked capabilities, verified Digest credentials, set up H.264 track ports, and triggered PLAY. Video streamed via fragmented RTP UDP datagrams until TEARDOWN closed the session.",
    technical:
      "RTSP session 1185d200 coordinated OPTIONS, Digest DESCRIBE (SDP), SETUP (`6970->50000`), PLAY, RFC 6184 H.264 FU-A RTP delivery, and TEARDOWN.",
    facts: [
      { label: "Control protocol", value: "TCP 554 (6 request-reply turns)" },
      { label: "Video stream", value: "UDP 6970 -> 50000 (RTP PT 96)" },
      { label: "Large frames", value: "Split into H.264 FU-A fragments" },
      { label: "Timeout", value: "60 s if viewer vanishes" },
    ],
  },
  tryIt: [
    {
      title: "Inspect an RTSP stream description with ffprobe",
      explain: "Connect to a test RTSP stream to display its SDP tracks, H.264 dimensions, and frame rate.",
      commands: [
        { os: "windows", cmd: "ffprobe -v quiet -print_format json -show_streams rtsp://192.168.1.64/stream1" },
        { os: "macos", cmd: "ffprobe -v quiet -print_format json -show_streams rtsp://192.168.1.64/stream1" },
        { os: "linux", cmd: "ffprobe -v quiet -print_format json -show_streams rtsp://192.168.1.64/stream1" },
      ],
    },
  ],
});
