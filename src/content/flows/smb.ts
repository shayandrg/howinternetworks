import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC, SERVER_MAC } from "../world";

const NAS_IP = "192.168.1.20";
const SMB_PORT = 445;

function smbLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "SMB 3.1.1", summary, fields };
}

export const smbFlow = defineFlow({
  meta: {
    slug: "smb",
    kind: "flow",
    collection: "protocols",
    group: "files",
    title: "SMB",
    fullName: "Server Message Block (SMB 3.1.1)",
    tagline: "Authenticated local file sharing over TCP port 445",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["tcp", "ethernet"],
    related: ["ftp", "ethernet", "tcp", "tls"],
    tags: ["smb", "nas", "file-sharing", "ntlm", "port-445"],
    sources: [
      {
        label: "Microsoft [MS-SMB2]: Server Message Block (SMB) Protocol Versions 2 and 3",
        url: "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-smb2",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[smb|SMB]] powers shared network folders (`\\\\nas\\Documents`) and mapped drives across Windows, macOS, and Linux. Over TCP port 445, devices negotiate SMB 3.1.1, authenticate without sending passwords, and read files with signed requests.",
    technical:
      "Defined in MS-SMB2, SMB 3.1.1 negotiates dialects with SHA-512 preauth integrity hashing, authenticates via NTLMv2 or Kerberos, connects to a share tree, and transfers data using credit-based flow control.",
  },
  facts: [
    { label: "Layer", value: "Application (TCP port 445)" },
    { label: "Dialect", value: "SMB 3.1.1" },
    { label: "Authentication", value: "NTLMv2 or Kerberos" },
    { label: "Protection", value: "AES-GMAC signing; optional AES-GCM" },
    { label: "Defined in", value: "Microsoft [MS-SMB2]" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 140, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 490, y: 300 } },
      { id: "nas", kind: "file-server", label: "Home NAS", sublabel: NAS_IP, at: { x: 850, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-lan", from: "router", to: "nas", medium: "ethernet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "port-445",
      title: "Connect on local TCP port 445",
      simple:
        "Opening `\\\\nas\\Documents` resolves `nas` on your home LAN (`192.168.1.20`) and opens TCP port 445 {{smb-tcp-syn}}. Packets stay strictly inside your home network.",
      technical:
        `Direct SMB-over-TCP connects to \`${NAS_IP}:445\` over the home LAN without traversing the ISP.`,
      facts: [
        { label: "NAS IP", value: `${NAS_IP}:445` },
        { label: "Scope", value: "Home LAN only" },
        { label: "Transport", value: "Single persistent TCP socket" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "nas"] },
            { type: "focus", actors: ["laptop", "router", "nas"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "nas",
          srcIp: LAPTOP_IP,
          dstIp: NAS_IP,
          sport: EPHEMERAL_PORT_START + 11,
          dport: SMB_PORT,
          startTime: 0.0,
          rtt: 0.004,
          prefix: "smb-tcp",
        }),
      ],
    },
    {
      id: "negotiate",
      title: "Agree on SMB 3.1.1 dialect",
      simple:
        "Your laptop offers dialects `2.0.2` up to `3.1.1` with signing enabled {{smb-neg-req}}. The NAS picks `3.1.1` {{smb-neg-res}}. Both feed every setup byte into a SHA-512 integrity hash to block downgrade tampering.",
      technical:
        "SMB 3.1.1 Preauthentication Integrity hashes `NEGOTIATE` and `SESSION_SETUP` exchanges with SHA-512, binding them into derived signing keys.",
      facts: [
        { label: "Offered", value: "Dialects 2.0.2 through 3.1.1" },
        { label: "Selected", value: "SMB 3.1.1" },
        { label: "Downgrade defense", value: "SHA-512 preauth hash" },
      ],
      events: [
        {
          type: "packet",
          id: "smb-neg-req",
          from: "laptop",
          to: "nas",
          via: ["router"],
          tone: "control",
          label: "NEGOTIATE",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: NAS_IP, protocol: "TCP (6)", totalLength: 196 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 11, dport: SMB_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 156 }),
            smbLayer("Negotiate Protocol Request (2.0.2..3.1.1)", [{ name: "SecurityMode", value: "Signing required" }]),
          ],
          capture: {
            time: 0.01,
            src: LAPTOP_IP,
            dst: NAS_IP,
            protocol: "SMB2",
            info: "Negotiate Protocol Request (SMB 3.1.1)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 156),
          },
        },
        {
          type: "packet",
          id: "smb-neg-res",
          from: "nas",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "NEGOTIATE (3.1.1)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: NAS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 260 }),
            tcpLayer({ sport: SMB_PORT, dport: EPHEMERAL_PORT_START + 11, flags: "PSH, ACK", seq: 1, ack: 157, payloadBytes: 220 }),
            smbLayer("Negotiate Protocol Response (Dialect 0x0311)", [
              { name: "Dialect", value: "SMB 3.1.1" },
              { name: "Cipher", value: "AES-128-GCM supported" },
            ]),
          ],
          capture: {
            time: 0.014,
            src: NAS_IP,
            dst: LAPTOP_IP,
            protocol: "SMB2",
            info: "Negotiate Response: SMB 3.1.1",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 220),
          },
        },
      ],
    },
    {
      id: "ntlm-auth",
      title: "Prove login via NTLMv2 challenge",
      simple:
        "Without a domain Kerberos server, `SESSION_SETUP` draws an 8-byte random challenge from the NAS {{smb-chal}}. The laptop returns an NTLMv2 HMAC response {{smb-auth-ok}} without sending the password.",
      technical:
        "NTLMv2 computes HMAC-MD5 over the 8-byte server challenge and username (`alex`) using the stored NT hash; both ends derive signing keys after Session Setup succeeds.",
      facts: [
        { label: "Auth scheme", value: "NTLMv2 (Kerberos in domains)" },
        { label: "Server challenge", value: "8 random bytes" },
        { label: "Password on wire", value: "Never sent" },
      ],
      events: [
        {
          type: "packet",
          id: "smb-chal",
          from: "nas",
          to: "laptop",
          via: ["router"],
          tone: "control",
          label: "NTLM CHALLENGE",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: NAS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 280 }),
            tcpLayer({ sport: SMB_PORT, dport: EPHEMERAL_PORT_START + 11, flags: "PSH, ACK", seq: 221, ack: 300, payloadBytes: 240 }),
            smbLayer("Session Setup Response (MORE_PROCESSING_REQUIRED)", [
              { name: "Challenge", value: "8 random bytes" },
            ]),
          ],
          capture: {
            time: 0.02,
            src: NAS_IP,
            dst: LAPTOP_IP,
            protocol: "SMB2",
            info: "Session Setup Response: NTLMv2 Challenge",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 240),
          },
        },
        {
          type: "packet",
          id: "smb-auth-ok",
          from: "laptop",
          to: "nas",
          via: ["router"],
          tone: "secure",
          label: "NTLMv2 AUTH",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: NAS_IP, protocol: "TCP (6)", totalLength: 420 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 11, dport: SMB_PORT, flags: "PSH, ACK", seq: 300, ack: 461, payloadBytes: 380 }),
            smbLayer("Session Setup Request (NTLMv2 Response, user=alex)", [
              { name: "Session Key", value: "Derived for message signing" },
            ]),
          ],
          capture: {
            time: 0.024,
            src: LAPTOP_IP,
            dst: NAS_IP,
            protocol: "SMB2",
            info: "Session Setup Request (NTLMv2 proof, user alex)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 380),
          },
        },
      ],
    },
    {
      id: "tree-create",
      title: "Mount share and open report.pdf",
      simple:
        "`TREE_CONNECT` mounts `\\\\nas\\Documents` (ID `0x2a51`) {{smb-tree}}, and `CREATE` opens `report.pdf` returning a 16-byte handle and file size {{smb-create}}. Every packet carries an AES-GMAC signature.",
      technical:
        "From `TREE_CONNECT` onward, SMB 3.1.1 appends an AES-GMAC signature to every header so altered or injected commands fail verification.",
      facts: [
        { label: "Tree share", value: "\\\\nas\\Documents (0x00002a51)" },
        { label: "Target file", value: "report.pdf (245,760 B)" },
        { label: "Packet integrity", value: "AES-GMAC signed headers" },
      ],
      events: [
        {
          type: "packet",
          id: "smb-tree",
          from: "laptop",
          to: "nas",
          via: ["router"],
          tone: "request",
          label: "TREE + CREATE",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: NAS_IP, protocol: "TCP (6)", totalLength: 230 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 11, dport: SMB_PORT, flags: "PSH, ACK", seq: 680, ack: 580, payloadBytes: 190 }),
            smbLayer("TREE_CONNECT \\\\nas\\Documents + CREATE report.pdf", [
              { name: "Signing", value: "AES-128-GMAC signature valid" },
            ]),
          ],
          capture: {
            time: 0.032,
            src: LAPTOP_IP,
            dst: NAS_IP,
            protocol: "SMB2",
            info: "Tree Connect (Documents) + Create (report.pdf)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 190),
          },
        },
        {
          type: "packet",
          id: "smb-create",
          from: "nas",
          to: "laptop",
          via: ["router"],
          tone: "response",
          label: "FILE HANDLE",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: NAS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 200 }),
            tcpLayer({ sport: SMB_PORT, dport: EPHEMERAL_PORT_START + 11, flags: "PSH, ACK", seq: 580, ack: 870, payloadBytes: 160 }),
            smbLayer("Create Response: FileId handle, Size 245,760 B", [{ name: "File size", value: "245,760 bytes (240 KB)" }]),
          ],
          capture: {
            time: 0.036,
            src: NAS_IP,
            dst: LAPTOP_IP,
            protocol: "SMB2",
            info: "Create Response (handle opened, 245,760 B)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 160),
          },
        },
      ],
    },
    {
      id: "read-close",
      title: "Read file and keep 445 off WAN",
      simple:
        "One `READ` using 4 credits pulls the 240 KB file {{smb-read}} {{smb-data}}, then `CLOSE` frees the handle. Keep TCP 445 blocked from WAN (SMBv1 enabled WannaCry) and add AES-GCM for privacy.",
      technical:
        "Credit flow control allocates 1 credit per 64 KB block. Because signing does not hide file data, SMB 3 AES-GCM encryption protects sensitive shares, and edge firewalls must block port 445 externally.",
      facts: [
        { label: "Read request", value: "245,760 B (4 SMB credits)" },
        { label: "Optional crypto", value: "SMB 3 AES-GCM encryption" },
        { label: "Security rule", value: "Never expose TCP 445 externally" },
      ],
      events: [
        {
          type: "packet",
          id: "smb-read",
          from: "laptop",
          to: "nas",
          via: ["router"],
          tone: "request",
          label: "READ (240 KB)",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: NAS_IP, protocol: "TCP (6)", totalLength: 158 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START + 11, dport: SMB_PORT, flags: "PSH, ACK", seq: 870, ack: 740, payloadBytes: 118 }),
            smbLayer("Read Request (Offset=0, Length=245760, CreditCharge=4)", [
              { name: "Credits", value: "4 credits (4 x 64 KB)" },
            ]),
          ],
          capture: {
            time: 0.04,
            src: LAPTOP_IP,
            dst: NAS_IP,
            protocol: "SMB2",
            info: "Read Request (report.pdf, 245,760 B)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 118),
          },
        },
        {
          type: "packet",
          id: "smb-data",
          from: "nas",
          to: "laptop",
          via: ["router"],
          tone: "data",
          label: "DATA (240 KB)",
          layers: [
            ethernetLayer({ srcMac: SERVER_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: NAS_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1500 }),
            tcpLayer({ sport: SMB_PORT, dport: EPHEMERAL_PORT_START + 11, flags: "PSH, ACK", seq: 740, ack: 988, payloadBytes: 245840 }),
            smbLayer("Read Response (80 B SMB hdr + 245,760 B file)", [
              { name: "Segments", value: "169 TCP MSS segments" },
            ]),
          ],
          capture: {
            time: 0.055,
            src: NAS_IP,
            dst: LAPTOP_IP,
            protocol: "SMB2",
            info: "Read Response (245,760 B file payload)",
            bytes: 245840,
          },
        },
        {
          type: "note",
          id: "note-block-445",
          at: "router",
          text: "Block port 445 on the internet",
          tone: "error",
        },
      ],
    },
  ],
  outro: {
    title: "Signed local file transfer complete",
    simple:
      "A single TCP socket carried SMB 3.1.1 dialect selection, challenge-response login without clear-text passwords, share mounting, and a 240 KB file transfer.",
    technical:
      "Completed SMB 3.1.1 dialect negotiation, NTLMv2 auth, AES-GMAC tree mount, file handle open, credit-paced 240 KB read, and close.",
    facts: [
      { label: "Dialect", value: "SMB 3.1.1" },
      { label: "Authentication", value: "NTLMv2 (no plain password)" },
      { label: "File transferred", value: "240 KB in 1 READ command" },
      { label: "Firewall note", value: "Disable SMB1; block WAN 445" },
    ],
  },
  tryIt: [
    {
      title: "List active SMB client connections",
      explain: "Check connected shares and negotiated SMB dialects (`3.1.1`) on your system.",
      commands: [
        { os: "windows", cmd: "powershell -Command Get-SmbConnection" },
        { os: "macos", cmd: "smbutil statshares -a" },
        { os: "linux", cmd: "smbstatus -S" },
      ],
    },
  ],
});
