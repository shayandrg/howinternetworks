import type { Layer } from "@/engine/types";
import { LAPTOP_MAC, ROUTER_MAC } from "@/content/world";
import {
  IPV4_HEADER,
  IPV6_HEADER,
  TCP_BASE_HEADER,
  UDP_HEADER,
} from "./sizes";

export interface EthLayerOpts {
  srcMac?: string;
  dstMac?: string;
  etherType?: string;
}

export function ethernetLayer(opts: EthLayerOpts = {}): Layer {
  const srcMac = opts.srcMac ?? LAPTOP_MAC;
  const dstMac = opts.dstMac ?? ROUTER_MAC;
  const etherType = opts.etherType ?? "0x0800 (IPv4)";
  return {
    name: "Ethernet II",
    summary: `${srcMac} -> ${dstMac}`,
    fields: [
      { name: "Destination MAC", value: dstMac },
      { name: "Source MAC", value: srcMac },
      { name: "EtherType", value: etherType },
    ],
  };
}

export interface Ipv4LayerOpts {
  src: string;
  dst: string;
  protocol: "UDP (17)" | "TCP (6)" | "ICMP (1)" | "IGMP (2)" | "ESP (50)";
  totalLength: number;
  ttl?: number;
  flags?: string;
}

export function ipv4Layer(opts: Ipv4LayerOpts): Layer {
  return {
    name: "IPv4",
    summary: `${opts.src} -> ${opts.dst}`,
    fields: [
      { name: "Version / IHL", value: `4 / 5 (${IPV4_HEADER} bytes)` },
      { name: "Total Length", value: `${opts.totalLength} bytes` },
      { name: "TTL", value: String(opts.ttl ?? 64) },
      { name: "Protocol", value: opts.protocol },
      { name: "Flags", value: opts.flags ?? "DF (Don't Fragment)" },
      { name: "Source IP", value: opts.src },
      { name: "Destination IP", value: opts.dst },
    ],
  };
}

export interface Ipv6LayerOpts {
  src: string;
  dst: string;
  nextHeader: string;
  payloadLength: number;
  hopLimit?: number;
}

export function ipv6Layer(opts: Ipv6LayerOpts): Layer {
  return {
    name: "IPv6",
    summary: `${opts.src} -> ${opts.dst}`,
    fields: [
      { name: "Version", value: `6 (${IPV6_HEADER}-byte fixed header)` },
      { name: "Payload Length", value: `${opts.payloadLength} bytes` },
      { name: "Next Header", value: opts.nextHeader },
      { name: "Hop Limit", value: String(opts.hopLimit ?? 64) },
      { name: "Source IP", value: opts.src },
      { name: "Destination IP", value: opts.dst },
    ],
  };
}

export interface UdpLayerOpts {
  sport: number;
  dport: number;
  payloadBytes?: number;
  length?: number;
}

export function udpLayer(opts: UdpLayerOpts): Layer {
  const length = opts.length ?? UDP_HEADER + (opts.payloadBytes ?? 0);
  return {
    name: "UDP",
    summary: `${opts.sport} -> ${opts.dport} (${length} B)`,
    fields: [
      { name: "Source Port", value: String(opts.sport) },
      { name: "Destination Port", value: String(opts.dport) },
      { name: "Length", value: `${length} bytes` },
      { name: "Checksum", value: "Present" },
    ],
  };
}

export interface TcpLayerOpts {
  sport: number;
  dport: number;
  flags: string;
  seq: number;
  ack?: number;
  window?: number;
  optionsBytes?: number;
  optionsNote?: string;
  payloadBytes?: number;
}

export function tcpLayer(opts: TcpLayerOpts): Layer {
  const optBytes = opts.optionsBytes ?? 0;
  const headerBytes = TCP_BASE_HEADER + optBytes;
  const fields = [
    { name: "Source Port", value: String(opts.sport) },
    { name: "Destination Port", value: String(opts.dport) },
    { name: "Sequence Number", value: String(opts.seq) },
    { name: "Acknowledgment", value: String(opts.ack ?? 0) },
    { name: "Header Length", value: `${headerBytes} bytes` },
    { name: "Flags", value: opts.flags },
    { name: "Window Size", value: String(opts.window ?? 65535) },
  ];
  if (optBytes > 0 && opts.optionsNote) {
    fields.push({ name: "Options", value: opts.optionsNote });
  }
  const payload = opts.payloadBytes ?? 0;
  return {
    name: "TCP",
    summary: `${opts.sport} -> ${opts.dport} [${opts.flags}] (${payload} B data)`,
    fields,
  };
}
