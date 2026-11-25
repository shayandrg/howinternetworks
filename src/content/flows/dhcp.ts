import { defineFlow } from "../schema";
import { dhcpMessage } from "../builders/dhcp";
import { LAPTOP_IP, LAPTOP_MAC, RESOLVER_IP, ROUTER_LAN_IP } from "../world";

const XID_INIT = "0x3903f326";
const XID_RENEW = "0x7a1c22e5";

export const dhcpFlow = defineFlow({
  meta: {
    slug: "dhcp",
    kind: "flow",
    collection: "protocols",
    group: "joining",
    title: "DHCP",
    fullName: "Dynamic Host Configuration Protocol",
    tagline: "Automatically leasing an IP address and network settings",
    layer: {
      tcpip: "application",
      osi: 7,
      note: "Runs over UDP to set up layer 3",
    },
    prerequisites: [],
    related: ["ip", "udp", "ethernet", "dns", "ipv6"],
    tags: ["dhcp", "lease", "broadcast", "udp", "joining"],
    sources: [
      {
        label: "RFC 2131: Dynamic Host Configuration Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc2131",
      },
      {
        label: "RFC 2132: DHCP Options and BOOTP Vendor Extensions",
        url: "https://www.rfc-editor.org/rfc/rfc2132",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "When your device joins a network, [[dhcp|DHCP]] automatically gives it an [[ip-address]], the router's address, and a DNS server so it can get online.",
    technical:
      "Dynamic Host Configuration Protocol (RFC 2131) runs over [[udp|UDP]] ports 68 (client) and 67 (server). Through a four-message Discover-Offer-Request-ACK exchange, a server leases an IPv4 address plus options (RFC 2132) for a finite duration.",
  },
  facts: [
    { label: "Layer", value: "Application (UDP 67/68; configures Layer 3)" },
    { label: "Ports", value: "68 client, 67 server" },
    { label: "Exchange", value: "Discover, Offer, Request, ACK" },
    { label: "Provides", value: "IP, mask, gateway, DNS servers" },
    { label: "Defined in", value: "RFC 2131, RFC 2132" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: "0.0.0.0", at: { x: 240, y: 300 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 740, y: 300 } },
    ],
    links: [{ id: "l-wifi", from: "laptop", to: "router", medium: "wifi" }],
    start: {
      visible: ["laptop"],
      focus: ["laptop", "router"],
    },
  },
  steps: [
    {
      id: "no-address",
      title: "Join with no IP address",
      simple:
        "Your laptop just connected to Wi-Fi. It has a built-in [[mac-address]], but no [[ip-address]] yet, so it starts by using `0.0.0.0`.",
      technical:
        `Before DHCP completes, the interface holds only its link-layer address \`${LAPTOP_MAC}\` and uses \`0.0.0.0\` as its source IPv4 address while entering the INIT state (RFC 2131).`,
      facts: [
        { label: "Current IP", value: "0.0.0.0 (unassigned)" },
        { label: "MAC address", value: LAPTOP_MAC },
        { label: "Needs", value: "IP, mask, gateway, DNS" },
      ],
      events: [
        {
          type: "note",
          id: "note-no-ip",
          at: "laptop",
          text: "No IP address yet",
          tone: "request",
        },
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router"] },
            { type: "focus", actors: ["laptop", "router"] },
          ],
        },
      ],
    },
    {
      id: "discover",
      title: "Broadcast DHCP Discover",
      simple:
        "Without knowing where a DHCP server lives, your laptop shouts a Discover message {{dhcp-disc}} to everyone on the local network using [[broadcast]].",
      technical:
        `The client sends DHCPDISCOVER from \`0.0.0.0:68\` to \`255.255.255.255:67\` with transaction ID \`${XID_INIT}\` and its hardware address {{dhcp-disc}} (RFC 2131).`,
      facts: [
        { label: "Source", value: "0.0.0.0, UDP port 68" },
        { label: "Destination", value: "255.255.255.255, UDP port 67" },
        { label: "Transaction ID", value: XID_INIT },
      ],
      events: [
        dhcpMessage({
          id: "dhcp-disc",
          kind: "Discover",
          from: "laptop",
          to: "router",
          xid: XID_INIT,
          srcIp: "0.0.0.0",
          dstIp: "255.255.255.255",
          time: 0.0,
        }),
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "offer",
      title: "Propose a lease with Offer",
      simple:
        "Spotting an available address (`192.168.1.10`) in its pool, the router sends an Offer {{dhcp-offer}} carrying the gateway, DNS resolver, and lease window.",
      technical:
        `The server replies with DHCPOFFER proposing \`${LAPTOP_IP}/24\`, [[default-gateway]] \`${ROUTER_LAN_IP}\`, DNS resolver \`${RESOLVER_IP}\`, and an 86,400-second (24-hour) lease {{dhcp-offer}}.`,
      facts: [
        { label: "Offered IP", value: `${LAPTOP_IP}/24` },
        { label: "Gateway & DNS", value: `${ROUTER_LAN_IP}, ${RESOLVER_IP}` },
        { label: "Lease duration", value: "86,400 s (24 hours)" },
      ],
      events: [
        dhcpMessage({
          id: "dhcp-offer",
          kind: "Offer",
          from: "router",
          to: "laptop",
          xid: XID_INIT,
          offeredIp: LAPTOP_IP,
          serverIp: ROUTER_LAN_IP,
          srcIp: ROUTER_LAN_IP,
          dstIp: LAPTOP_IP,
          time: 0.004,
        }),
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "request-ack",
      title: "Accept and confirm the lease",
      simple:
        "Your laptop broadcasts a Request {{dhcp-req}} accepting the router's offer, and the router confirms it with an ACK {{dhcp-ack}}.",
      technical:
        "DHCPREQUEST is broadcast so any competing DHCP servers know their offers were declined {{dhcp-req}}. The chosen server sends DHCPACK {{dhcp-ack}}, committing the lease (RFC 2131).",
      facts: [
        { label: "Assigned IP", value: `${LAPTOP_IP}/24` },
        { label: "Selected server", value: ROUTER_LAN_IP },
        { label: "Check", value: "Clients often probe via ARP" },
      ],
      events: [
        dhcpMessage({
          id: "dhcp-req",
          kind: "Request",
          from: "laptop",
          to: "router",
          xid: XID_INIT,
          offeredIp: LAPTOP_IP,
          serverIp: ROUTER_LAN_IP,
          srcIp: "0.0.0.0",
          dstIp: "255.255.255.255",
          time: 0.008,
        }),
        dhcpMessage({
          id: "dhcp-ack",
          kind: "ACK",
          from: "router",
          to: "laptop",
          xid: XID_INIT,
          offeredIp: LAPTOP_IP,
          serverIp: ROUTER_LAN_IP,
          srcIp: ROUTER_LAN_IP,
          dstIp: LAPTOP_IP,
          time: 0.012,
        }),
        {
          type: "badge",
          at: "laptop",
          text: `${LAPTOP_IP} (24 h)`,
          tone: "response",
        },
      ],
    },
    {
      id: "renew",
      title: "Renew halfway through lease",
      simple:
        "Halfway through the 24-hour lease, your laptop already holds a valid address, so it unicasts a renewal Request straight to the router {{dhcp-ren-req}} and receives an updated ACK {{dhcp-ren-ack}}.",
      technical:
        `At timer T1 (50% of lease = 12 h), the client unicasts DHCPREQUEST directly to \`${ROUTER_LAN_IP}\` {{dhcp-ren-req}} and receives DHCPACK {{dhcp-ren-ack}}. If unreachable, it broadcasts at T2 (87.5%) per RFC 2131.`,
      facts: [
        { label: "T1 renewal", value: "50% of lease (12 h, unicast)" },
        { label: "T2 rebind", value: "87.5% of lease (21 h, broadcast)" },
        { label: "Renewed lease", value: "Reset to 24 hours" },
      ],
      events: [
        dhcpMessage({
          id: "dhcp-ren-req",
          kind: "Request",
          from: "laptop",
          to: "router",
          xid: XID_RENEW,
          offeredIp: LAPTOP_IP,
          serverIp: ROUTER_LAN_IP,
          srcIp: LAPTOP_IP,
          dstIp: ROUTER_LAN_IP,
          time: 0.02,
          tone: "request",
        }),
        dhcpMessage({
          id: "dhcp-ren-ack",
          kind: "ACK",
          from: "router",
          to: "laptop",
          xid: XID_RENEW,
          offeredIp: LAPTOP_IP,
          serverIp: ROUTER_LAN_IP,
          srcIp: ROUTER_LAN_IP,
          dstIp: LAPTOP_IP,
          time: 0.024,
        }),
      ],
    },
  ],
  outro: {
    title: "Address leased and renewed",
    simple:
      "Four broadcast-and-reply messages gave your laptop an IP address, gateway, and DNS server, and a direct unicast exchange renewed the lease halfway through.",
    technical:
      `Completed DORA initialization (${XID_INIT}) and T1 unicast renewal (${XID_RENEW}) over UDP ports 68 and 67 for ${LAPTOP_IP}/24.`,
    facts: [
      { label: "Join exchange", value: "4 messages (DORA)" },
      { label: "Renewal", value: "Unicast at 50% lease" },
      { label: "Leased IP", value: `${LAPTOP_IP}/24` },
      { label: "Ports", value: "UDP 68 -> 67" },
    ],
  },
  tryIt: [
    {
      title: "Inspect your DHCP-assigned settings",
      explain:
        "View your interface's leased IPv4 address, lease expiration, gateway, and DHCP server address.",
      commands: [
        { os: "windows", cmd: "ipconfig /all" },
        { os: "macos", cmd: "ifconfig" },
        { os: "linux", cmd: "ip addr" },
      ],
    },
  ],
});
