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
];

export function getTopic(slug: string): Flow | undefined {
  return topics.find((t) => t.meta.slug === slug);
}
