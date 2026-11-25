import { defineFlow } from "../schema";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import { AP_MAC, LAPTOP_MAC } from "../world";

const SSID = "HomeNet";

function wifiLayer(summary: string, fields: Array<{ name: string; value: string }>) {
  return { name: "IEEE 802.11", summary, fields };
}

function eapolLayer(msgNum: number, summary: string, fields: Array<{ name: string; value: string }>) {
  return {
    name: `EAPOL-Key (Message ${msgNum})`,
    summary,
    fields,
  };
}

export const wifiFlow = defineFlow({
  meta: {
    slug: "wifi",
    kind: "flow",
    collection: "protocols",
    group: "joining",
    title: "Wi-Fi",
    fullName: "IEEE 802.11 Wireless LAN (WPA2)",
    tagline: "Radio discovery, association, and the 4-way handshake",
    layer: { tcpip: "link", osi: 2 },
    prerequisites: ["ethernet"],
    related: ["wpa3", "radius", "dhcp", "ethernet"],
    tags: ["wifi", "802.11", "wpa2", "ccmp", "handshake"],
    sources: [
      {
        label: "IEEE 802.11-2024: Wireless LAN MAC and PHY Specifications",
        url: "https://standards.ieee.org/standard/802_11-2024.html",
      },
      {
        label: "Wi-Fi Alliance: Security Overview",
        url: "https://www.wi-fi.org/discover-wi-fi/security",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "[[wifi|Wi-Fi]] carries packets over radio waves. Before sending data, a laptop discovers the network name ([[ssid|SSID]]), associates with the access point, and proves it knows the password via a 4-way handshake without transmitting the password.",
    technical:
      "IEEE 802.11-2024 uses Beacon/Probe discovery, Open System authentication, and Association, followed by an EAPOL-Key 4-way handshake deriving fresh CCMP (AES-128) session keys from the Pairwise Master Key ([[pmk|PMK]]).",
  },
  facts: [
    { label: "Layer", value: "Link (IEEE 802.11 / OSI Layer 2)" },
    { label: "Cipher", value: "WPA2 CCMP (AES-128)" },
    { label: "Joining", value: "Beacon/Probe, Auth, Associate" },
    { label: "Key setup", value: "4-way EAPOL-Key handshake" },
    { label: "Defined in", value: "IEEE 802.11-2024" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_MAC, at: { x: 240, y: 300 } },
      { id: "ap", kind: "access-point", label: "Wi-Fi router", sublabel: AP_MAC, at: { x: 740, y: 300 } },
    ],
    links: [{ id: "l-wifi", from: "laptop", to: "ap", medium: "wifi" }],
    start: {
      visible: ["laptop", "ap"],
      focus: ["laptop", "ap"],
    },
  },
  steps: [
    {
      id: "discover",
      title: "Spot beacons and send probes",
      simple:
        "The router broadcasts a Beacon for `HomeNet` with WPA2 on channel 36 {{wifi-beacon}}. Your laptop sends a Probe Request {{wifi-probe-req}} and gets a Probe Response {{wifi-probe-res}}.",
      technical:
        "IEEE 802.11 passive scanning waits for ~102.4 ms beacons, while active scanning emits Probe Requests and parses RSN Information Elements in Probe Responses.",
      facts: [
        { label: "SSID", value: SSID },
        { label: "Band / Channel", value: "Channel 36 (5 GHz)" },
        { label: "RSN cipher", value: "WPA2-Personal (CCMP / PSK)" },
      ],
      events: [
        {
          type: "packet",
          id: "wifi-beacon",
          from: "ap",
          to: "laptop",
          tone: "lookup",
          label: "BEACON",
          fast: true,
          layers: [
            wifiLayer(`Beacon: SSID=${SSID}, Channel 36, RSN=WPA2-PSK`, [
              { name: "SSID", value: SSID },
              { name: "Channel", value: "36 (5180 MHz)" },
              { name: "Security", value: "RSN WPA2-PSK (CCMP)" },
            ]),
          ],
          capture: {
            time: 0.0,
            src: AP_MAC,
            dst: "ff:ff:ff:ff:ff:ff",
            protocol: "802.11",
            info: `Beacon frame, SSID=${SSID}, RSN=WPA2-PSK`,
            bytes: 210,
          },
        },
        {
          type: "packet",
          id: "wifi-probe-req",
          from: "laptop",
          to: "ap",
          tone: "request",
          label: "PROBE REQ",
          fast: true,
          layers: [
            wifiLayer(`Probe Request (SSID=${SSID})`, [{ name: "Client rates", value: "6-54 Mb/s + HT/VHT" }]),
          ],
          capture: {
            time: 0.012,
            src: LAPTOP_MAC,
            dst: "ff:ff:ff:ff:ff:ff",
            protocol: "802.11",
            info: `Probe Request, SSID=${SSID}`,
            bytes: 120,
          },
        },
        {
          type: "packet",
          id: "wifi-probe-res",
          from: "ap",
          to: "laptop",
          tone: "response",
          label: "PROBE RESP",
          fast: true,
          layers: [
            wifiLayer(`Probe Response (SSID=${SSID}, WPA2-PSK)`, [
              { name: "BSSID", value: AP_MAC },
              { name: "RSN IE", value: "AKM PSK, Pairwise CCMP" },
            ]),
          ],
          capture: {
            time: 0.014,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "802.11",
            info: `Probe Response, SSID=${SSID}`,
            bytes: 224,
          },
        },
      ],
    },
    {
      id: "join",
      title: "Authenticate and associate link",
      simple:
        "Open System auth accepts clients before any password check {{wifi-auth}}, then the laptop associates choosing CCMP {{wifi-assoc-req}}. Only EAPOL handshake frames pass next {{wifi-assoc-res}}.",
      technical:
        "Open System Authentication succeeds unconditionally; Association assigns AID=1 and enables the controlled 802.1X port solely for EAPOL key frames until the 4-way handshake completes.",
      facts: [
        { label: "Authentication", value: "Open System (no password yet)" },
        { label: "Association ID", value: "AID 1" },
        { label: "Permitted traffic", value: "EAPOL-Key frames only" },
      ],
      events: [
        {
          type: "packet",
          id: "wifi-auth",
          from: "laptop",
          to: "ap",
          tone: "handshake",
          label: "AUTH (OPEN)",
          fast: true,
          layers: [wifiLayer("Authentication Seq=1 (Open System)", [{ name: "Algorithm", value: "Open System (0)" }])],
          capture: {
            time: 0.02,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "802.11",
            info: "Authentication (Open System) Seq=1",
            bytes: 58,
          },
        },
        {
          type: "packet",
          id: "wifi-auth-ok",
          from: "ap",
          to: "laptop",
          tone: "response",
          label: "AUTH OK",
          fast: true,
          layers: [wifiLayer("Authentication Seq=2 (Status=Success)", [{ name: "Status", value: "Successful (0)" }])],
          capture: {
            time: 0.021,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "802.11",
            info: "Authentication (Open System) Seq=2: Success",
            bytes: 58,
          },
        },
        {
          type: "packet",
          id: "wifi-assoc-req",
          from: "laptop",
          to: "ap",
          tone: "request",
          label: "ASSOCIATE",
          fast: true,
          layers: [
            wifiLayer("Association Request (WPA2 CCMP)", [{ name: "RSN selection", value: "CCMP-128 / PSK" }]),
          ],
          capture: {
            time: 0.024,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "802.11",
            info: `Association Request, SSID=${SSID}`,
            bytes: 162,
          },
        },
        {
          type: "packet",
          id: "wifi-assoc-res",
          from: "ap",
          to: "laptop",
          tone: "response",
          label: "ASSOCIATED",
          fast: true,
          layers: [wifiLayer("Association Response (AID=1)", [{ name: "AID", value: "1 (802.1X port blocked)" }])],
          capture: {
            time: 0.026,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "802.11",
            info: "Association Response: AID=1, Success",
            bytes: 112,
          },
        },
      ],
    },
    {
      id: "handshake-nonces",
      title: "Swap nonces in Messages 1 and 2",
      simple:
        "Both sides share a [[pmk|PMK]] built from the password and SSID. The router sends ANonce {{wifi-m1}}, and the laptop sends SNonce plus an integrity MIC {{wifi-m2}}.",
      technical:
        "EAPOL-Key Message 1 delivers ANonce. Combining PMK, ANonce, SNonce, and both MACs derives the Pairwise Transient Key (PTK); Message 2 carries SNonce plus a MIC proving PMK possession.",
      facts: [
        { label: "Master key", value: "PMK (PBKDF2 from passphrase)" },
        { label: "Nonces", value: "ANonce (AP) + SNonce (laptop)" },
        { label: "Proof", value: "MIC verifies Message 2" },
      ],
      events: [
        {
          type: "packet",
          id: "wifi-m1",
          from: "ap",
          to: "laptop",
          tone: "secure",
          label: "MESSAGE 1 (ANonce)",
          layers: [
            wifiLayer("QoS Data (EAPOL-Key)", [{ name: "Protection", value: "Unencrypted handshake" }]),
            eapolLayer(1, "Key 1/4: ANonce", [{ name: "ANonce", value: "32 random bytes from AP" }]),
          ],
          capture: {
            time: 0.03,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "EAPOL",
            info: "Key (Message 1 of 4): ANonce",
            bytes: 135,
          },
        },
        {
          type: "packet",
          id: "wifi-m2",
          from: "laptop",
          to: "ap",
          tone: "secure",
          label: "MESSAGE 2 (SNonce)",
          layers: [
            wifiLayer("QoS Data (EAPOL-Key)", [{ name: "Action", value: "Derive PTK locally" }]),
            eapolLayer(2, "Key 2/4: SNonce + MIC", [
              { name: "SNonce", value: "32 random bytes from laptop" },
              { name: "MIC", value: "HMAC-SHA1-128 over EAPOL frame" },
            ]),
          ],
          capture: {
            time: 0.033,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "EAPOL",
            info: "Key (Message 2 of 4): SNonce + MIC",
            bytes: 157,
          },
        },
      ],
    },
    {
      id: "handshake-keys",
      title: "Install group key in Msg 3 & 4",
      simple:
        "Message 3 proves the router holds the same keys and delivers the encrypted group key (GTK) for broadcasts {{wifi-m3}}. Message 4 confirms the laptop installed the keys {{wifi-m4}}.",
      technical:
        "Message 3 sends the AES-wrapped Group Temporal Key (GTK) with MIC; Message 4 acknowledges key installation so both peers enable CCMP encryption simultaneously.",
      facts: [
        { label: "Group key", value: "GTK (encrypted in Message 3)" },
        { label: "Session cipher", value: "CCMP (AES-128)" },
        { label: "Activation", value: "Both install PTK after Message 4" },
      ],
      events: [
        {
          type: "packet",
          id: "wifi-m3",
          from: "ap",
          to: "laptop",
          tone: "secure",
          label: "MESSAGE 3 (GTK)",
          layers: [
            eapolLayer(3, "Key 3/4: Install PTK + encrypted GTK", [
              { name: "GTK", value: "AES Key-Wrap encrypted group key" },
              { name: "MIC", value: "Proves AP derived matching PTK" },
            ]),
          ],
          capture: {
            time: 0.036,
            src: AP_MAC,
            dst: LAPTOP_MAC,
            protocol: "EAPOL",
            info: "Key (Message 3 of 4): Encrypted GTK + Install bit",
            bytes: 189,
          },
        },
        {
          type: "packet",
          id: "wifi-m4",
          from: "laptop",
          to: "ap",
          tone: "secure",
          label: "MESSAGE 4 (READY)",
          layers: [
            eapolLayer(4, "Key 4/4: Ready for CCMP data", [{ name: "Status", value: "Port open; CCMP active" }]),
          ],
          capture: {
            time: 0.039,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "EAPOL",
            info: "Key (Message 4 of 4): Keys installed",
            bytes: 135,
          },
        },
      ],
    },
    {
      id: "encrypted-data",
      title: "Encrypt frames and check risks",
      simple:
        "Data like [[dhcp|DHCP]] Discover now travels AES-encrypted {{wifi-data}}. Anyone capturing Messages 1-4 can crack weak passwords offline; long passphrases or [[wpa3|WPA3]] fix that.",
      technical:
        "Data frames encrypt IP packets under CCMP, leaving only 802.11 MAC headers, frame lengths, and timing visible. Because WPA2-PSK derives PMK solely from SSID + password, offline dictionary attacks work on recorded handshakes.",
      facts: [
        { label: "Exposed metadata", value: "MAC headers, sizes, timing" },
        { label: "WPA2 flaw", value: "Offline dictionary crack on MIC" },
        { label: "Upgrade fix", value: "Long random passphrase or WPA3" },
      ],
      events: [
        {
          type: "note",
          id: "note-ccmp",
          at: "laptop",
          text: "CCMP encryption active",
          tone: "response",
        },
        {
          type: "packet",
          id: "wifi-data",
          from: "laptop",
          to: "ap",
          tone: "data",
          label: "DATA (CCMP)",
          layers: [
            wifiLayer("802.11 QoS Data (Protected=1)", [{ name: "CCMP header", value: "Key ID 0, Packet Number PN=1" }]),
            ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: AP_MAC }),
            ipv4Layer({ src: "0.0.0.0", dst: "255.255.255.255", protocol: "UDP (17)", totalLength: 328 }),
            udpLayer({ sport: 68, dport: 67, length: 308 }),
          ],
          capture: {
            time: 0.045,
            src: LAPTOP_MAC,
            dst: AP_MAC,
            protocol: "802.11",
            info: "QoS Data (Protected CCMP payload: DHCP Discover)",
            bytes: padFrameBytes(34 + IPV4_HEADER + UDP_HEADER + 300),
          },
        },
      ],
    },
  ],
  outro: {
    title: "Connected with fresh per-session keys",
    simple:
      "The laptop scanned beacons, completed Open System auth and association, and ran the 4-way handshake to derive fresh CCMP keys without sending the password over the air.",
    technical:
      "IEEE 802.11-2024 association + WPA2-Personal 4-way EAPOL-Key handshake yielded unique PTK and GTK keys prior to DHCP.",
    facts: [
      { label: "Frames exchanged", value: "11 management + EAPOL frames" },
      { label: "Password on wire", value: "Never sent" },
      { label: "Session keys", value: "Fresh PTK every connection" },
      { label: "Next step", value: "DHCP acquires an IP address" },
    ],
  },
  tryIt: [
    {
      title: "Inspect active Wi-Fi security and channel",
      explain: "Check your current SSID, band, radio channel, and encryption cipher.",
      commands: [
        { os: "windows", cmd: "netsh wlan show interfaces" },
        { os: "macos", cmd: "wdutil info" },
        { os: "linux", cmd: "nmcli -f IN-USE,SSID,CHAN,SECURITY dev wifi" },
      ],
    },
  ],
});
