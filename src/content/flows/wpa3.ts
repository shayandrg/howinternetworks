import { defineFlow } from "../schema";
import { AP_MAC, LAPTOP_MAC } from "../world";

const SSID = "HomeNet-WPA3";

function wpa3Layer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "IEEE 802.11 (WPA3)", summary, fields };
}

export const wpa3Flow = defineFlow({
  meta: {
    slug: "wpa3",
    kind: "flow",
    collection: "protocols",
    group: "joining",
    title: "WPA3",
    fullName: "Wi-Fi Protected Access 3",
    tagline: "Offline-proof SAE password exchange and protected management",
    layer: { tcpip: "link", osi: 2 },
    prerequisites: ["wifi"],
    related: ["wifi", "radius", "ethernet"],
    tags: ["wpa3", "sae", "wifi", "pmf", "security"],
    sources: [
      {
        label: "IEEE 802.11-2024: Wireless LAN MAC and PHY Specifications (SAE)",
        url: "https://standards.ieee.org/standard/802_11-2024.html",
      },
      {
        label: "RFC 7664: Dragonfly Key Exchange (background)",
        url: "https://www.rfc-editor.org/rfc/rfc7664",
      },
      {
        label: "Wi-Fi Alliance: Security (WPA3)",
        url: "https://www.wi-fi.org/discover-wi-fi/security",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[wpa3|WPA3]] secures Wi-Fi so capturing handshake packets lets attackers learn nothing offline. Its [[sae|SAE]] handshake creates a unique master key per connection and enforces cryptographic protection on management frames.",
    technical:
      "Defined in IEEE 802.11-2024 (with Dragonfly background in RFC 7664), WPA3-Personal replaces Open System auth + static PSK with SAE plus mandatory Protected Management Frames (PMF), defeating offline guessing and spoofed disconnects.",
  },
  facts: [
    { label: "Layer", value: "Link (IEEE 802.11 / OSI Layer 2)" },
    { label: "Password auth", value: "SAE (IEEE 802.11-2024)" },
    { label: "After SAE", value: "EAPOL 4-way handshake" },
    { label: "Management", value: "PMF mandatory (IGTK in Msg 3)" },
    { label: "Defined in", value: "IEEE 802.11-2024; RFC 7664" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_MAC, at: { x: 240, y: 300 } },
      { id: "ap", kind: "access-point", label: "WPA3 router", sublabel: AP_MAC, at: { x: 740, y: 300 } },
    ],
    links: [{ id: "l-wifi", from: "laptop", to: "ap", medium: "wifi" }],
    start: {
      visible: ["laptop", "ap"],
      focus: ["laptop", "ap"],
    },
  },
  steps: [
    {
      id: "beacon",
      title: "Beacon advertises SAE and PMF",
      simple:
        "The router's Beacon looks similar to WPA2, except its security block specifies AKM suite `SAE` rather than `PSK` and sets Protected Management Frames to required {{wpa3-beacon}}.",
      technical:
        "In the RSN Information Element (IEEE 802.11-2024), the AP selects AKM `00-0F-AC:8` (SAE) or `24` (SAE-EXT-KEY) and mandates Management Frame Protection Required (MFPR=1).",
      facts: [
        { label: "AKM suite", value: "SAE (replaces static PSK)" },
        { label: "PMF policy", value: "Required (MFPR = 1)" },
        { label: "H2E support", value: "Hash-to-element resists timing leaks" },
      ],
      events: [
        {
          type: "packet",
          id: "wpa3-beacon",
          from: "ap",
          to: "laptop",
          tone: "lookup",
          label: "BEACON (SAE + PMF)",
          layers: [
            wpa3Layer(`Beacon: SSID=${SSID}, RSN=SAE, PMF=Required`, [
              { name: "AKM", value: "SAE + H2E (IEEE 802.11-2024)" },
              { name: "PMF", value: "MFPC=1, MFPR=1" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: AP_MAC,
            dst: "ff:ff:ff:ff:ff:ff",
            protocol: "802.11",
            info: `Beacon, SSID=${SSID}, AKM=SAE, PMF=Required`,
            bytes: 218,
          },
        },
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "sae-commit",
      title: "Exchange SAE Commit shares",
      simple:
        "Replacing Open Auth, both peers pick random secrets, compute a password point via hash-to-element (stopping timing leaks), and swap scalars {{wpa3-commit-c}} {{wpa3-commit-a}}.",
      technical:
        "SAE Commit replaces Open Auth on Group 19 (NIST P-256). IEEE 802.11-2024 adds Hash-to-Element (H2E) derivation to eliminate Dragonblood cache/timing side-channel leaks during password-to-curve mapping.",
      facts: [
        { label: "Curve group", value: "Group 19 (256-bit P-256)" },
        { label: "Side-channel fix", value: "H2E mitigates Dragonblood" },
        { label: "Output", value: "Fresh ephemeral share per peer" },
      ],
      events: [
        {
          type: "packet",
          id: "wpa3-commit-c",
          from: "laptop",
          to: "ap",
          tone: "secure",
          label: "SAE COMMIT",
          layers: [
            wpa3Layer("Authentication SAE Seq=1 (Commit)", [
              { name: "Group", value: "19 (256-bit EC)" },
              { name: "Payload", value: "Client scalar + curve element" },
            ]),
          ],
          capture: {
            time: 0.01,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "802.11",
            info: "Authentication (SAE Commit) Seq=1, Group=19",
            bytes: 138,
          },
        },
        {
          type: "packet",
          id: "wpa3-commit-a",
          from: "ap",
          to: "laptop",
          tone: "secure",
          label: "SAE COMMIT",
          layers: [
            wpa3Layer("Authentication SAE Seq=1 (Commit)", [
              { name: "Group", value: "19 (256-bit EC)" },
              { name: "Payload", value: "AP scalar + curve element" },
            ]),
          ],
          capture: {
            time: 0.012,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "802.11",
            info: "Authentication (SAE Commit) Seq=1, Group=19",
            bytes: 138,
          },
        },
      ],
    },
    {
      id: "sae-confirm",
      title: "Prove key match via SAE Confirm",
      simple:
        "Both compute the fresh [[pmk|PMK]] and swap Confirm hashes proving they derived the exact same key {{wpa3-confirm-c}} {{wpa3-confirm-a}}. Every guess requires a live AP interaction, blocking offline brute-forcing.",
      technical:
        "SAE Confirm (Seq=2) validates mutual password knowledge and produces a fresh PMK with forward secrecy; past traffic stays protected even if the passphrase later leaks.",
      facts: [
        { label: "Offline crack", value: "Impossible (rate-limited live only)" },
        { label: "Forward secrecy", value: "Past sessions stay safe" },
        { label: "Result", value: "Unique 256-bit PMK per login" },
      ],
      events: [
        {
          type: "packet",
          id: "wpa3-confirm-c",
          from: "laptop",
          to: "ap",
          tone: "secure",
          label: "SAE CONFIRM",
          layers: [
            wpa3Layer("Authentication SAE Seq=2 (Confirm)", [{ name: "Confirm hash", value: "MAC over KCK + scalars" }]),
          ],
          capture: {
            time: 0.016,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "802.11",
            info: "Authentication (SAE Confirm) Seq=2",
            bytes: 76,
          },
        },
        {
          type: "packet",
          id: "wpa3-confirm-a",
          from: "ap",
          to: "laptop",
          tone: "response",
          label: "SAE CONFIRM",
          layers: [
            wpa3Layer("Authentication SAE Seq=2 (Confirm)", [{ name: "Result", value: "Fresh PMK confirmed" }]),
          ],
          capture: {
            time: 0.018,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "802.11",
            info: "Authentication (SAE Confirm) Seq=2: PMK accepted",
            bytes: 76,
          },
        },
      ],
    },
    {
      id: "assoc-and-4way",
      title: "Associate and run 4-way setup",
      simple:
        "The laptop associates citing `SAE` {{wpa3-assoc}} and completes the 4-way handshake seeded from the new PMK {{wpa3-m1}} {{wpa3-m3}}. Message 3 also brings the IGTK to sign broadcast management frames.",
      technical:
        "After Association (AID=1), EAPOL Messages 1-4 install the PTK, GTK, and Integrity Group Temporal Key (IGTK / BIP-CMAC-128) required by Protected Management Frames.",
      facts: [
        { label: "Association ID", value: "AID 1 (AKM=SAE)" },
        { label: "Message 3 extra", value: "Delivers IGTK for management frames" },
        { label: "Data cipher", value: "CCMP (AES-128)" },
      ],
      events: [
        {
          type: "packet",
          id: "wpa3-assoc",
          from: "laptop",
          to: "ap",
          tone: "request",
          label: "ASSOCIATE",
          fast: true,
          layers: [wpa3Layer("Association Request (SAE, PMF=Required)", [{ name: "AID request", value: "CCMP + BIP-CMAC-128" }])],
          capture: {
            time: 0.021,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "802.11",
            info: `Association Request, SSID=${SSID}, AKM=SAE`,
            bytes: 166,
          },
        },
        {
          type: "packet",
          id: "wpa3-assoc-ok",
          from: "ap",
          to: "laptop",
          tone: "response",
          label: "ASSOCIATED",
          fast: true,
          layers: [wpa3Layer("Association Response (AID=1)", [{ name: "Status", value: "Associated" }])],
          capture: {
            time: 0.023,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "802.11",
            info: "Association Response: AID=1, Success",
            bytes: 114,
          },
        },
        {
          type: "packet",
          id: "wpa3-m1",
          from: "ap",
          to: "laptop",
          tone: "secure",
          label: "MSG 1 -> MSG 2",
          fast: true,
          layers: [wpa3Layer("EAPOL-Key Messages 1 & 2", [{ name: "Exchange", value: "ANonce / SNonce + MIC" }])],
          capture: {
            time: 0.026,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "EAPOL",
            info: "4-Way Handshake Messages 1 & 2 (fresh SAE PMK)",
            bytes: 157,
          },
        },
        {
          type: "packet",
          id: "wpa3-m3",
          from: "ap",
          to: "laptop",
          tone: "secure",
          label: "MSG 3 (IGTK) -> 4",
          fast: true,
          layers: [wpa3Layer("EAPOL-Key Messages 3 & 4", [{ name: "Keys installed", value: "PTK + GTK + IGTK" }])],
          capture: {
            time: 0.03,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "EAPOL",
            info: "4-Way Handshake Messages 3 & 4 (+ IGTK for PMF)",
            bytes: 215,
          },
        },
      ],
    },
    {
      id: "pmf-protection",
      title: "Stop forged disconnect attacks",
      simple:
        "Under WPA2, an attacker could broadcast fake Deauthenticate frames to force clients to reconnect. Because WPA3 mandates PMF, unauthenticated disconnects are ignored {{wpa3-deauth}}.",
      technical:
        "Protected Management Frames (IEEE 802.11w, mandatory in WPA3) require CCMP/BIP signatures on deauthentication and disassociation frames. Note that WPA2/WPA3 transition-mode SSIDs leave legacy WPA2 clients vulnerable.",
      facts: [
        { label: "PMF covers", value: "Deauth, disassociate, robust action" },
        { label: "Transition mode", value: "Allows WPA2 fallback (riskier)" },
        { label: "Enterprise mode", value: "Optional 192-bit CNSA suite" },
      ],
      events: [
        {
          type: "packet",
          id: "wpa3-deauth",
          from: "ap",
          to: "laptop",
          tone: "error",
          label: "FORGED DEAUTH (IGNORED)",
          layers: [
            wpa3Layer("Unprotected Deauthentication rejected by PMF", [
              { name: "Verification", value: "Missing valid MIC -> dropped" },
            ]),
          ],
          capture: {
            time: 0.04,
            src: "00:00:5e:00:53:99",
            dst: LAPTOP_MAC,
            protocol: "802.11",
            info: "Spoofed Deauthentication dropped (PMF protected)",
            bytes: 48,
          },
        },
        {
          type: "note",
          id: "note-pmf",
          at: "laptop",
          text: "Management frames protected",
          tone: "response",
        },
      ],
    },
  ],
  outro: {
    title: "Mutual proof without offline leakage",
    simple:
      "SAE turned a shared password into a fresh session key that cannot be brute-forced offline, while mandatory PMF blocks spoofed disconnect frames.",
    technical:
      "IEEE 802.11-2024 SAE authentication (with H2E), 4-way handshake with IGTK, and mandatory PMF secured the link.",
    facts: [
      { label: "SAE frames", value: "Commit + Confirm (4 frames)" },
      { label: "Handshake", value: "4 EAPOL-Key frames (+ IGTK)" },
      { label: "Offline cracking", value: "Blocked" },
      { label: "Fake disconnects", value: "Dropped via PMF" },
    ],
  },
  tryIt: [
    {
      title: "Check whether your Wi-Fi uses WPA3-SAE",
      explain: "Verify the active authentication mode and cipher suite reported by your OS.",
      commands: [
        { os: "windows", cmd: "netsh wlan show interfaces" },
        { os: "macos", cmd: "wdutil info" },
        { os: "linux", cmd: "iw dev wlan0 link" },
      ],
    },
  ],
});
