import type { Field, Layer, StageEvent, Tone } from "@/engine/types";
import { DNS_CLIENT_PORT, LAPTOP_MAC, ROUTER_MAC } from "@/content/world";
import {
  DNS_HEADER,
  DNS_OPT_RR_BYTES,
  dnsNameWireLength,
  IPV4_HEADER,
  UDP_HEADER,
  udpFrameBytes,
  utf8ByteLength,
} from "./sizes";
import { ethernetLayer, ipv4Layer, udpLayer } from "./layers";

export type DnsRType = "A" | "AAAA" | "NS" | "MX" | "TXT" | "CNAME";

export interface DnsRecordSpec {
  name: string;
  type: DnsRType;
  ttl: number;
  value: string;
  compressedName?: boolean;
  compressedValue?: boolean;
}

export interface DnsQueryOpts {
  id: string;
  from: string;
  to: string;
  via?: string[];
  srcIp: string;
  dstIp: string;
  srcPort?: number;
  txId: number;
  qname: string;
  qtype?: DnsRType;
  rd?: boolean;
  ednsSize?: number;
  time: number;
  label?: string;
  tone?: Tone;
  srcMac?: string;
  dstMac?: string;
}

export interface DnsResponseOpts {
  id: string;
  from: string;
  to: string;
  via?: string[];
  srcIp: string;
  dstIp: string;
  dstPort?: number;
  txId: number;
  qname: string;
  qtype?: DnsRType;
  rd?: boolean;
  ra?: boolean;
  aa?: boolean;
  ednsSize?: number;
  answers?: DnsRecordSpec[];
  authorities?: DnsRecordSpec[];
  additionals?: DnsRecordSpec[];
  overrideDnsPayloadBytes?: number;
  time: number;
  label?: string;
  tone?: Tone;
  info?: string;
  srcMac?: string;
  dstMac?: string;
}

function rdataWireLength(record: DnsRecordSpec): number {
  if (record.type === "A") return 4;
  if (record.type === "AAAA") return 16;
  if (record.type === "NS" || record.type === "CNAME") {
    return record.compressedValue
      ? dnsNameWireLength(record.value.split(".")[0] ?? "") + 1 // label + 2-byte pointer minus root 1 byte
      : dnsNameWireLength(record.value);
  }
  return utf8ByteLength(record.value) + 2;
}

function rrWireLength(record: DnsRecordSpec): number {
  const nameLen =
    record.compressedName !== false ? 2 : dnsNameWireLength(record.name);
  // NAME + TYPE (2) + CLASS (2) + TTL (4) + RDLENGTH (2) + RDATA
  return nameLen + 10 + rdataWireLength(record);
}

export function computeDnsQueryBytes(
  qname: string,
  edns = false,
): { dnsBytes: number; frameBytes: number } {
  const questionBytes = dnsNameWireLength(qname) + 4; // QTYPE (2) + QCLASS (2)
  const optBytes = edns ? DNS_OPT_RR_BYTES : 0;
  const dnsBytes = DNS_HEADER + questionBytes + optBytes;
  const { frameBytes } = udpFrameBytes(dnsBytes);
  return { dnsBytes, frameBytes };
}

export function computeDnsResponseBytes(opts: {
  qname: string;
  answers?: DnsRecordSpec[];
  authorities?: DnsRecordSpec[];
  additionals?: DnsRecordSpec[];
  edns?: boolean;
}): { dnsBytes: number; frameBytes: number } {
  const questionBytes = dnsNameWireLength(opts.qname) + 4;
  const sumRRs = (list?: DnsRecordSpec[]) =>
    (list ?? []).reduce((sum, rr) => sum + rrWireLength(rr), 0);
  const optBytes = opts.edns ? DNS_OPT_RR_BYTES : 0;
  const dnsBytes =
    DNS_HEADER +
    questionBytes +
    sumRRs(opts.answers) +
    sumRRs(opts.authorities) +
    sumRRs(opts.additionals) +
    optBytes;
  const { frameBytes } = udpFrameBytes(dnsBytes);
  return { dnsBytes, frameBytes };
}

