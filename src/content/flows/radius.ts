import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import { AP_MAC, LAPTOP_MAC, ROUTER_LAN_IP, ROUTER_MAC } from "../world";

const AP_LAN_IP = ROUTER_LAN_IP;
const RADIUS_IP = "10.0.1.50";
const RADIUS_PORT = 1812;

function eapRadiusLayer(name: string, summary: string, fields: Array<{ name: string; value: string }>) {
  return { name, summary, fields };
}

export const radiusFlow = defineFlow({
  meta: {
    slug: "radius",
    kind: "flow",
    collection: "protocols",
    group: "security",
    title: "RADIUS & 802.1X",
    fullName: "RADIUS and IEEE 802.1X Enterprise Wi-Fi Auth",
    tagline: "Per-user Wi-Fi login bridging Layer 2 EAPOL and RADIUS",
    layer: {
      tcpip: "application",
      osi: 7,
      note: "IEEE 802.1X/EAPOL runs at Layer 2; RADIUS runs at Layer 7 over UDP 1812/1813",
    },
    prerequisites: ["wifi", "tls"],
    related: ["wifi", "wpa3", "tls", "pppoe"],
    tags: ["radius", "802.1x", "eap-tls", "eduroam", "enterprise-wifi"],
    sources: [
      {
        label: "IEEE 802.1X: Port-Based Network Access Control",
        url: "https://standards.ieee.org/ieee/802.1X/7345/",
      },
      {
        label: "RFC 2865: Remote Authentication Dial In User Service (RADIUS)",
        url: "https://www.rfc-editor.org/rfc/rfc2865",
      },
      {
        label: "RFC 3579: RADIUS Support For Extensible Authentication Protocol (EAP)",
        url: "https://www.rfc-editor.org/rfc/rfc3579",
      },
      {
        label: "RFC 9190: EAP-TLS 1.3 (Using the EAP-TLS Authentication Protocol)",
        url: "https://www.rfc-editor.org/rfc/rfc9190",
      },
      {
        label: "RFC 6614: Transport Layer Security (TLS) Encryption for RADIUS (RadSec)",
        url: "https://www.rfc-editor.org/rfc/rfc6614",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "Offices and universities avoid sharing one Wi-Fi password. Under [[radius|RADIUS]] and IEEE 802.1X, your laptop sends its own [[eap|EAP]] identity or certificate through the access point, which forwards login packets to an authentication server.",
    technical:
      "IEEE 802.1X carries EAPOL at Layer 2 between station and access point, while RADIUS relays EAP over Layer 7 UDP ports 1812/1813 (RFC 2865, RFC 3579) to verify EAP-TLS 1.3 (RFC 9190) credentials and assign VLANs and unique PMKs.",
  },
  facts: [
    { label: "Layers", value: "802.1X/EAPOL (L2) + RADIUS (L7 UDP 1812)" },
    { label: "Auth protocol", value: "EAP-TLS 1.3 (RFC 9190)" },
    { label: "Key size", value: "64-octet MSK -> 32 B PMK" },
    { label: "RADIUS crypto", value: "Shared-secret auth; RadSec uses TLS" },
    { label: "Defined in", value: "IEEE 802.1X; RFC 2865, 3579, 9190" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_MAC, at: { x: 140, y: 300 } },
      { id: "ap", kind: "access-point", label: "Office AP", sublabel: AP_LAN_IP, at: { x: 490, y: 300 } },
      { id: "radius", kind: "server", label: "RADIUS server", sublabel: RADIUS_IP, at: { x: 840, y: 300 } },
    ],
    links: [
      { id: "l-eapol", from: "laptop", to: "ap", medium: "wifi" },
      { id: "l-rad", from: "ap", to: "radius", medium: "ethernet" },
    ],
    start: {
      visible: ["laptop", "ap", "radius"],
      focus: ["laptop", "ap", "radius"],
    },
  },
  steps: [
    {
      id: "eap-identity",
      title: "AP requests EAP identity (L2)",
      simple:
        "Until authenticated, the access point's Layer 2 port lets only IEEE 802.1X EAPOL frames pass. It sends an EAP Request/Identity {{rad-id-req}}, and the laptop answers `alex@example.org` {{rad-id-res}}.",
      technical:
        "Before authorization, the 802.1X authenticator blocks IP traffic and transmits `EAP-Request/Identity` over Layer 2 EAPOL (`0x888e`).",
      facts: [
        { label: "SSID", value: "Office (WPA2/WPA3-Enterprise)" },
        { label: "Identity sent", value: "alex@example.org" },
        { label: "Data port state", value: "Blocked (EAPOL only)" },
      ],
      events: [
        {
          type: "packet",
          id: "rad-id-req",
          from: "ap",
          to: "laptop",
          tone: "control",
          label: "EAP IDENTITY?",
          layers: [
            eapRadiusLayer("IEEE 802.1X EAPOL (Layer 2)", "EAP-Request / Identity", [
              { name: "EtherType", value: "0x888e (EAPOL)" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "EAPOL",
            info: "EAP-Request, Identity (Layer 2)",
            bytes: 60,
          },
        },
        {
          type: "packet",
          id: "rad-id-res",
          from: "laptop",
          to: "ap",
          tone: "request",
          label: "IDENTITY",
          layers: [
            eapRadiusLayer("IEEE 802.1X EAPOL (Layer 2)", "EAP-Response / Identity (alex@example.org)", [
              { name: "User", value: "alex@example.org" },
            ]),
          ],
          capture: {
            time: 0.004,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "EAPOL",
            info: "EAP-Response, Identity: alex@example.org",
            bytes: 72,
          },
        },
      ],
    },
    {
      id: "access-request",
      title: "AP forwards Access-Request (L7)",
      simple:
        "The AP wraps EAP in Layer 7 RADIUS on UDP 1812 {{rad-req}}. An MD5 secret only signs packets (BlastRADIUS) and hides selected keys; RadSec adds TLS {{rad-chal}}.",
      technical:
        "RFC 2865 §3 RADIUS messages carry attributes at Layer 7 over UDP 1812. Most attributes stay readable unless encrypted with RadSec TLS (RFC 6614); server answers `Access-Challenge` starting EAP-TLS {{rad-chal}}.",
      facts: [
        { label: "Destination", value: `${RADIUS_IP}:1812 (Layer 7 UDP)` },
        { label: "Secret scope", value: "MD5 authenticator + selected attrs" },
        { label: "TLS upgrade", value: "RadSec (RFC 6614) encrypts full path" },
      ],
      events: [
        {
          type: "packet",
          id: "rad-req",
          from: "ap",
          to: "radius",
          tone: "request",
          label: "ACCESS-REQUEST",
          layers: [
            ethernetLayer({ srcMac: ROUTER_MAC, dstMac: AP_MAC }),
            ipv4Layer({ src: AP_LAN_IP, dst: RADIUS_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 148 }),
            udpLayer({ sport: 43100, dport: RADIUS_PORT, length: UDP_HEADER + 148 }),
            eapRadiusLayer("RADIUS (Layer 7 UDP 1812)", "Access-Request (EAP-Message, Called-Station-Id)", [
              { name: "Attributes", value: "User-Name, Calling-Station-Id, Message-Authenticator" },
            ]),
          ],
          capture: {
            time: 0.008,
            src: AP_LAN_IP,
            dst: RADIUS_IP,
            protocol: "RADIUS",
            info: "Access-Request (UDP 1812, EAP Identity)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 148),
          },
        },
        {
          type: "packet",
          id: "rad-chal",
          from: "radius",
          to: "ap",
          tone: "response",
          label: "CHALLENGE (EAP-TLS)",
          layers: [
            ethernetLayer({ srcMac: AP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: RADIUS_IP, dst: AP_LAN_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 84 }),
            udpLayer({ sport: RADIUS_PORT, dport: 43100, length: UDP_HEADER + 84 }),
            eapRadiusLayer("RADIUS Access-Challenge", "Start EAP-TLS (Method 13)", [{ name: "EAP Type", value: "EAP-TLS" }]),
          ],
          capture: {
            time: 0.014,
            src: RADIUS_IP,
            dst: AP_LAN_IP,
            protocol: "RADIUS",
            info: "Access-Challenge (EAP-TLS Start)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 84),
          },
        },
      ],
    },
    {
      id: "eap-tls-13",
      title: "Run TLS 1.3 inside EAP frames",
      simple:
        "The laptop and RADIUS server run a mutual TLS 1.3 handshake inside EAP {{rad-ch}} {{rad-sh}}. The laptop verifies `radius.example.org`'s certificate against its company CA, stopping rogue Wi-Fi evil twins.",
      technical:
        "RFC 9190 runs TLS 1.3 inside EAP-TLS over RADIUS (`EAPOL` <-> `RADIUS` re-encapsulation at the AP). Server certificate pinning blocks credential interception.",
      facts: [
        { label: "Handshake", value: "TLS 1.3 inside EAP-TLS (RFC 9190)" },
        { label: "Server proof", value: "Cert verified to company CA" },
        { label: "Rogue defense", value: "Client refuses untrusted APs" },
      ],
      events: [
        {
          type: "packet",
          id: "rad-ch",
          from: "laptop",
          to: "radius",
          via: ["ap"],
          tone: "secure",
          label: "TLS CLIENTHELLO",
          layers: [
            eapRadiusLayer("EAP-TLS 1.3 ClientHello", "ClientHello -> AP relays to RADIUS", [
              { name: "AP role", value: "Repacks L2 EAPOL into L7 RADIUS" },
            ]),
          ],
          capture: {
            time: 0.02,
            src: LAPTOP_IP_PLACEHOLDER(LAPTOP_MAC),
            dst: RADIUS_IP,
            protocol: "EAP-TLS",
            info: "ClientHello (relayed EAPOL -> RADIUS)",
            bytes: 340,
          },
        },
        {
          type: "packet",
          id: "rad-sh",
          from: "radius",
          to: "laptop",
          via: ["ap"],
          tone: "secure",
          label: "SERVER CERT + REQ",
          layers: [
            eapRadiusLayer("EAP-TLS 1.3 ServerHello + Cert", "Server certificate + Client Cert Request", [
              { name: "Server CN", value: "radius.example.org" },
            ]),
          ],
          capture: {
            time: 0.032,
            src: RADIUS_IP,
            dst: LAPTOP_MAC,
            protocol: "EAP-TLS",
            info: "ServerHello, Certificate, CertificateRequest",
            bytes: 1120,
          },
        },
      ],
    },
    {
      id: "client-cert-commit",
      title: "Prove client cert and finish TLS",
      simple:
        "The laptop signs its session with its client certificate {{rad-ccert}}. Per RFC 9190, TLS 1.3 closes with a protected `0x00` application-data byte {{rad-done}}, and both endpoints compute 64 octets of MSK key material.",
      technical:
        "RFC 9190 §2.5 uses a 1-octet `0x00` close_notify commitment indicator after Finished; server and client independently derive a 64-octet Master Session Key (MSK), unseen by the AP.",
      facts: [
        { label: "Client proof", value: "User certificate + private signature" },
        { label: "TLS 1.3 commit", value: "Encrypted 0x00 byte (RFC 9190)" },
        { label: "Derived secret", value: "64-octet MSK (hidden from AP)" },
      ],
      events: [
        {
          type: "packet",
          id: "rad-ccert",
          from: "laptop",
          to: "radius",
          via: ["ap"],
          tone: "secure",
          label: "CLIENT CERT + FIN",
          layers: [
            eapRadiusLayer("EAP-TLS Client Certificate + Finished", "Signed user certificate", [
              { name: "Private key", value: "Remains on client TPM/keystore" },
            ]),
          ],
          capture: {
            time: 0.04,
            src: LAPTOP_MAC,
            dst: RADIUS_IP,
            protocol: "EAP-TLS",
            info: "Certificate, CertificateVerify, Finished",
            bytes: 980,
          },
        },
        {
          type: "packet",
          id: "rad-done",
          from: "radius",
          to: "laptop",
          via: ["ap"],
          tone: "response",
          label: "TLS 0x00 COMMIT",
          layers: [
            eapRadiusLayer("EAP-TLS 1.3 Commitment (RFC 9190)", "Encrypted 0x00 indicator -> 64-octet MSK ready", [
              { name: "MSK length", value: "64 octets exported" },
            ]),
          ],
          capture: {
            time: 0.048,
            src: RADIUS_IP,
            dst: LAPTOP_MAC,
            protocol: "EAP-TLS",
            info: "Protected Success Commitment (0x00), MSK=64 B",
            bytes: 118,
          },
        },
      ],
    },
    {
      id: "accept-and-pmk",
      title: "Deliver PMK and VLAN in Accept",
      simple:
        "RADIUS replies `Access-Accept` holding `EAP-Success`, VLAN 20, and the 32-byte [[pmk|PMK]] wrapped inside `MS-MPPE-Recv-Key` for the AP {{rad-accept}}. Next, the standard 4-way handshake encrypts Wi-Fi {{rad-eap-succ}}.",
      technical:
        "The first 32 octets of the 64-octet MSK become the Wi-Fi Pairwise Master Key (`MS-MPPE-Recv-Key`, encrypted with shared secret), followed by the IEEE 802.11 4-way handshake and VLAN 20 port binding.",
      facts: [
        { label: "RADIUS reply", value: "Access-Accept (code 2)" },
        { label: "Delivered to AP", value: "32 B PMK + Tunnel-Private-Group VLAN 20" },
        { label: "Enterprise gain", value: "Disable 1 user without changing passwords" },
      ],
      events: [
        {
          type: "packet",
          id: "rad-accept",
          from: "radius",
          to: "ap",
          tone: "response",
          label: "ACCESS-ACCEPT (VLAN 20)",
          layers: [
            ethernetLayer({ srcMac: AP_MAC, dstMac: ROUTER_MAC }),
            ipv4Layer({ src: RADIUS_IP, dst: AP_LAN_IP, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + 190 }),
            udpLayer({ sport: RADIUS_PORT, dport: 43100, length: UDP_HEADER + 190 }),
            eapRadiusLayer("RADIUS Access-Accept", "EAP-Success + MS-MPPE-Recv-Key + VLAN 20", [
              { name: "VLAN", value: "20 (Staff network)" },
              { name: "Key", value: "MS-MPPE-Recv-Key (32 B PMK)" },
            ]),
          ],
          capture: {
            time: 0.056,
            src: RADIUS_IP,
            dst: AP_LAN_IP,
            protocol: "RADIUS",
            info: "Access-Accept (VLAN 20, MS-MPPE-Recv-Key)",
            bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + 190),
          },
        },
        {
          type: "packet",
          id: "rad-eap-succ",
          from: "ap",
          to: "laptop",
          tone: "response",
          label: "EAP-SUCCESS -> 4-WAY",
          layers: [
            eapRadiusLayer("EAPOL EAP-Success -> 4-Way Handshake", "Unlocks dynamic CCMP keys", [
              { name: "Unique PMK", value: "Derived per user login" },
            ]),
          ],
          capture: {
            time: 0.06,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "EAPOL",
            info: "EAP-Success (proceeding to 4-way handshake)",
            bytes: 60,
          },
        },
        {
          type: "note",
          id: "note-vlan",
          at: "ap",
          text: "Assigned VLAN 20 + unique PMK",
          tone: "response",
        },
      ],
    },
  ],
  outro: {
    title: "Authenticated centrally with unique Wi-Fi keys",
    simple:
      "The access point bridged Layer 2 EAPOL frames into Layer 7 RADIUS packets without storing passwords. The RADIUS server checked the laptop's certificate, assigned VLAN 20, and issued a per-login PMK.",
    technical:
      "Completed IEEE 802.1X EAPOL, RFC 2865/3579 RADIUS relay, RFC 9190 EAP-TLS 1.3 handshake (`0x00` commit), and dynamic VLAN + PMK provisioning.",
    facts: [
      { label: "Method", value: "EAP-TLS 1.3 (mutual certs)" },
      { label: "Layers", value: "EAPOL (L2) + RADIUS UDP 1812 (L7)" },
      { label: "Segment assigned", value: "VLAN 20" },
      { label: "Key isolation", value: "Unique 32 B PMK per user" },
    ],
  },
  tryIt: [
    {
      title: "Inspect enterprise 802.1X Wi-Fi auth details",
      explain: "Check whether your active enterprise Wi-Fi uses EAP-TLS or PEAP and view the negotiated cipher.",
      commands: [
        { os: "windows", cmd: "netsh wlan show interfaces" },
        { os: "macos", cmd: "networksetup -getairportnetwork en0" },
        { os: "linux", cmd: "nmcli con show --active" },
      ],
    },
  ],
});

function LAPTOP_IP_PLACEHOLDER(mac: string): string {
  return mac;
}
