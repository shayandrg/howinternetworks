import type { Flow } from "./schema";
import { dnsFlow } from "./flows/dns";
import { tcpFlow } from "./flows/tcp";
import { httpFlow } from "./flows/http";
import { udpFlow } from "./flows/udp";
import { ipFlow } from "./flows/ip";
import { dhcpFlow } from "./flows/dhcp";
import { icmpFlow } from "./flows/icmp";
import { tlsFlow } from "./flows/tls";
import { httpsFlow } from "./flows/https";
import { sshFlow } from "./flows/ssh";
import { smtpFlow } from "./flows/smtp";
import { imapFlow } from "./flows/imap";
import { pop3Flow } from "./flows/pop3";
import { ftpFlow } from "./flows/ftp";
import { ethernetFlow } from "./flows/ethernet";
import { wifiFlow } from "./flows/wifi";
import { wpa3Flow } from "./flows/wpa3";
import { ipv6Flow } from "./flows/ipv6";
import { quicFlow } from "./flows/quic";
import { dnsOverHttpsFlow } from "./flows/dns-over-https";
import { dnssecFlow } from "./flows/dnssec";
import { ntpFlow } from "./flows/ntp";
import { websocketFlow } from "./flows/websocket";
import { httpProxyFlow } from "./flows/http-proxy";
import { reverseProxyFlow } from "./flows/reverse-proxy";
import { captivePortalFlow } from "./flows/captive-portal";
import { socks5Flow } from "./flows/socks5";
import { wireguardFlow } from "./flows/wireguard";
import { ipsecFlow } from "./flows/ipsec";
import { bgpFlow } from "./flows/bgp";
import { radiusFlow } from "./flows/radius";
import { pppoeFlow } from "./flows/pppoe";
import { smbFlow } from "./flows/smb";
import { webrtcFlow } from "./flows/webrtc";
import { sipFlow } from "./flows/sip";
import { rtspFlow } from "./flows/rtsp";
import { rtmpFlow } from "./flows/rtmp";
import { igmpFlow } from "./flows/igmp";

export const topics: Flow[] = [
  dnsFlow,
  tcpFlow,
  httpFlow,
  udpFlow,
  ipFlow,
  dhcpFlow,
  icmpFlow,
  tlsFlow,
  httpsFlow,
  sshFlow,
  smtpFlow,
  imapFlow,
  pop3Flow,
  ftpFlow,
  ethernetFlow,
  wifiFlow,
  wpa3Flow,
  ipv6Flow,
  quicFlow,
  dnsOverHttpsFlow,
  dnssecFlow,
  ntpFlow,
  websocketFlow,
  httpProxyFlow,
  reverseProxyFlow,
  captivePortalFlow,
  socks5Flow,
  wireguardFlow,
  ipsecFlow,
  bgpFlow,
  radiusFlow,
  pppoeFlow,
  smbFlow,
  webrtcFlow,
  sipFlow,
  rtspFlow,
  rtmpFlow,
  igmpFlow,
];

export function getTopic(slug: string): Flow | undefined {
  return topics.find((t) => t.meta.slug === slug);
}
