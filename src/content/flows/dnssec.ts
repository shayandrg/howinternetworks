import { defineFlow } from "../schema";
import { dnsQuery, dnsResponse } from "../builders/dns";
import { ethernetLayer, ipv4Layer, udpLayer } from "../builders/layers";
import { IPV4_HEADER, padFrameBytes, UDP_HEADER } from "../builders/sizes";
import {
  AUTH_SERVER_IP,
  DNS_CLIENT_PORT,
  LAPTOP_IP,
  LAPTOP_MAC,
  RESOLVER_IP,
  ROUTER_LAN_IP,
  ROUTER_MAC,
  TLD_SERVER_IP,
  WEB_DOMAIN,
  WEB_SERVER_IP,
} from "../world";

function dnssecPacket(
  id: string,
  from: string,
  to: string,
  srcIp: string,
  dstIp: string,
  label: string,
  tone: "lookup" | "response" | "secure",
  summary: string,
  fields: Array<{ name: string; value: string }>,
  time: number,
  bytes: number,
  via?: string[],
) {
  return {
    type: "packet" as const,
    id,
    from,
    to,
    via,
    tone,
    label,
    layers: [
      ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
      ipv4Layer({ src: srcIp, dst: dstIp, protocol: "UDP (17)", totalLength: IPV4_HEADER + UDP_HEADER + bytes }),
      udpLayer({ sport: 53, dport: 53, length: UDP_HEADER + bytes }),
      { name: "DNS + DNSSEC", summary, fields },
    ],
    capture: {
      time,
      src: srcIp,
      dst: dstIp,
      protocol: "DNS",
      info: summary,
      bytes: padFrameBytes(14 + IPV4_HEADER + UDP_HEADER + bytes),
    },
  };
}

