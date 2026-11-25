import type { GlossaryTerm } from "./schema";

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: "dns",
    term: "DNS",
    short:
      "Domain Name System. Translates human-readable domain names into IP addresses.",
    long: "The Domain Name System is a distributed, hierarchical database across root, top-level domain, and authoritative name servers.",
    aka: ["Domain Name System"],
  },
  {
    id: "ip-address",
    term: "IP address",
    short:
      "A numerical label assigned to a device on a network so packets can be routed to it.",
    long: "Internet Protocol addresses identify network interfaces and provide location information for routing across networks. IPv4 uses 32-bit addresses and IPv6 uses 128-bit addresses.",
  },
  {
    id: "udp",
    term: "UDP",
    short:
      "User Datagram Protocol. Sends short independent datagrams without a connection setup.",
    long: "A minimal transport protocol that adds port numbers and an optional checksum over IP without handshakes, retransmissions, or ordering guarantees.",
    aka: ["User Datagram Protocol"],
  },
  {
    id: "tcp",
    term: "TCP",
    short:
      "Transmission Control Protocol. Delivers an ordered, reliable stream of bytes between two hosts.",
    long: "A connection-oriented transport protocol that numbers every byte, acknowledges receipt, retransmits lost segments, and adapts its sending rate to network conditions.",
    aka: ["Transmission Control Protocol"],
  },
  {
    id: "resolver",
    term: "Recursive resolver",
    short:
      "A DNS server that tracks down an answer on behalf of a client by querying other servers.",
    long: "Instead of expecting your device to contact root and domain servers directly, a recursive resolver follows referrals step by step and caches the results.",
    aka: ["DNS resolver", "resolver"],
  },
  {
    id: "root-server",
    term: "Root name server",
    short:
      "A top-level DNS server that knows which servers manage each top-level domain such as .com.",
    long: "Thirteen named root authorities (a through m) sit at the top of the DNS tree and return referrals pointing resolvers toward the right TLD servers.",
    aka: ["root server"],
  },
  {
    id: "tld",
    term: "TLD",
    short:
      "Top-level domain. The rightmost label in a domain name, such as .com, .org, or .uk.",
    long: "Top-level domain name servers keep delegation records for every domain registered directly under that suffix and point resolvers to each domain's authoritative servers.",
    aka: ["top-level domain"],
  },
  {
    id: "authoritative-server",
    term: "Authoritative name server",
    short:
      "The DNS server that holds the official records for a specific domain.",
    long: "Unlike a cache or resolver, an authoritative name server stores the original zone data configured by the domain owner and sets the AA flag in its answers.",
    aka: ["authoritative server"],
  },
  {
    id: "a-record",
    term: "A record",
    short: "A DNS record that maps a domain name to a 32-bit IPv4 address.",
    long: "Defined in RFC 1035, an Address (A) resource record stores four octets representing an IPv4 host address.",
  },
  {
    id: "ns-record",
    term: "NS record",
    short:
      "A DNS record naming an authoritative name server responsible for a domain zone.",
    long: "Name Server (NS) records delegate a zone or domain to specific hostnames, often paired with glue A or AAAA records in the Additional section.",
  },
  {
    id: "glue-record",
    term: "Glue record",
    short:
      "An IP address attached in a DNS referral so a resolver can reach a referred name server.",
    long: "When a referral names a server inside the delegated zone itself, the parent server includes the server's A or AAAA record in the Additional section to break circular lookups.",
  },
  {
    id: "ttl",
    term: "TTL",
    short:
      "Time to Live. How long a cached DNS record may be reused, or how many router hops a packet may cross.",
    long: "In DNS, TTL is a 32-bit count of seconds before a cached record expires. In IPv4 headers, TTL limits hop count so packets do not loop forever.",
    aka: ["Time to Live"],
  },
  {
    id: "cache",
    term: "Cache",
    short:
      "Temporary local storage that keeps recent answers ready so repeat requests finish faster.",
    long: "DNS caches in browsers, operating systems, and recursive resolvers store records for up to their advertised TTL to cut latency and server load.",
  },
  {
    id: "anycast",
    term: "Anycast",
    short:
      "Sharing one IP address across many locations so routing sends traffic to the nearest server.",
    long: "Multiple servers announce the same IP prefix via BGP, letting the network deliver each packet to the topologically closest instance.",
  },
  {
    id: "edns",
    term: "EDNS0",
    short:
      "Extension Mechanisms for DNS. Lets clients advertise larger UDP buffer sizes and extra flags.",
    long: "Defined in RFC 6891, EDNS0 adds a pseudo-record (OPT) to the Additional section so DNS messages can exceed the original 512-byte UDP limit.",
  },
  {
    id: "port",
    term: "Port number",
    short:
      "A 16-bit number (0 to 65535) that identifies which application or service receives a message on a host.",
    long: "Transport protocols like TCP and UDP include source and destination port numbers so one IP address can run many conversations at the same time.",
  },
];

export const glossaryMap: Record<string, GlossaryTerm> = Object.fromEntries(
  glossaryTerms.map((t) => [t.id, t]),
);
