import { defineFlow } from "../schema";
import { dnsQuery, dnsResponse } from "../builders/dns";
import {
  AUTH_SERVER_2_IP,
  AUTH_SERVER_2_NAME,
  AUTH_SERVER_IP,
  AUTH_SERVER_NAME,
  DNS_CLIENT_PORT,
  LAPTOP_IP,
  RESOLVER_IP,
  ROOT_SERVER_IP,
  ROOT_SERVER_NAME,
  ROUTER_LAN_IP,
  TLD_SERVER_IP,
  TLD_SERVER_NAME,
  WEB_DOMAIN,
  WEB_SERVER_IP,
} from "../world";

export const dnsFlow = defineFlow({
  meta: {
    slug: "dns",
    kind: "flow",
    collection: "protocols",
    group: "names",
    title: "DNS",
    fullName: "Domain Name System",
    tagline: "How domain names turn into IP addresses",
    layer: { tcpip: "application", osi: 7 },
    prerequisites: [],
    related: ["ip", "udp", "http", "dns-over-https", "dnssec"],
    tags: ["dns", "names", "udp", "resolver", "cache"],
    sources: [
      {
        label: "RFC 1034: Domain Names - Concepts and Facilities",
        url: "https://www.rfc-editor.org/rfc/rfc1034",
      },
      {
        label: "RFC 1035: Domain Names - Implementation and Specification",
        url: "https://www.rfc-editor.org/rfc/rfc1035",
      },
      {
        label: "RFC 6891: Extension Mechanisms for DNS (EDNS(0))",
        url: "https://www.rfc-editor.org/rfc/rfc6891",
      },
      {
        label: "IANA Root Servers",
        url: "https://www.iana.org/domains/root/servers",
      },
    ],
    status: "reviewed",
    lastVerified: "2026-11-25",
  },
  intro: {
    simple:
      "[[dns|DNS]] translates website names like `www.example.com` into numerical [[ip-address|IP addresses]]. A tree of name servers splits up the directory, and caches save recent answers nearby.",
    technical:
      "The Domain Name System (RFC 1034, RFC 1035) resolves domain names over [[udp|UDP]] [[port|port]] 53 (or [[tcp|TCP]] 53 when responses exceed limits or for zone transfers). A [[resolver]] walks referrals from root to [[tld|TLD]] to [[authoritative-server|authoritative servers]] and caches records for their [[ttl|TTL]].",
  },
  facts: [
    { label: "Layer", value: "Application (OSI Layer 7)" },
    { label: "Port", value: "53 (UDP; TCP for large replies)" },
    { label: "Hierarchy", value: "Root -> TLD -> Authoritative" },
    { label: "Caching", value: "Stored until record TTL expires" },
    { label: "Defined in", value: "RFC 1034, RFC 1035, RFC 6891" },
  ],
  scene: {
    actors: [
      {
        id: "laptop",
        kind: "laptop",
        label: "Your laptop",
        sublabel: LAPTOP_IP,
        at: { x: 100, y: 300 },
      },
      {
        id: "router",
        kind: "router",
        label: "Home router",
        sublabel: ROUTER_LAN_IP,
        at: { x: 265, y: 300 },
      },
      {
        id: "internet",
        kind: "cloud",
        label: "Internet",
        at: { x: 430, y: 300 },
      },
      {
        id: "resolver",
        kind: "dns-server",
        label: "DNS resolver",
        sublabel: RESOLVER_IP,
        at: { x: 605, y: 300 },
      },
      {
        id: "root",
        kind: "dns-server",
        label: "Root server",
        sublabel: ROOT_SERVER_IP,
        at: { x: 840, y: 120 },
      },
      {
        id: "tld",
        kind: "dns-server",
        label: ".com TLD server",
        sublabel: TLD_SERVER_IP,
        at: { x: 840, y: 300 },
      },
      {
        id: "auth",
        kind: "dns-server",
        label: "Authoritative DNS",
        sublabel: AUTH_SERVER_IP,
        at: { x: 840, y: 480 },
      },
    ],
    links: [
      { id: "laptop-router", from: "laptop", to: "router", medium: "wifi" },
      { id: "router-internet", from: "router", to: "internet", medium: "fiber" },
      {
        id: "internet-resolver",
        from: "internet",
        to: "resolver",
        medium: "internet",
      },
      { id: "resolver-root", from: "resolver", to: "root", medium: "internet" },
      { id: "resolver-tld", from: "resolver", to: "tld", medium: "internet" },
      { id: "resolver-auth", from: "resolver", to: "auth", medium: "internet" },
    ],
    start: {
      visible: ["laptop"],
      focus: ["laptop"],
    },
  },
  steps: [
    {
      id: "ask-resolver",
      title: "Ask the resolver",
      simple:
        "Your laptop does not know the address for `www.example.com` yet. It sends one [[dns|DNS]] question {{dns-ask}} to the [[resolver]] and asks it to find the answer.",
      technical:
        "Finding no local match, the stub resolver sends a standard query {{dns-ask}} over [[udp|UDP]] [[port|port]] 53 to `8.8.8.8` with RD=1 (Recursion Desired), asking for an [[a-record]] for `www.example.com` (RFC 1035).",
      facts: [
        { label: "Question", value: "www.example.com, type A" },
        { label: "Resolver", value: "8.8.8.8 (recursive)" },
        { label: "Flag", value: "RD=1 (Recursion Desired)" },
      ],
      events: [
        {
          type: "screen",
          at: "laptop",
          screen: { app: "browser", url: WEB_DOMAIN, state: "typing" },
        },
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["router", "internet", "resolver"] },
            {
              type: "focus",
              actors: ["laptop", "router", "internet", "resolver"],
            },
          ],
        },
        dnsQuery({
          id: "dns-ask",
          from: "laptop",
          to: "resolver",
          srcIp: LAPTOP_IP,
          dstIp: RESOLVER_IP,
          srcPort: DNS_CLIENT_PORT,
          txId: 0x9a3e,
          qname: WEB_DOMAIN,
          rd: true,
          time: 0.0,
          label: "DNS query",
        }),
      ],
    },
    {
      id: "query-root",
      title: "Query a root server",
      simple:
        "The [[resolver]] has nothing cached, so it starts at a [[root-server]] {{dns-root-q}}. That server points it toward the `.com` servers {{dns-root-ref}}.",
      technical:
        "With an empty [[cache]], the resolver queries `a.root-servers.net` (`198.41.0.4`) with RD=0 and an [[edns|EDNS0]] OPT record {{dns-root-q}}. The root returns an [[ns-record]] referral and [[glue-record|glue]] address for `.com` {{dns-root-ref}}.",
      facts: [
        { label: "Root server", value: ROOT_SERVER_NAME },
        { label: "Root names", value: "13 named authorities (a to m)" },
        { label: "Reply", value: "Referral to .com TLD servers" },
      ],
      events: [
        {
          type: "note",
          id: "note-cache-miss",
          at: "resolver",
          text: "Cache miss",
          tone: "request",
        },
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["root"] },
            { type: "focus", actors: ["resolver", "root"] },
          ],
        },
        dnsQuery({
          id: "dns-root-q",
          from: "resolver",
          to: "root",
          srcIp: RESOLVER_IP,
          dstIp: ROOT_SERVER_IP,
          srcPort: 38143,
          txId: 0x51c7,
          qname: WEB_DOMAIN,
          rd: false,
          ednsSize: 1232,
          time: 0.012,
          label: "DNS query",
        }),
        dnsResponse({
          id: "dns-root-ref",
          from: "root",
          to: "resolver",
          srcIp: ROOT_SERVER_IP,
          dstIp: RESOLVER_IP,
          dstPort: 38143,
          txId: 0x51c7,
          qname: WEB_DOMAIN,
          ednsSize: 1232,
          authorities: [
            {
              name: "com",
              type: "NS",
              ttl: 172800,
              value: TLD_SERVER_NAME,
              compressedName: false,
            },
          ],
          additionals: [
            {
              name: TLD_SERVER_NAME,
              type: "A",
              ttl: 172800,
              value: TLD_SERVER_IP,
            },
          ],
          time: 0.017,
          label: "Referral (.com)",
          tone: "request",
          info: "Referral: com. NS (with glue)",
        }),
      ],
    },
    {
      id: "ask-tld",
      title: "Ask the .com server",
      simple:
        "Next, the resolver asks the `.com` [[tld|TLD]] server {{dns-tld-q}}. That server replies with the address of `example.com`'s own name servers {{dns-tld-ref}}.",
      technical:
        "The resolver sends an iterative query to `a.gtld-servers.net` (`192.5.6.30`) {{dns-tld-q}}. The TLD server replies with two [[ns-record|NS records]] for `example.com` and their IPv4 [[glue-record|glue records]] {{dns-tld-ref}}.",
      facts: [
        { label: "TLD server", value: TLD_SERVER_NAME },
        { label: "Holds", value: "Delegations for .com domains" },
        { label: "Reply", value: "NS x2 + glue IPv4 addresses" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["tld"] },
            { type: "focus", actors: ["resolver", "tld"] },
          ],
        },
        dnsQuery({
          id: "dns-tld-q",
          from: "resolver",
          to: "tld",
          srcIp: RESOLVER_IP,
          dstIp: TLD_SERVER_IP,
          srcPort: 41766,
          txId: 0x2b90,
          qname: WEB_DOMAIN,
          rd: false,
          ednsSize: 1232,
          time: 0.022,
          label: "DNS query",
        }),
        dnsResponse({
          id: "dns-tld-ref",
          from: "tld",
          to: "resolver",
          srcIp: TLD_SERVER_IP,
          dstIp: RESOLVER_IP,
          dstPort: 41766,
          txId: 0x2b90,
          qname: WEB_DOMAIN,
          ednsSize: 1232,
          authorities: [
            {
              name: "example.com",
              type: "NS",
              ttl: 172800,
              value: AUTH_SERVER_NAME,
              compressedValue: true,
            },
            {
              name: "example.com",
              type: "NS",
              ttl: 172800,
              value: AUTH_SERVER_2_NAME,
              compressedValue: true,
            },
          ],
          additionals: [
            {
              name: AUTH_SERVER_NAME,
              type: "A",
              ttl: 172800,
              value: AUTH_SERVER_IP,
            },
            {
              name: AUTH_SERVER_2_NAME,
              type: "A",
              ttl: 172800,
              value: AUTH_SERVER_2_IP,
            },
          ],
          time: 0.032,
          label: "Referral (example.com)",
          tone: "request",
          info: "Referral: example.com. NS x2 (with glue)",
        }),
      ],
    },
    {
      id: "ask-authoritative",
      title: "Ask the domain server",
      simple:
        "Now the resolver reaches the [[authoritative-server]] for `example.com` {{dns-auth-q}}. That server sends back the real [[ip-address]] {{dns-auth-ans}}.",
      technical:
        "The resolver queries `ns1.example.com` (`198.51.100.53`) {{dns-auth-q}}. The authoritative server sets the AA (Authoritative Answer) flag and returns `A 203.0.113.10` with a [[ttl|TTL]] of 3600 seconds {{dns-auth-ans}}.",
      facts: [
        { label: "Server", value: AUTH_SERVER_NAME },
        { label: "Answer", value: `A ${WEB_SERVER_IP}` },
        { label: "Flags and TTL", value: "AA=1, TTL 3600 s" },
      ],
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["auth"] },
            { type: "focus", actors: ["resolver", "auth"] },
          ],
        },
        dnsQuery({
          id: "dns-auth-q",
          from: "resolver",
          to: "auth",
          srcIp: RESOLVER_IP,
          dstIp: AUTH_SERVER_IP,
          srcPort: 50911,
          txId: 0xe604,
          qname: WEB_DOMAIN,
          rd: false,
          ednsSize: 1232,
          time: 0.042,
          label: "DNS query",
        }),
        dnsResponse({
          id: "dns-auth-ans",
          from: "auth",
          to: "resolver",
          srcIp: AUTH_SERVER_IP,
          dstIp: RESOLVER_IP,
          dstPort: 50911,
          txId: 0xe604,
          qname: WEB_DOMAIN,
          aa: true,
          ednsSize: 1232,
          answers: [
            {
              name: WEB_DOMAIN,
              type: "A",
              ttl: 3600,
              value: WEB_SERVER_IP,
            },
          ],
          time: 0.062,
          label: "DNS answer",
          tone: "response",
          info: `Response A ${WEB_SERVER_IP} (authoritative)`,
        }),
      ],
    },
    {
      id: "deliver-and-cache",
      title: "Return and cache answer",
      simple:
        "The resolver sends `203.0.113.10` back to your laptop {{dns-reply}}. Both your laptop and the resolver save it in their [[cache]] for one hour.",
      technical:
        "The resolver replies to `192.168.1.10` with RD=1, RA=1 (Recursion Available), and `A 203.0.113.10` {{dns-reply}}. Both caches store the record for its 3600 s [[ttl|TTL]] (RFC 1034, RFC 1035).",
      facts: [
        { label: "Answer", value: `A ${WEB_SERVER_IP}` },
        { label: "Flags", value: "RD=1, RA=1" },
        { label: "Cached by", value: "Resolver and laptop (3600 s)" },
      ],
      events: [
        {
          type: "focus",
          actors: ["laptop", "router", "internet", "resolver"],
        },
        dnsResponse({
          id: "dns-reply",
          from: "resolver",
          to: "laptop",
          srcIp: RESOLVER_IP,
          dstIp: LAPTOP_IP,
          dstPort: DNS_CLIENT_PORT,
          txId: 0x9a3e,
          qname: WEB_DOMAIN,
          rd: true,
          ra: true,
          answers: [
            {
              name: WEB_DOMAIN,
              type: "A",
              ttl: 3600,
              value: WEB_SERVER_IP,
            },
          ],
          time: 0.082,
          label: "DNS answer",
          tone: "response",
          info: `Standard query response A ${WEB_SERVER_IP}`,
        }),
        {
          type: "together",
          events: [
            {
              type: "badge",
              at: "resolver",
              text: "Cached 3600 s",
              tone: "response",
            },
            {
              type: "badge",
              at: "laptop",
              text: WEB_SERVER_IP,
              tone: "response",
            },
          ],
        },
      ],
    },
  ],
  outro: {
    title: "Address resolved",
    simple:
      "Starting from an empty cache, your recursive resolver followed referrals from root to `.com` to `example.com`, then returned the IP address. Future lookups reuse the cached record until its TTL expires.",
    technical:
      "Four UDP exchanges on port 53 resolved `www.example.com` to `203.0.113.10`. The recursive resolver and stub cache both store the A record for 3600 seconds per RFC 1035.",
    facts: [
      { label: "Exchanges", value: "4 queries, 4 replies" },
      { label: "Transport", value: "UDP port 53" },
      { label: "Resolved IP", value: WEB_SERVER_IP },
      { label: "Cache TTL", value: "3600 s" },
    ],
  },
  tryIt: [
    {
      title: "Look up a domain name",
      explain:
        "Run a DNS query from your terminal to see the returned A record, the server that answered, and the remaining TTL.",
      commands: [
        { os: "windows", cmd: "nslookup www.example.com" },
        { os: "macos", cmd: "dig www.example.com" },
        { os: "linux", cmd: "dig www.example.com" },
      ],
    },
  ],
});