export function dnsQuery(opts: DnsQueryOpts): StageEvent {
  const qtype = opts.qtype ?? "A";
  const srcPort = opts.srcPort ?? DNS_CLIENT_PORT;
  const hasEdns = opts.ednsSize !== undefined;
  const { dnsBytes, frameBytes } = computeDnsQueryBytes(opts.qname, hasEdns);

  const flagsList = ["QR=0 (Query)", opts.rd ? "RD=1" : "RD=0"];
  const dnsFields: Field[] = [
    { name: "Transaction ID", value: `0x${opts.txId.toString(16).padStart(4, "0")}` },
    { name: "Flags", value: flagsList.join(", ") },
    { name: "Question", value: `${opts.qname} IN ${qtype}` },
  ];
  if (hasEdns) {
    dnsFields.push({
      name: "Additional (EDNS0 OPT)",
      value: `UDP payload size ${opts.ednsSize} bytes`,
    });
  }

  const layers: Layer[] = [
    ethernetLayer({
      srcMac: opts.srcMac ?? LAPTOP_MAC,
      dstMac: opts.dstMac ?? ROUTER_MAC,
    }),
    ipv4Layer({
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "UDP (17)",
      totalLength: IPV4_HEADER + UDP_HEADER + dnsBytes,
    }),
    udpLayer({ sport: srcPort, dport: 53, payloadBytes: dnsBytes }),
    {
      name: "DNS",
      summary: `Query ${qtype} ${opts.qname}`,
      fields: dnsFields,
    },
  ];

  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    ...(opts.via ? { via: opts.via } : {}),
    tone: opts.tone ?? "lookup",
    label: opts.label ?? "DNS query",
    layers,
    capture: {
      time: opts.time,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "DNS",
      info: `Standard query ${qtype} ${opts.qname}`,
      bytes: frameBytes,
    },
  };
}

export function dnsResponse(opts: DnsResponseOpts): StageEvent {
  const qtype = opts.qtype ?? "A";
  const dstPort = opts.dstPort ?? DNS_CLIENT_PORT;
  const hasEdns = opts.ednsSize !== undefined;
  const computed = computeDnsResponseBytes({
    qname: opts.qname,
    answers: opts.answers,
    authorities: opts.authorities,
    additionals: opts.additionals,
    edns: hasEdns,
  });

  const dnsBytes = opts.overrideDnsPayloadBytes ?? computed.dnsBytes;
  const frameBytes = opts.overrideDnsPayloadBytes
    ? udpFrameBytes(opts.overrideDnsPayloadBytes).frameBytes
    : computed.frameBytes;

  const flagParts = ["QR=1 (Response)"];
  if (opts.aa) flagParts.push("AA=1");
  if (opts.rd) flagParts.push("RD=1");
  if (opts.ra) flagParts.push("RA=1");

  const dnsFields: Field[] = [
    { name: "Transaction ID", value: `0x${opts.txId.toString(16).padStart(4, "0")}` },
    { name: "Flags", value: flagParts.join(", ") },
    { name: "Question", value: `${opts.qname} IN ${qtype}` },
  ];

  if (opts.answers?.length) {
    dnsFields.push({
      name: "Answer",
      value: opts.answers
        .map((a) => `${a.name} ${a.type} ${a.value} (TTL ${a.ttl} s)`)
        .join("; "),
    });
  }
  if (opts.authorities?.length) {
    dnsFields.push({
      name: "Authority",
      value:
        opts.authorities.length <= 2
          ? opts.authorities.map((a) => `${a.name} NS ${a.value}`).join("; ")
          : `${opts.authorities[0]!.name} NS (${opts.authorities.length} servers)`,
    });
  }
  if (opts.additionals?.length) {
    dnsFields.push({
      name: "Additional (Glue)",
      value:
        opts.additionals.length <= 2
          ? opts.additionals.map((a) => `${a.name} ${a.type} ${a.value}`).join("; ")
          : `${opts.additionals.length} glue records`,
    });
  }
  if (hasEdns) {
    dnsFields.push({
      name: "EDNS0 OPT",
      value: `UDP payload size ${opts.ednsSize} bytes`,
    });
  }

  const layers: Layer[] = [
    ethernetLayer({
      srcMac: opts.srcMac ?? ROUTER_MAC,
      dstMac: opts.dstMac ?? LAPTOP_MAC,
    }),
    ipv4Layer({
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "UDP (17)",
      totalLength: IPV4_HEADER + UDP_HEADER + dnsBytes,
    }),
    udpLayer({ sport: 53, dport: dstPort, payloadBytes: dnsBytes }),
    {
      name: "DNS",
      summary: opts.info ?? `Response ${opts.qname}`,
      fields: dnsFields,
    },
  ];

  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    ...(opts.via ? { via: opts.via } : {}),
    tone: opts.tone ?? "response",
    label: opts.label ?? "DNS answer",
    layers,
    capture: {
      time: opts.time,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "DNS",
      info: opts.info ?? `Standard query response ${qtype} ${opts.qname}`,
      bytes: frameBytes,
    },
  };
}
