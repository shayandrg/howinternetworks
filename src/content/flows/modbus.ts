import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { padFrameBytes } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, SERVER_MAC } from "../world";

const PLC_IP = "192.168.1.70";
const MODBUS_PORT = 502;

function modbusLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "Modbus/TCP (MBAP + PDU)", summary, fields };
}

export const modbusFlow = defineFlow({
  meta: {
    slug: "modbus",
    kind: "flow",
    collection: "protocols",
    group: "machines",
    title: "Modbus/TCP",
    fullName: "Modbus over TCP for Industrial Control",
    tagline: "Reading sensors and commanding factory PLCs over TCP 502",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["tcp"],
    related: ["tcp", "ethernet", "tls", "smb"],
    tags: ["modbus", "plc", "ot", "industrial", "scada"],
    sources: [
      {
        label: "Modbus Organization: Modbus Application Protocol & Messaging on TCP/IP",
        url: "https://www.modbus.org/specs.php",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[modbus|Modbus/TCP]] connects engineering screens to factory [[plc|PLCs]], pumps, and sensors over TCP port 502. Compact requests read 16-bit registers and flip coils, with zero built-in authentication or encryption.",
    technical:
      "Defined by Modbus.org, Modbus/TCP prepends a 7-byte MBAP header onto the classic PDU over TCP 502. Because classic Modbus trusts any reachable IP, OT networks rely on segmentation or Modbus/TCP Security (TLS 802).",
  },
  facts: [
    { label: "Layer", value: "Application (TCP port 502)" },
    { label: "Origin", value: "1979 (Modicon)" },
    { label: "Data types", value: "16-bit registers & single-bit coils" },
    { label: "Security", value: "None built in (TLS on port 802)" },
    { label: "Defined in", value: "Modbus.org Specifications" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "HMI / Laptop", sublabel: LAPTOP_IP, at: { x: 140, y: 300 } },
      { id: "router", kind: "router", label: "Plant firewall", sublabel: ROUTER_LAN_IP, at: { x: 490, y: 300 } },
      { id: "plc", kind: "plc", label: "Pump PLC", sublabel: PLC_IP, at: { x: 850, y: 300 } },
    ],
    links: [
      { id: "l-eng", from: "laptop", to: "router", medium: "ethernet" },
      { id: "l-ot", from: "router", to: "plc", medium: "ethernet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "port-502",
      title: "Connect TCP to PLC port 502",
      simple:
        "A [[plc|PLC]] runs the pumping station sensors and valves. The engineer's HMI laptop initiates a TCP connection on port 502 {{mb-tcp-syn}} so it can poll values as the Modbus client.",
      technical:
        `The HMI initiates TCP port 502 to PLC \`${PLC_IP}\`, establishing the MBAP request/response stream.`,
      facts: [
        { label: "PLC address", value: `${PLC_IP}:502` },
        { label: "Roles", value: "HMI = client, PLC = server" },
        { label: "MBAP header", value: "7 bytes (TransID, Proto=0, Len, Unit)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "plc"] },
            { type: "focus", actors: ["laptop", "router", "plc"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "plc",
          srcIp: LAPTOP_IP,
          dstIp: PLC_IP,
          sport: EPHEMERAL_PORT_START + 15,
          dport: MODBUS_PORT,
          startTime: 0.0,
          rtt: 0.004,
          prefix: "mb-tcp",
        }),
      ],
    },
    {
      id: "read-registers",
      title: "Read 4 registers (Function 3)",
      simple:
        "Function Code 3 asks for four 16-bit holding registers from address 0 (12-byte request) {{mb-fc3-q}}. The PLC answers with 8 raw bytes: `412, 183, 1450, 450` {{mb-fc3-a}}. Units exist only in plant documentation.",
      technical:
        "Function 3 (`Read Holding Registers`) polls raw 16-bit unsigned integers (`412`, `183`, `1450`, `450` representing cm, 0.1 C, etc.) typically every second from an HMI screen.",
      facts: [
        { label: "Function code", value: "3 (Read Holding Registers)" },
        { label: "Count / start", value: "4 registers starting at 0" },
        { label: "Returned values", value: "412, 183, 1450, 450" },
      ],
      events: [
        {
          type: "packet",
          id: "mb-fc3-q",
          from: "laptop",
          to: "plc",
          via: ["router"],
          tone: "request",
          label: "FC 3 READ (0..3)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PLC_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 15, dport: MODBUS_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 12 }),
            modbusLayer("FC 3: Read Holding Registers (Addr=0, Qty=4)", [{ name: "TransID", value: "1 (12 B request)" }]),
          ],
          capture: {
            time: 0.01,
            src: LAPTOP_IP,
            dst: PLC_IP,
            protocol: "Modbus/TCP",
            info: "Query: Read Holding Registers (Func 3), Start=0, Qty=4",
            bytes: padFrameBytes(14 + 52),
          },
        },
        {
          type: "packet",
          id: "mb-fc3-a",
          from: "plc",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "VALUES (8 BYTES)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: PLC_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 57 }),
            tcpLayer({ sport: MODBUS_PORT, dport: EPHEMERAL_PORT_START + 15, flags: "PSH, ACK", seq: 1, ack: 13, payloadBytes: 17 }),
            modbusLayer("FC 3 Response: [412, 183, 1450, 450]", [{ name: "Payload", value: "17 B total (8 B data)" }]),
          ],
          capture: {
            time: 0.015,
            src: PLC_IP,
            dst: LAPTOP_IP,
            protocol: "Modbus/TCP",
            info: "Response: Func 3 values [412, 183, 1450, 450]",
            bytes: padFrameBytes(14 + 57),
          },
        },
      ],
    },
    {
      id: "write-setpoint",
      title: "Raise tank setpoint (Function 6)",
      simple:
        "Lifting the tank setpoint from 4.50 m to 5.00 m uses Function Code 6 to write `500` into register 3 {{mb-fc6-q}}. The PLC echoes the 12-byte command back to confirm {{mb-fc6-a}}.",
      technical:
        "Function 6 (`Write Single Register`) updates holding register 3 (`450 -> 500`) and confirms by returning an identical echo of the write PDU.",
      facts: [
        { label: "Function code", value: "6 (Write Single Register)" },
        { label: "Register 3", value: "450 -> 500 (5.00 m)" },
        { label: "Ack format", value: "Exact echo of write command" },
      ],
      events: [
        {
          type: "packet",
          id: "mb-fc6-q",
          from: "laptop",
          to: "plc",
          via: ["router"],
          tone: "control",
          label: "FC 6 WRITE R3=500",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PLC_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 15, dport: MODBUS_PORT, flags: "PSH, ACK", seq: 13, ack: 18, payloadBytes: 12 }),
            modbusLayer("FC 6: Write Single Register (Reg=3, Val=500)", [{ name: "TransID", value: "2" }]),
          ],
          capture: {
            time: 0.03,
            src: LAPTOP_IP,
            dst: PLC_IP,
            protocol: "Modbus/TCP",
            info: "Query: Write Single Register (Func 6), Reg=3, Val=500",
            bytes: padFrameBytes(14 + 52),
          },
        },
        {
          type: "packet",
          id: "mb-fc6-a",
          from: "plc",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "DONE (ECHO)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: PLC_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: MODBUS_PORT, dport: EPHEMERAL_PORT_START + 15, flags: "PSH, ACK", seq: 18, ack: 25, payloadBytes: 12 }),
            modbusLayer("FC 6 Confirm: Reg=3, Val=500", [{ name: "Status", value: "Setpoint updated" }]),
          ],
          capture: {
            time: 0.035,
            src: PLC_IP,
            dst: LAPTOP_IP,
            protocol: "Modbus/TCP",
            info: "Response: Write Single Register echoed",
            bytes: padFrameBytes(14 + 52),
          },
        },
      ],
    },
    {
      id: "write-coil",
      title: "Start Pump 2 via Function 5 coil",
      simple:
        "Coils control single on/off hardware relays. Function 5 writes `0xFF00` (ON) to coil 0 {{mb-fc5-q}}, switching Pump 2 on and echoing the command {{mb-fc5-a}}.",
      technical:
        "Function 5 (`Write Single Coil`) encodes ON as `0xFF00` and OFF as `0x0000` (all other values ignored); safety interlocks in ladder logic prevent unsafe equipment states.",
      facts: [
        { label: "Function code", value: "5 (Write Single Coil)" },
        { label: "Coil 0", value: "Pump 2 relay" },
        { label: "Encoding", value: "0xFF00 = ON, 0x0000 = OFF" },
      ],
      events: [
        {
          type: "packet",
          id: "mb-fc5-q",
          from: "laptop",
          to: "plc",
          via: ["router"],
          tone: "control",
          label: "FC 5 COIL 0 ON",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PLC_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 15, dport: MODBUS_PORT, flags: "PSH, ACK", seq: 25, ack: 30, payloadBytes: 12 }),
            modbusLayer("FC 5: Write Single Coil (Coil=0, 0xFF00)", [{ name: "TransID", value: "3" }]),
          ],
          capture: {
            time: 0.05,
            src: LAPTOP_IP,
            dst: PLC_IP,
            protocol: "Modbus/TCP",
            info: "Query: Write Single Coil (Func 5), Coil=0 ON (0xFF00)",
            bytes: padFrameBytes(14 + 52),
          },
        },
        {
          type: "packet",
          id: "mb-fc5-a",
          from: "plc",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "PUMP 2 ON",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: PLC_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: MODBUS_PORT, dport: EPHEMERAL_PORT_START + 15, flags: "PSH, ACK", seq: 30, ack: 37, payloadBytes: 12 }),
            modbusLayer("FC 5 Echo (Pump 2 running)", [{ name: "Hardware", value: "Coil 0 latched ON" }]),
          ],
          capture: {
            time: 0.055,
            src: PLC_IP,
            dst: LAPTOP_IP,
            protocol: "Modbus/TCP",
            info: "Response: Coil 0 ON confirmed",
            bytes: padFrameBytes(14 + 52),
          },
        },
        {
          type: "note",
          id: "note-pump",
          at: "plc",
          text: "Pump 2 running",
          tone: "response",
        },
      ],
    },
    {
      id: "exception",
      title: "Return exception on invalid addr",
      simple:
        "Requesting unmapped registers (`100..101`) {{mb-err-q}} triggers a 9-byte Exception: the function code plus `0x80` (`3 + 128 = 131`) and code `2` (Illegal Data Address) {{mb-err-a}}.",
      technical:
        "Modbus signals errors by setting the high bit (`0x80`) of the echoed function byte (`0x83 = 131`) paired with exception byte `0x02` (`Illegal Data Address`).",
      facts: [
        { label: "Error func byte", value: "131 (3 + 128)" },
        { label: "Exception code", value: "2 (Illegal Data Address)" },
        { label: "Other codes", value: "1=Bad function, 6=Device busy" },
      ],
      events: [
        {
          type: "packet",
          id: "mb-err-q",
          from: "laptop",
          to: "plc",
          via: ["router"],
          tone: "request",
          label: "FC 3 READ (100..101)",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: PLC_IP, protocol: "TCP (6)", totalLength: 52 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 15, dport: MODBUS_PORT, flags: "PSH, ACK", seq: 37, ack: 42, payloadBytes: 12 }),
            modbusLayer("FC 3: Read Holding Registers (Addr=100, Qty=2)", [{ name: "TransID", value: "4" }]),
          ],
          capture: {
            time: 0.07,
            src: LAPTOP_IP,
            dst: PLC_IP,
            protocol: "Modbus/TCP",
            info: "Query: Read Holding Registers, Start=100 (unmapped)",
            bytes: padFrameBytes(14 + 52),
          },
        },
        {
          type: "packet",
          id: "mb-err-a",
          from: "plc",
          to: "laptop",
          via: ["router"],
          tone: "error",
          label: "EXCEPTION 131 / 2",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: PLC_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 49 }),
            tcpLayer({ sport: MODBUS_PORT, dport: EPHEMERAL_PORT_START + 15, flags: "PSH, ACK", seq: 42, ack: 49, payloadBytes: 9 }),
            modbusLayer("Exception: Func=131 (0x83), Code=2", [{ name: "Meaning", value: "Illegal Data Address" }]),
          ],
          capture: {
            time: 0.075,
            src: PLC_IP,
            dst: LAPTOP_IP,
            protocol: "Modbus/TCP",
            info: "Exception Response: Func 131, Code 2 (Illegal Address)",
            bytes: padFrameBytes(14 + 49),
          },
        },
      ],
    },
    {
      id: "ot-security",
      title: "Isolate PLCs or wrap in TLS",
      simple:
        "Modbus carries no username or encryption: any device reaching TCP 502 can toggle pumps. Plants isolate OT networks behind strict firewalls and allowlists, or deploy Modbus/TCP Security over TLS on port 802.",
      technical:
        "Defense-in-depth isolates OT zones (Purdue model firewalls + allowlisted HMI IPs), monitors anomalous writes, and upgrades modern controllers to Modbus/TCP Security (X.509 mutual TLS on port 802).",
      facts: [
        { label: "Authentication", value: "None in classic Modbus" },
        { label: "Encryption", value: "None in classic Modbus" },
        { label: "Mitigations", value: "OT VLANs, firewalls, TLS port 802" },
      ],
      events: [
        {
          type: "note",
          id: "note-nosec",
          at: "router",
          text: "Firewall OT port 502 (no login)",
          tone: "error",
        },
        { type: "wait", ms: 1600 },
      ],
    },
  ],
  outro: {
    title: "Tiny commands controlled industrial pumps",
    simple:
      "Twelve-byte requests polled registers, adjusted a setpoint, switched a pump coil, and caught an out-of-range error. Without logins or encryption, network isolation protects physical equipment.",
    technical:
      "Executed Modbus/TCP FC 3, FC 6, FC 5, and Exception 0x02 over port 502 while highlighting OT segmentation and port 802 TLS security.",
    facts: [
      { label: "Messages", value: "4 query/reply exchanges" },
      { label: "Largest packet", value: "17 B Modbus payload" },
      { label: "Built-in login", value: "None" },
      { label: "Protection", value: "Segmented OT network + TLS 802" },
    ],
  },
  tryIt: [
    {
      title: "Check whether Modbus port 502 is isolated",
      explain: "Verify firewall isolation so TCP port 502 is unreachable outside authorized OT control subnets.",
      commands: [
        { os: "windows", cmd: "Test-NetConnection -ComputerName 192.168.1.70 -Port 502" },
        { os: "macos", cmd: "nc -zv -G 2 192.168.1.70 502" },
        { os: "linux", cmd: "nc -zv -w 2 192.168.1.70 502" },
      ],
    },
  ],
});
