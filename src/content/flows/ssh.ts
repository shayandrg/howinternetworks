import { defineFlow } from "../schema";
import { tcpHandshake } from "../builders/tcp";
import { ethernetLayer, ipv4Layer, tcpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, TCP_BASE_HEADER } from "../builders/sizes";
import { EPHEMERAL_PORT_START, LAPTOP_IP, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const SSH_SERVER_IP = "203.0.113.22"; // RFC 5737 TEST-NET-3
const SSH_PORT = 22;
const KEYSTROKE_SEALED_BYTES = 36;
const KEYSTROKE_WIRE_BYTES = padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + KEYSTROKE_SEALED_BYTES);

function sshLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "SSHv2", summary, fields };
}

export const sshFlow = defineFlow({
  meta: {
    slug: "ssh",
    kind: "flow",
    collection: "protocols",
    group: "security",
    title: "SSH",
    fullName: "Secure Shell",
    tagline: "Encrypted remote terminal login and authenticated channels",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["tcp"],
    related: ["tls", "ftp", "tcp", "https"],
    tags: ["ssh", "terminal", "key-exchange", "ed25519", "security"],
    sources: [
      {
        label: "RFC 4251: The Secure Shell (SSH) Protocol Architecture",
        url: "https://www.rfc-editor.org/rfc/rfc4251",
      },
      {
        label: "RFC 4252: The Secure Shell (SSH) Authentication Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc4252",
      },
      {
        label: "RFC 4253: The Secure Shell (SSH) Transport Layer Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc4253",
      },
      {
        label: "RFC 4254: The Secure Shell (SSH) Connection Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc4254",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[ssh|SSH]] opens an encrypted shell on a distant computer so you can run commands or transfer files safely. The server proves its identity using a [[host-key]], and you prove yours with a key pair or password.",
    technical:
      "Secure Shell (RFC 4251 through RFC 4254) runs over [[tcp|TCP]] port 22. After negotiating algorithms and verifying the server's host key during transport setup, it authenticates the user and multiplexes channels inside one encrypted session.",
  },
  facts: [
    { label: "Layer", value: "Application (over TCP)" },
    { label: "Default port", value: "22 (TCP)" },
    { label: "Server proof", value: "Long-term host key (known_hosts)" },
    { label: "User auth", value: "Public key signature or password" },
    { label: "Defined in", value: "RFC 4251 - RFC 4254" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 110, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 350, y: 300 } },
      { id: "internet", kind: "cloud", label: "ISP & Internet", at: { x: 610, y: 300 } },
      { id: "server", kind: "server", label: "SSH server", sublabel: SSH_SERVER_IP, at: { x: 870, y: 300 } },
    ],
    links: [
      { id: "l-wifi", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-fiber", from: "router", to: "internet", medium: "fiber" },
      { id: "l-inet", from: "internet", to: "server", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "hello",
      title: "Exchange plain version banners",
      simple:
        "After connecting on port 22, both computers send a single unencrypted line announcing `SSH-2.0` and their software release. Every packet after that uses SSH binary framing.",
      technical:
        "Following the [[tcp|TCP]] handshake {{ssh-syn}}, client and server transmit CRLF-terminated version strings per RFC 4253 {{ssh-ver-c}} {{ssh-ver-s}} before entering binary packet framing.",
      facts: [
        { label: "Client banner", value: "OpenSSH_for_Windows_9.5" },
        { label: "Server banner", value: "OpenSSH_9.6p1 Ubuntu" },
        { label: "Protocol", value: "SSH-2.0 (TCP port 22)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "server"] },
            { type: "focus", actors: ["laptop", "router", "internet", "server"] },
          ],
        },
        ...tcpHandshake({
          from: "laptop",
          to: "server",
          srcIp: LAPTOP_IP,
          dstIp: SSH_SERVER_IP,
          dport: SSH_PORT,
          startTime: 0.0,
          rtt: 0.018,
          prefix: "ssh",
        }),
        {
          type: "packet",
          id: "ssh-ver-c",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "control",
          label: "VERSION",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 82 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 1, ack: 1, payloadBytes: 42 }),
            sshLayer("SSH-2.0-OpenSSH_for_Windows_9.5", [{ name: "Banner", value: "SSH-2.0-OpenSSH_for_Windows_9.5" }]),
          ],
          capture: {
            time: 0.028,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Client: Protocol (SSH-2.0-OpenSSH_for_Windows_9.5)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 42),
          },
        },
        {
          type: "packet",
          id: "ssh-ver-s",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "control",
          label: "VERSION",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 72 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 1, ack: 43, payloadBytes: 32 }),
            sshLayer("SSH-2.0-OpenSSH_9.6p1 Ubuntu", [{ name: "Banner", value: "SSH-2.0-OpenSSH_9.6p1 Ubuntu" }]),
          ],
          capture: {
            time: 0.046,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Server: Protocol (SSH-2.0-OpenSSH_9.6p1 Ubuntu)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 32),
          },
        },
      ],
    },
    {
      id: "kexinit",
      title: "Negotiate algorithms",
      simple:
        "Each side sends an ordered menu of supported key-exchange schemes, host-key formats, and ciphers {{ssh-kexinit-c}} {{ssh-kexinit-s}}. In each list, the first client pick that the server supports wins.",
      technical:
        "RFC 4253 defines `SSH_MSG_KEXINIT` (code 20). Matching rules choose `sntrup761x25519-sha512`, `ssh-ed25519` for server identity, and `chacha20-poly1305` for authenticated encryption.",
      facts: [
        { label: "Key exchange", value: "sntrup761x25519-sha512" },
        { label: "Host key type", value: "ssh-ed25519" },
        { label: "Cipher", value: "chacha20-poly1305" },
      ],
      events: [
        {
          type: "packet",
          id: "ssh-kexinit-c",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "control",
          label: "KEXINIT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 1080 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 43, ack: 33, payloadBytes: 1040 }),
            sshLayer("SSH_MSG_KEXINIT (20)", [
              { name: "KEX algorithms", value: "sntrup761x25519-sha512, curve25519-sha256, ..." },
              { name: "Host key formats", value: "ssh-ed25519, ecdsa-sha2-nistp256, ..." },
              { name: "Ciphers", value: "chacha20-poly1305@openssh.com, aes256-gcm" },
            ]),
          ],
          capture: {
            time: 0.055,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Client: Key Exchange Init (SSH_MSG_KEXINIT)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 1040),
          },
        },
        {
          type: "packet",
          id: "ssh-kexinit-s",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "control",
          label: "KEXINIT",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 820 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 33, ack: 1083, payloadBytes: 780 }),
            sshLayer("SSH_MSG_KEXINIT (20)", [
              { name: "Selected KEX", value: "sntrup761x25519-sha512@openssh.com" },
              { name: "Selected host key", value: "ssh-ed25519" },
              { name: "Selected cipher", value: "chacha20-poly1305@openssh.com" },
            ]),
          ],
          capture: {
            time: 0.075,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Server: Key Exchange Init (SSH_MSG_KEXINIT)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 780),
          },
        },
      ],
    },
    {
      id: "kex",
      title: "Build shared keys and check host",
      simple:
        "Your laptop sends a hybrid ephemeral key {{ssh-ecdh-init}}. The server answers with its public share, its [[host-key]], and a signature proving it owns that key {{ssh-ecdh-reply}}. Both then turn on encryption.",
      technical:
        "In `KEX ECDH INIT`, the client sends combined Streamlined NTRU Prime + X25519 shares. The server's `KEX ECDH REPLY` signs the exchange transcript with `ssh-ed25519`; the client checks `known_hosts`, then both send `SSH_MSG_NEWKEYS` (RFC 4253).",
      facts: [
        { label: "Hybrid KEX", value: "sntrup761 + X25519 (post-quantum)" },
        { label: "Host check", value: "Signature verified against known_hosts" },
        { label: "Switchover", value: "NEWKEYS enables ChaCha20-Poly1305" },
      ],
      events: [
        {
          type: "packet",
          id: "ssh-ecdh-init",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "secure",
          label: "KEX ECDH INIT",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 1248 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 1083, ack: 813, payloadBytes: 1208 }),
            sshLayer("SSH_MSG_KEX_ECDH_INIT (30)", [
              { name: "Ephemeral Q_C", value: "sntrup761 + X25519 (1190 B)" },
            ]),
          ],
          capture: {
            time: 0.082,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Client: Key Exchange ECDH Init (sntrup761x25519)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 1208),
          },
        },
        {
          type: "packet",
          id: "ssh-ecdh-reply",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "KEX ECDH REPLY",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 1264 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 813, ack: 2291, payloadBytes: 1224 }),
            sshLayer("SSH_MSG_KEX_ECDH_REPLY (31)", [
              { name: "Host key", value: "ssh-ed25519 (verified)" },
              { name: "Server Q_S", value: "Ciphertext + X25519 share (1071 B)" },
              { name: "Signature H", value: "Ed25519 over exchange hash" },
            ]),
          ],
          capture: {
            time: 0.102,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Server: Key Exchange ECDH Reply + Host Key Signature",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 1224),
          },
        },
        {
          type: "note",
          id: "note-hostkey",
          at: "laptop",
          text: "Host key matches known_hosts",
          tone: "response",
        },
        {
          type: "packet",
          id: "ssh-newkeys-c",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "secure",
          label: "NEWKEYS",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 56 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 2291, ack: 2037, payloadBytes: 16 }),
            sshLayer("SSH_MSG_NEWKEYS (21)", [{ name: "State", value: "Encryption active outbound" }]),
          ],
          capture: {
            time: 0.106,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Client: New Keys (SSH_MSG_NEWKEYS)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 16),
          },
        },
        {
          type: "packet",
          id: "ssh-newkeys-s",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "secure",
          label: "NEWKEYS",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 56 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 2037, ack: 2307, payloadBytes: 16 }),
            sshLayer("SSH_MSG_NEWKEYS (21)", [{ name: "State", value: "Cipher active both ways" }]),
          ],
          capture: {
            time: 0.125,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Server: New Keys (SSH_MSG_NEWKEYS)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 16),
          },
        },
      ],
    },
    {
      id: "auth",
      title: "Sign in with a key signature",
      simple:
        "Inside encryption, the laptop offers Alice's public key {{ssh-pk-query}}. Once approved {{ssh-pk-ok}}, the laptop signs the session without sending the private key {{ssh-pk-sig}}.",
      technical:
        "RFC 4252 user authentication sends `SSH_MSG_USERAUTH_REQUEST` (`publickey`). After `SSH_MSG_USERAUTH_PK_OK` (code 60), the client signs the session ID with its Ed25519 private key, checked against `~/.ssh/authorized_keys`.",
      facts: [
        { label: "Auth method", value: "publickey (Ed25519)" },
        { label: "Private key", value: "Never leaves the laptop" },
        { label: "Verified against", value: "~/.ssh/authorized_keys" },
      ],
      events: [
        {
          type: "packet",
          id: "ssh-pk-query",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "request",
          label: "PUBKEY OFFER",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 148 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 2307, ack: 2053, payloadBytes: 108 }),
            sshLayer("Encrypted SSH packet (UserAuth query)", [
              { name: "Service", value: "ssh-connection (user: alice)" },
              { name: "Key", value: "ssh-ed25519 public key" },
            ]),
          ],
          capture: {
            time: 0.132,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=108): UserAuth publickey offer",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 108),
          },
        },
        {
          type: "packet",
          id: "ssh-pk-ok",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "PK_OK",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 124 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 2053, ack: 2415, payloadBytes: 84 }),
            sshLayer("Encrypted SSH packet (SSH_MSG_USERAUTH_PK_OK)", [
              { name: "Decision", value: "Key algorithm permitted" },
            ]),
          ],
          capture: {
            time: 0.151,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=84): USERAUTH_PK_OK",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 84),
          },
        },
        {
          type: "packet",
          id: "ssh-pk-sig",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "request",
          label: "KEY SIGNATURE",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 288 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 2415, ack: 2137, payloadBytes: 248 }),
            sshLayer("Encrypted SSH packet (UserAuth signature)", [
              { name: "Method", value: "publickey-hostbound-v00@openssh.com" },
              { name: "Signature", value: "64-byte Ed25519 signature" },
            ]),
          ],
          capture: {
            time: 0.156,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=248): Signed UserAuth request",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 248),
          },
        },
        {
          type: "packet",
          id: "ssh-auth-ok",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "AUTH SUCCESS",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 76 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 2137, ack: 2663, payloadBytes: 36 }),
            sshLayer("Encrypted SSH packet (USERAUTH_SUCCESS)", [
              { name: "Status", value: "Authentication accepted (52)" },
            ]),
          ],
          capture: {
            time: 0.175,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=36): USERAUTH_SUCCESS",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 36),
          },
        },
      ],
    },
    {
      id: "session",
      title: "Open a shell session channel",
      simple:
        "One SSH connection can run many independent streams, such as shells, SFTP file transfers, or forwarded ports. Here the laptop opens a `session` channel {{ssh-ch-open}} and gets back a shell prompt {{ssh-prompt}}.",
      technical:
        "RFC 4254 multiplexes logical channels inside one TCP stream. After `SSH_MSG_CHANNEL_OPEN` (`session`) and confirmation, `pty-req` and `shell` requests launch the user's remote shell.",
      facts: [
        { label: "Channel type", value: "session (channel 0)" },
        { label: "Requests sent", value: "pty-req + shell" },
        { label: "Multiplexing", value: "Shell, SFTP, and port forwards" },
      ],
      events: [
        {
          type: "packet",
          id: "ssh-ch-open",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "request",
          label: "CHANNEL OPEN",
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 92 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 2663, ack: 2173, payloadBytes: 52 }),
            sshLayer("Encrypted SSH packet (CHANNEL_OPEN session)", [
              { name: "Type", value: "session (sender channel 0)" },
              { name: "Window", value: "2097152 bytes" },
            ]),
          ],
          capture: {
            time: 0.18,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=52): CHANNEL_OPEN (session)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 52),
          },
        },
        {
          type: "packet",
          id: "ssh-prompt",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "SHELL PROMPT",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 148 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 2173, ack: 2715, payloadBytes: 108 }),
            sshLayer("Encrypted SSH packet (CHANNEL_DATA)", [
              { name: "Channel", value: "0 (remote shell)" },
              { name: "Payload", value: "MOTD + prompt alice@server:~$" },
            ]),
          ],
          capture: {
            time: 0.205,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=108): Shell welcome and prompt",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 108),
          },
        },
      ],
    },
    {
      id: "keystrokes",
      title: "Send padded keystroke packets",
      simple:
        "Typing `pwd` sends each key inside its own packet {{ssh-key-p}}, and the server echoes it back {{ssh-echo-p}}. OpenSSH 9.5+ sends keys on 20 ms ticks plus decoy traffic.",
      technical:
        `A 1-byte keystroke inside \`SSH_MSG_CHANNEL_DATA\` seals into a ${KEYSTROKE_SEALED_BYTES}-byte padded ChaCha20-Poly1305 packet ({{ssh-key-p}}). OpenSSH's \`ObscureKeystrokeTiming\` sends keys on a 20 ms beat with trailing chaff packets.`,
      facts: [
        { label: "Sealed size", value: `${KEYSTROKE_SEALED_BYTES} B (${KEYSTROKE_WIRE_BYTES} B frame)` },
        { label: "Remote echo", value: "Server sends each character back" },
        { label: "Timing defense", value: "20 ms clock ticks + decoys (OpenSSH 9.5+)" },
      ],
      events: [
        {
          type: "packet",
          id: "ssh-key-p",
          from: "laptop",
          to: "server",
          via: ["router", "internet"],
          tone: "request",
          label: "KEY 'p'",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: LAPTOP_IP, dst: SSH_SERVER_IP, protocol: "TCP (6)", totalLength: 76 }),
            tcpLayer({ sport: EPHEMERAL_PORT_START, dport: SSH_PORT, flags: "PSH, ACK", seq: 2715, ack: 2281, payloadBytes: KEYSTROKE_SEALED_BYTES }),
            sshLayer("Encrypted SSH packet (CHANNEL_DATA, 36 B)", [
              { name: "Channel", value: "0 (stdin)" },
              { name: "Encrypted payload", value: "1 byte ('p') + padding + 16 B MAC" },
            ]),
          ],
          capture: {
            time: 0.24,
            src: LAPTOP_IP,
            dst: SSH_SERVER_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=36): CHANNEL_DATA keystroke",
            bytes: KEYSTROKE_WIRE_BYTES,
          },
        },
        {
          type: "packet",
          id: "ssh-echo-p",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "ECHO 'p'",
          fast: true,
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 76 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 2281, ack: 2751, payloadBytes: KEYSTROKE_SEALED_BYTES }),
            sshLayer("Encrypted SSH packet (CHANNEL_DATA, 36 B)", [
              { name: "Channel", value: "0 (stdout echo)" },
              { name: "Encrypted payload", value: "Echoed character 'p'" },
            ]),
          ],
          capture: {
            time: 0.258,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=36): CHANNEL_DATA echo",
            bytes: KEYSTROKE_WIRE_BYTES,
          },
        },
        {
          type: "note",
          id: "note-key-obfuscation",
          at: "laptop",
          text: "20 ms key ticks + chaff decoys",
          tone: "lookup",
        },
        {
          type: "packet",
          id: "ssh-pwd-out",
          from: "server",
          to: "laptop",
          via: ["internet", "router"],
          tone: "response",
          label: "/home/alice",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
            ipv4Layer({ src: SSH_SERVER_IP, dst: LAPTOP_IP, protocol: "TCP (6)", totalLength: 164 }),
            tcpLayer({ sport: SSH_PORT, dport: EPHEMERAL_PORT_START, flags: "PSH, ACK", seq: 2317, ack: 2787, payloadBytes: 124 }),
            sshLayer("Encrypted SSH packet (CHANNEL_DATA, 124 B)", [
              { name: "Channel", value: "0 (stdout)" },
              { name: "Command output", value: "/home/alice + prompt" },
            ]),
          ],
          capture: {
            time: 0.34,
            src: SSH_SERVER_IP,
            dst: LAPTOP_IP,
            protocol: "SSH",
            info: "Encrypted packet (len=124): CHANNEL_DATA stdout (/home/alice)",
            bytes: padFrameBytes(14 + IPV4_HEADER + TCP_BASE_HEADER + 124),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Remote shell authenticated and encrypted",
    simple:
      "Both machines picked shared ciphers, confirmed the server's host key, derived encryption keys with a post-quantum hybrid exchange, and proved Alice's identity by signing with a key stored only on her laptop.",
    technical:
      "SSH-2.0 completed TCP port 22 setup, KEXINIT, hybrid sntrup761x25519-sha512 KEX, Ed25519 userauth, and interactive session multiplexing.",
    facts: [
      { label: "Key exchange", value: "sntrup761 + X25519" },
      { label: "Cipher", value: "ChaCha20-Poly1305" },
      { label: "Authentication", value: "Ed25519 key signature" },
      { label: "Keystroke defense", value: "20 ms ticks + decoys" },
    ],
  },
  tryIt: [
    {
      title: "Inspect an SSH handshake verbally",
      explain: "Use verbose mode on a test host you control to watch KEX, host-key checks, and userauth stages.",
      commands: [
        { os: "windows", cmd: "ssh -v alice@example.com" },
        { os: "macos", cmd: "ssh -v alice@example.com" },
        { os: "linux", cmd: "ssh -v alice@example.com" },
      ],
    },
  ],
});