export const dnssecFlow = defineFlow({
  meta: {
    slug: "dnssec",
    kind: "flow",
    collection: "protocols",
    group: "names",
    title: "DNSSEC",
    fullName: "DNS Security Extensions",
    tagline: "Cryptographic signatures verifying authentic DNS records",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: ["dns"],
    related: ["dns", "dns-over-https", "tls"],
    tags: ["dnssec", "dns", "rrsig", "dnskey", "ds"],
    sources: [
      {
        label: "RFC 4033: DNS Security Introduction and Requirements",
        url: "https://www.rfc-editor.org/rfc/rfc4033",
      },
      {
        label: "RFC 4034: Resource Records for the DNS Security Extensions",
        url: "https://www.rfc-editor.org/rfc/rfc4034",
      },
      {
        label: "RFC 4035: Protocol Modifications for the DNS Security Extensions",
        url: "https://www.rfc-editor.org/rfc/rfc4035",
      },
      {
        label: "RFC 6781: DNSSEC Operational Practices (KSK/ZSK Signing)",
        url: "https://www.rfc-editor.org/rfc/rfc6781",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-26",
  },
  intro: {
    simple:
      "Classic DNS replies carry no signature, allowing attackers to spoof fake IP answers. [[dnssec|DNSSEC]] attaches cryptographic signatures to records so a validating [[resolver]] can trace trust down from the root zone.",
    technical:
      "Defined in RFC 4033-4035, DNSSEC uses `RRSIG`, `DNSKEY`, and parent `DS` records to prove origin authenticity and data integrity. It does not encrypt queries or answers; encryption comes from DoH or DoT.",
  },
  facts: [
    { label: "Layer", value: "Application (DNS extensions)" },
    { label: "Records added", value: "RRSIG, DNSKEY, DS, NSEC/NSEC3" },
    { label: "Verified by", value: "Validating recursive resolver" },
    { label: "Trust anchor", value: "Built-in root zone public key" },
    { label: "Defined in", value: "RFC 4033, 4034, 4035, 6781" },
  ],
  scene: {
    actors: [
      { id: "laptop", kind: "laptop", label: "Your laptop", sublabel: LAPTOP_IP, at: { x: 100, y: 310 } },
      { id: "router", kind: "router", label: "Home router", sublabel: ROUTER_LAN_IP, at: { x: 290, y: 310 } },
      { id: "dns", kind: "dns-server", label: "Resolver", sublabel: RESOLVER_IP, at: { x: 520, y: 310 } },
      { id: "tld", kind: "dns-server", label: ".com TLD", sublabel: TLD_SERVER_IP, at: { x: 780, y: 150 } },
      { id: "auth", kind: "dns-server", label: "example.com NS", sublabel: AUTH_SERVER_IP, at: { x: 780, y: 420 } },
    ],
    links: [
      { id: "l-lan", from: "laptop", to: "router", medium: "wifi" },
      { id: "l-wan", from: "router", to: "dns", medium: "fiber" },
      { id: "l-tld", from: "dns", to: "tld", medium: "internet" },
      { id: "l-auth", from: "dns", to: "auth", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "stub-query",
      title: "Send standard query to resolver",
      simple:
        "Your laptop sends the same plain DNS request as usual to `8.8.8.8` {{dnssec-stub-q}}. Signature checking happens at the validating resolver, which adds the `DNSSEC OK` (`DO`) bit upstream.",
      technical:
        "Per RFC 4035 §3.2, validating resolvers set the EDNS0 `DO` bit when contacting authoritative servers so responses include `RRSIG` records.",
      facts: [
        { label: "Query", value: `${WEB_DOMAIN} IN A` },
        { label: "Validator", value: RESOLVER_IP },
        { label: "Upstream bit", value: "DNSSEC OK (DO = 1)" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "dns", "tld", "auth"] },
            { type: "focus", actors: ["laptop", "router", "dns", "tld", "auth"] },
          ],
        },
        dnsQuery({
          id: "dnssec-stub-q",
          from: "laptop",
          to: "dns",
          via: ["router"],
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          srcPort: DNS_CLIENT_PORT,
          txId: 0x5101,
          qname: WEB_DOMAIN,
          qtype: "A",
          time: 0.0,
        }),
        { type: "wait", ms: 250 },
      ],
    },
    {
      id: "a-and-rrsig",
      title: "Receive A record plus RRSIG",
      simple:
        "Asking `example.com`'s server with `DO=1` {{dnssec-auth-q}} brings back `203.0.113.10` alongside an [[rrsig|RRSIG]] signature created with the zone's signing key (key tag 47362) {{dnssec-auth-a}}.",
      technical:
        "Authoritative `ns1.example.com` replies with both the `A` RRset and its `RRSIG` naming key tag `47362` (ZSK) and validity timestamps (ECDSA P-256 / algorithm 13).",
      facts: [
        { label: "Answer", value: `A ${WEB_SERVER_IP}` },
        { label: "Signature", value: "RRSIG (key tag 47362)" },
        { label: "Validity window", value: "3 weeks (signed interval)" },
      ],
      events: [
        dnssecPacket(
          "dnssec-auth-q",
          "dns",
          "auth",
          RESOLVER_IP,
          AUTH_SERVER_IP,
          "A? + DO",
          "lookup",
          `DNS Query A ${WEB_DOMAIN} (EDNS0 DO=1)`,
          [{ name: "DO bit", value: "1 (DNSSEC OK)" }],
          0.01,
          44,
        ),
        dnssecPacket(
          "dnssec-auth-a",
          "auth",
          "dns",
          AUTH_SERVER_IP,
          RESOLVER_IP,
          "A + RRSIG",
          "response",
          `A ${WEB_SERVER_IP} + RRSIG (key 47362)`,
          [
            { name: "A record", value: WEB_SERVER_IP },
            { name: "RRSIG", value: "Signer=example.com, KeyTag=47362, Alg=13" },
          ],
          0.024,
          164,
        ),
      ],
    },
    {
      id: "dnskey",
      title: "Fetch the zone's DNSKEYs",
      simple:
        "To verify that signature, the resolver asks for `example.com`'s [[dnskey|DNSKEY]] set {{dnssec-key-q}}: key 47362 (ZSK) that signed records, and key 61845 (KSK) that signs the DNSKEY set {{dnssec-key-a}}.",
      technical:
        "The zone publishes ZSK (`flags=256`, key 47362) and KSK (`flags=257`, key 61845) along with an `RRSIG` over the `DNSKEY` RRset made by the KSK (RFC 6781).",
      facts: [
        { label: "ZSK (flags 256)", value: "47362 (signs zone RRsets)" },
        { label: "KSK (flags 257)", value: "61845 (signs DNSKEY RRset)" },
        { label: "Next check", value: "Who trusts KSK 61845?" },
      ],
      events: [
        dnssecPacket(
          "dnssec-key-q",
          "dns",
          "auth",
          RESOLVER_IP,
          AUTH_SERVER_IP,
          "DNSKEY?",
          "lookup",
          "Query DNSKEY example.com (DO=1)",
          [{ name: "QTYPE", value: "DNSKEY (48)" }],
          0.03,
          42,
        ),
        dnssecPacket(
          "dnssec-key-a",
          "auth",
          "dns",
          AUTH_SERVER_IP,
          RESOLVER_IP,
          "DNSKEY + RRSIG",
          "secure",
          "DNSKEY (ZSK 47362, KSK 61845) + RRSIG",
          [
            { name: "Keys", value: "256 (ZSK 47362), 257 (KSK 61845)" },
            { name: "Signed by", value: "KSK 61845" },
          ],
          0.044,
          286,
        ),
      ],
    },
    {
      id: "ds-parent",
      title: "Confirm KSK via parent DS record",
      simple:
        "The resolver queries `.com` for `example.com`'s [[ds-record|DS record]] {{dnssec-ds-q}}: a cryptographic hash of KSK 61845 signed with `.com`'s own zone-signing key {{dnssec-ds-a}}.",
      technical:
        "Parent `.com` answers with the DS digest matching KSK 61845 and an RRSIG created by `.com`'s zone-signing key (ZSK) per RFC 6781 §3.1, linking parent trust to the child.",
      facts: [
        { label: "DS digest", value: "SHA-256 hash of KSK 61845" },
        { label: "Signed by", value: ".com zone-signing key (ZSK)" },
        { label: "Binding", value: "Parent vouches for child KSK" },
      ],
      events: [
        dnssecPacket(
          "dnssec-ds-q",
          "dns",
          "tld",
          RESOLVER_IP,
          TLD_SERVER_IP,
          "DS?",
          "lookup",
          "Query DS example.com (DO=1)",
          [{ name: "QTYPE", value: "DS (43)" }],
          0.05,
          42,
        ),
        dnssecPacket(
          "dnssec-ds-a",
          "tld",
          "dns",
          TLD_SERVER_IP,
          RESOLVER_IP,
          "DS + RRSIG",
          "secure",
          "DS (KeyTag 61845) + RRSIG (.com ZSK)",
          [
            { name: "DS", value: "KeyTag=61845, DigestType=SHA-256" },
            { name: "RRSIG", value: "Signed by .com ZSK" },
          ],
          0.064,
          198,
        ),
      ],
    },
    {
      id: "root-chain",
      title: "Anchor chain at built-in root",
      simple:
        "`.com`'s own keys are similarly hashed in a cached DS record signed by the DNS root zone. Resolvers ship with the root zone's public trust anchor built in, completing the chain.",
      technical:
        "Starting from the IANA root trust anchor configured in the validating resolver, the chain Root -> `.com` -> `example.com` validates every link cryptographically.",
      facts: [
        { label: "Trust anchor", value: "Root KSK embedded in resolver" },
        { label: "Chain", value: "Root -> .com -> example.com -> A" },
        { label: "Cached link", value: "Root DS + .com DNSKEY cached" },
      ],
      events: [
        {
          type: "note",
          id: "dnssec-note-chain",
          at: "dns",
          text: "Chain Root -> .com -> example.com verified",
          tone: "response",
        },
        { type: "wait", ms: 1600 },
      ],
    },
    {
      id: "ad-reply",
      title: "Return signed reply with AD bit",
      simple:
        "Because every signature checks out, the resolver returns `203.0.113.10` with the Authenticated Data (`AD`) bit set {{dnssec-stub-a}}. A forged record or expired signature would return `SERVFAIL` instead.",
      technical:
        "RFC 4035 sets `AD=1` in the stub response once the full DNSSEC chain verifies; any broken signature forces `RCODE=2 (SERVFAIL)` to block spoofed answers.",
      facts: [
        { label: "Stub answer", value: `A ${WEB_SERVER_IP} (AD=1)` },
        { label: "Bad signature", value: "Returns SERVFAIL, no IP" },
        { label: "Confidentiality", value: "Public in transit (use DoH to hide)" },
      ],
      events: [
        dnsResponse({
          id: "dnssec-stub-a",
          from: "dns",
          to: "laptop",
          via: ["router"],
          srcIp: RESOLVER_IP,
          dstIp: LAPTOP_IP,
          dstPort: DNS_CLIENT_PORT,
          txId: 0x5101,
          qname: WEB_DOMAIN,
          qtype: "A",
          answers: [{ name: WEB_DOMAIN, type: "A", ttl: 300, value: WEB_SERVER_IP }],
          time: 0.075,
        }),
        { type: "wait", ms: 250 },
      ],
    },
  ],
  outro: {
    title: "Origin authenticity proved by signatures",
    simple:
      "The resolver checked `example.com`'s address signature, fetched its DNSKEYs, confirmed its key-signing key via `.com`'s signed DS record, and anchored trust in the root key.",
    technical:
      "DNSSEC chain validation (`A` + `RRSIG` <- ZSK <- `DNSKEY` <- KSK <- parent `DS` <- root trust anchor) succeeded and marked `AD=1`.",
    facts: [
      { label: "Algorithm", value: "ECDSA P-256 (13)" },
      { label: "Verified path", value: "Root -> .com -> example.com" },
      { label: "Client signal", value: "AD (Authenticated Data) bit" },
      { label: "Tampered record", value: "Rejected with SERVFAIL" },
    ],
  },
  tryIt: [
    {
      title: "Verify DNSSEC flags using dig",
      explain: "Look for the `ad` flag and RRSIG records when querying a DNSSEC-signed domain.",
      commands: [
        { os: "windows", cmd: "dig +dnssec +multi isc.org A" },
        { os: "macos", cmd: "dig +dnssec +multi isc.org A" },
        { os: "linux", cmd: "dig +dnssec +multi isc.org A" },
      ],
    },
  ],
});
