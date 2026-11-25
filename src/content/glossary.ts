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
    id: "ip",
    term: "IP",
    short:
      "Internet Protocol. Addresses devices and routes packets across interconnected networks.",
    long: "Defined in RFC 791 (IPv4) and RFC 8200 (IPv6), IP provides connectionless, best-effort packet delivery between hosts across routers.",
    aka: ["Internet Protocol"],
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
    id: "http",
    term: "HTTP",
    short:
      "Hypertext Transfer Protocol. The request-and-response protocol used to fetch web pages and APIs.",
    long: "Clients send methods such as GET or POST with headers, and servers answer with a numeric status code, response headers, and an optional message body.",
    aka: ["Hypertext Transfer Protocol"],
  },
  {
    id: "https",
    term: "HTTPS",
    short:
      "HTTP Secure. HTTP traffic carried inside an encrypted and authenticated TLS connection.",
    long: "Running HTTP over TLS protects requests and responses from eavesdropping or tampering and verifies the server's domain identity using a certificate.",
    aka: ["HTTP Secure"],
  },
  {
    id: "tls",
    term: "TLS",
    short:
      "Transport Layer Security. Encrypts connections and verifies server identity using certificates.",
    long: "TLS negotiates shared keys and authenticates endpoints over a reliable stream such as TCP before application protocols like HTTP or IMAP send data.",
    aka: ["Transport Layer Security", "SSL"],
  },
  {
    id: "dhcp",
    term: "DHCP",
    short:
      "Dynamic Host Configuration Protocol. Automatically assigns IP addresses and network settings.",
    long: "When a device joins a network, DHCP leases an IPv4 address along with the subnet mask, default gateway, and DNS server addresses.",
    aka: ["Dynamic Host Configuration Protocol"],
  },
  {
    id: "icmp",
    term: "ICMP",
    short:
      "Internet Control Message Protocol. Carries network error reports and diagnostic probes like ping.",
    long: "Routers and hosts send ICMP messages inside IP packets to report unreachable destinations, expired TTLs, or echo replies.",
    aka: ["Internet Control Message Protocol"],
  },
  {
    id: "ssh",
    term: "SSH",
    short:
      "Secure Shell. Provides encrypted remote terminal login, command execution, and file transfer.",
    long: "SSH authenticates the server via its host key, authenticates the user via public keys or passwords, and multiplexes encrypted channels over TCP port 22.",
    aka: ["Secure Shell"],
  },
  {
    id: "smtp",
    term: "SMTP",
    short:
      "Simple Mail Transfer Protocol. Sends and relays email messages between apps and mail servers.",
    long: "Mail clients submit outgoing email over SMTP (ports 465 or 587), and mail servers relay messages between domains on port 25.",
    aka: ["Simple Mail Transfer Protocol"],
  },
  {
    id: "imap",
    term: "IMAP",
    short:
      "Internet Message Access Protocol. Keeps email folders and read flags synchronized on the server.",
    long: "Multiple devices can access the same mailbox over IMAP while messages, folders, and status flags remain stored on the mail server.",
    aka: ["Internet Message Access Protocol"],
  },
  {
    id: "pop3",
    term: "POP3",
    short:
      "Post Office Protocol version 3. Downloads email from a server mailbox to one client device.",
    long: "POP3 retrieves messages in order and typically deletes them from the server when the session ends with QUIT.",
    aka: ["Post Office Protocol"],
  },
  {
    id: "ftp",
    term: "FTP",
    short:
      "File Transfer Protocol. Transfers files using separate TCP connections for commands and data.",
    long: "A legacy protocol using TCP port 21 for plain-text control commands and a second TCP connection for each file or directory listing.",
    aka: ["File Transfer Protocol"],
  },
  {
    id: "arp",
    term: "ARP",
    short:
      "Address Resolution Protocol. Maps an IPv4 address to a hardware MAC address on a local network.",
    long: "A host broadcasts an ARP request asking who owns a local IPv4 address, and the owner replies with its link-layer MAC address.",
    aka: ["Address Resolution Protocol"],
  },
  {
    id: "nat",
    term: "NAT",
    short:
      "Network Address Translation. Rewrites private local addresses and ports to a shared public IP.",
    long: "Home and office routers track active connections in a translation table so many private LAN devices can share one public IPv4 address.",
    aka: ["Network Address Translation"],
  },
  {
    id: "mac-address",
    term: "MAC address",
    short:
      "A hardware identifier assigned to a network interface for delivery inside a local network.",
    long: "Medium Access Control addresses are 48-bit identifiers used by Ethernet and Wi-Fi frames to reach the next device on the same LAN segment.",
  },
  {
    id: "subnet",
    term: "Subnet",
    short:
      "A contiguous block of IP addresses that share the same network prefix and reach each other directly.",
    long: "A subnet mask or prefix length like /24 separates the network portion of an IP address from the host portion.",
  },
  {
    id: "default-gateway",
    term: "Default gateway",
    short:
      "The local router where a device sends packets whose destination is outside its own subnet.",
    long: "When a destination IP falls outside the local network mask, the host wraps the packet in a frame addressed to the gateway's MAC address.",
  },
  {
    id: "broadcast",
    term: "Broadcast",
    short:
      "A packet or frame addressed so every device on the local network segment receives it.",
    long: "Devices without an IP address yet, or hosts looking up a neighbor via ARP, send to broadcast addresses such as ff:ff:ff:ff:ff:ff or 255.255.255.255.",
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
    id: "mx-record",
    term: "MX record",
    short:
      "Mail Exchanger record. Names the mail server responsible for accepting email for a domain.",
    long: "An MX record pairs a priority number with a target hostname so sending mail servers know which host handles incoming mail for a domain.",
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
  {
    id: "syn",
    term: "SYN",
    short:
      "Synchronize flag. Starts a TCP connection and shares the sender's initial sequence number.",
    long: "The first packet of a TCP three-way handshake carries the SYN flag; the server responds with SYN and ACK together.",
  },
  {
    id: "ack",
    term: "ACK",
    short:
      "Acknowledgment flag and number. Confirms which bytes have arrived in order so far.",
    long: "In TCP, the acknowledgment number tells the sender the next sequence number expected, confirming all earlier bytes.",
  },
  {
    id: "fin",
    term: "FIN",
    short:
      "Finish flag. Signals that one side has no more data to send and is closing its half of a TCP stream.",
    long: "Each endpoint sends its own FIN and receives an ACK before entering TIME-WAIT or CLOSED.",
  },
  {
    id: "mss",
    term: "MSS",
    short:
      "Maximum Segment Size. The largest amount of application payload a single TCP segment can carry.",
    long: "Advertised during the TCP handshake, MSS is typically 1460 bytes on a standard 1500-byte Ethernet link over IPv4.",
    aka: ["Maximum Segment Size"],
  },
  {
    id: "sack",
    term: "SACK",
    short:
      "Selective Acknowledgment. Tells a TCP sender which out-of-order byte ranges have already arrived.",
    long: "Defined in RFC 2018, SACK options let a receiver report gaps so the sender retransmits only the missing segments.",
    aka: ["Selective Acknowledgment"],
  },
  {
    id: "datagram",
    term: "Datagram",
    short:
      "A self-contained packet sent independently without setting up a stateful connection first.",
    long: "UDP carries each message in its own datagram with an 8-byte header, without tracking order or delivery across datagrams.",
  },
  {
    id: "rtp",
    term: "RTP",
    short:
      "Real-time Transport Protocol. Carries live audio and video frames with sequence numbers and timestamps.",
    long: "Usually layered over UDP, RTP lets receiving apps reorder frames, smooth jitter, and handle occasional packet loss.",
    aka: ["Real-time Transport Protocol"],
  },
  {
    id: "certificate",
    term: "TLS certificate",
    short:
      "A signed digital document tying a domain name to a public key, vouched for by a trusted authority.",
    long: "Browsers verify the certificate chain up to a trusted root certificate authority and check that the server signs the handshake with its matching private key.",
    aka: ["certificate"],
  },
  {
    id: "sni",
    term: "SNI",
    short:
      "Server Name Indication. A TLS extension naming the requested hostname during ClientHello.",
    long: "SNI lets a server hosting many domains on one IP address pick the matching TLS certificate before encryption begins.",
    aka: ["Server Name Indication"],
  },
  {
    id: "alpn",
    term: "ALPN",
    short:
      "Application-Layer Protocol Negotiation. Selects the inner protocol (such as HTTP/1.1 or HTTP/2) during TLS.",
    long: "Defined in RFC 7301, ALPN avoids an extra round trip by negotiating the application protocol inside the TLS handshake.",
    aka: ["Application-Layer Protocol Negotiation"],
  },
  {
    id: "hsts",
    term: "HSTS",
    short:
      "HTTP Strict Transport Security. Tells browsers to connect to a site only over HTTPS.",
    long: "When a server sends the Strict-Transport-Security header over HTTPS, the browser automatically upgrades future requests for that domain.",
    aka: ["HTTP Strict Transport Security"],
  },
  {
    id: "starttls",
    term: "STARTTLS",
    short:
      "A command that upgrades an open plain-text connection to encrypted TLS.",
    long: "Used in SMTP, IMAP, and POP3 when a client starts on a plain-text port and negotiates TLS before sending credentials or mail.",
  },
  {
    id: "host-key",
    term: "Host key",
    short:
      "An SSH server's long-term public key used to prove its identity to returning clients.",
    long: "SSH clients remember each server's host key fingerprint in known_hosts and warn if the key unexpectedly changes.",
  },
  {
    id: "pasv",
    term: "Passive mode (PASV)",
    short:
      "An FTP mode where the server opens a data port and waits for the client to connect.",
    long: "Because the client initiates both the control and data TCP connections, passive mode passes cleanly through client-side NAT and firewalls.",
    aka: ["PASV"],
  },
  {
    id: "quic",
    term: "QUIC",
    short:
      "A multiplexed, encrypted transport protocol running over UDP that underpins HTTP/3.",
    long: "Defined in RFC 9000, QUIC combines transport reliability, stream multiplexing without head-of-line blocking, and TLS 1.3 into a single handshake.",
  },
];

export const glossaryMap: Record<string, GlossaryTerm> = Object.fromEntries(
  glossaryTerms.map((t) => [t.id, t]),
);
