import type { StageEvent, Tone } from "@/engine/types";
import { LAPTOP_MAC, ROUTER_MAC } from "@/content/world";
import { IPV4_HEADER, UDP_HEADER, udpFrameBytes } from "./sizes";
import { ethernetLayer, ipv4Layer, udpLayer } from "./layers";

export type DhcpType = "Discover" | "Offer" | "Request" | "ACK";

export interface DhcpOpts {
  id: string;
  kind: DhcpType;
  from: string;
  to: string;
  xid: string;
  clientMac?: string;
  offeredIp?: string;
  serverIp?: string;
  srcIp: string;
  dstIp: string;
  payloadBytes?: number;
  time: number;
  tone?: Tone;
}

export function dhcpMessage(opts: DhcpOpts): StageEvent {
  const isClient = opts.kind === "Discover" || opts.kind === "Request";
  const sport = isClient ? 68 : 67;
  const dport = isClient ? 67 : 68;
  const dhcpBytes = opts.payloadBytes ?? 300;
  const { frameBytes } = udpFrameBytes(dhcpBytes);

  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    tone: opts.tone ?? (isClient ? "lookup" : "response"),
    label: `DHCP ${opts.kind}`,
    layers: [
      ethernetLayer({
        srcMac: isClient ? (opts.clientMac ?? LAPTOP_MAC) : ROUTER_MAC,
        dstMac: opts.dstIp === "255.255.255.255" ? "ff:ff:ff:ff:ff:ff" : LAPTOP_MAC,
      }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "UDP (17)",
        totalLength: IPV4_HEADER + UDP_HEADER + dhcpBytes,
      }),
      udpLayer({ sport, dport, payloadBytes: dhcpBytes }),
      {
        name: "DHCP",
        summary: `DHCP ${opts.kind} (xid ${opts.xid})`,
        fields: [
          { name: "Message Type (Op)", value: isClient ? "Boot Request (1)" : "Boot Reply (2)" },
          { name: "DHCP Option 53", value: opts.kind },
          { name: "Transaction ID", value: opts.xid },
          ...(opts.offeredIp ? [{ name: "Your IP (yiaddr)", value: opts.offeredIp }] : []),
          ...(opts.serverIp ? [{ name: "Server Identifier", value: opts.serverIp }] : []),
          { name: "Client MAC", value: opts.clientMac ?? LAPTOP_MAC },
        ],
      },
    ],
    capture: {
      time: opts.time,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "DHCP",
      info: `DHCP ${opts.kind} - Transaction ID ${opts.xid}`,
      bytes: frameBytes,
    },
  };
}
