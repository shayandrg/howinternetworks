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
];

export function getTopic(slug: string): Flow | undefined {
  return topics.find((t) => t.meta.slug === slug);
}
