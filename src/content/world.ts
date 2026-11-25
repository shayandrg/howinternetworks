/**
 * Shared example world constants used across every topic.
 * Addresses follow RFC 1918 (private), RFC 5737 (IPv4 docs), RFC 3849 (IPv6 docs),
 * RFC 7042 (MAC docs), RFC 5398 (ASN docs), and RFC 2606 (example domains).
 */

// Home LAN (RFC 1918) and router WAN (RFC 5737 TEST-NET-2)
export const HOME_SUBNET = "192.168.1.0/24";
export const LAPTOP_IP = "192.168.1.10";
export const PHONE_IP = "192.168.1.11";
export const DESKTOP_IP = "192.168.1.12";
export const ROUTER_LAN_IP = "192.168.1.1";
export const ROUTER_WAN_IP = "198.51.100.7";

// Documentation MAC addresses (RFC 7042 section 2.1: 00:00:5E:00:53:00 - :FF)
export const LAPTOP_MAC = "00:00:5e:00:53:01";
export const ROUTER_MAC = "00:00:5e:00:53:02";
export const PHONE_MAC = "00:00:5e:00:53:03";
export const SWITCH_MAC = "00:00:5e:00:53:04";
export const AP_MAC = "00:00:5e:00:53:05";
export const SERVER_MAC = "00:00:5e:00:53:06";

// DNS infrastructure
// 8.8.8.8: Google Public DNS recursive resolver (well-known public anycast address, developers.google.com/speed/public-dns)
export const RESOLVER_IP = "8.8.8.8";
// 198.41.0.4: a.root-servers.net (IANA root servers list, iana.org/domains/root/servers)
export const ROOT_SERVER_NAME = "a.root-servers.net";
export const ROOT_SERVER_IP = "198.41.0.4";
// 192.5.6.30: a.gtld-servers.net (IANA .com delegation / Verisign GTLD servers)
export const TLD_SERVER_NAME = "a.gtld-servers.net";
export const TLD_SERVER_IP = "192.5.6.30";
// Authoritative DNS for example.com (RFC 5737 TEST-NET-2)
export const AUTH_SERVER_NAME = "ns1.example.com";
export const AUTH_SERVER_IP = "198.51.100.53";
export const AUTH_SERVER_2_NAME = "ns2.example.com";
export const AUTH_SERVER_2_IP = "198.51.100.54";

// Web server for www.example.com (RFC 5737 TEST-NET-3)
export const EXAMPLE_DOMAIN = "example.com";
export const WEB_DOMAIN = "www.example.com";
export const WEB_SERVER_IP = "203.0.113.10";

// Mail providers (RFC 5737 TEST-NET-2 and TEST-NET-3)
export const ALICE_MAIL_IP = "198.51.100.25";
export const BOB_MAIL_IP = "203.0.113.25";
export const ALICE_EMAIL = "alice@example.com";
export const BOB_EMAIL = "bob@example.net";

// Autonomous system numbers (RFC 5398 documentation range 64496..64511)
export const ISP_ASN = 64500;
export const TRANSIT_ASN = 64510;
export const HOSTING_ASN = 64511;

// IPv6 addresses (RFC 3849 documentation prefix 2001:db8::/32 and link-local fe80::/10)
export const LAPTOP_IPV6 = "2001:db8:1::10";
export const LAPTOP_IPV6_LL = "fe80::10";
export const ROUTER_IPV6_LAN = "2001:db8:1::1";
export const ROUTER_IPV6_LL = "fe80::1";
export const RESOLVER_IPV6 = "2001:db8:8::8";
export const WEB_SERVER_IPV6 = "2001:db8:2::10";

// People
export const PERSON_YOU = "you";
export const PERSON_ALICE = "Alice";
export const PERSON_BOB = "Bob";

// Ephemeral ports
export const EPHEMERAL_PORT_START = 52344;
export const DNS_CLIENT_PORT = 54871;

// Exact public IPs permitted by section 6.4 outside private/documentation blocks
export const WORLD_PUBLIC_IPS: readonly string[] = [
  RESOLVER_IP,
  ROOT_SERVER_IP,
  TLD_SERVER_IP,
];
