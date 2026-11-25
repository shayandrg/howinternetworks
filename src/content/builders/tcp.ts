import type { StageEvent, Tone } from "@/engine/types";
import { EPHEMERAL_PORT_START, LAPTOP_MAC, ROUTER_MAC } from "@/content/world";
import { IPV4_HEADER, TCP_BASE_HEADER, tcpFrameBytes } from "./sizes";
import { ethernetLayer, ipv4Layer, tcpLayer } from "./layers";

export interface TcpConnOpts {
  from: string;
  to: string;
  srcIp: string;
  dstIp: string;
  sport?: number;
  dport: number;
  clientIsn?: number;
  serverIsn?: number;
  startTime: number;
  rtt?: number;
  prefix?: string;
}

export function tcpHandshake(opts: TcpConnOpts): StageEvent[] {
  const sport = opts.sport ?? EPHEMERAL_PORT_START;
  const cIsn = opts.clientIsn ?? 1000;
  const sIsn = opts.serverIsn ?? 5000;
  const rtt = opts.rtt ?? 0.02;
  const p = opts.prefix ?? "tcp";

  const synSizes = tcpFrameBytes(12, 0);
  const synAckSizes = tcpFrameBytes(12, 0);
  const ackSizes = tcpFrameBytes(0, 0);

  const syn: StageEvent = {
    type: "packet",
    id: `${p}-syn`,
    from: opts.from,
    to: opts.to,
    tone: "handshake",
    label: "TCP SYN",
    fast: true,
    layers: [
      ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER + 12,
      }),
      tcpLayer({
        sport,
        dport: opts.dport,
        flags: "SYN",
        seq: cIsn,
        ack: 0,
        optionsBytes: 12,
        optionsNote: "MSS=1460, NOP, WS=7, NOP, NOP, SACK Permitted",
      }),
    ],
    capture: {
      time: opts.startTime,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "TCP",
      info: `${sport} -> ${opts.dport} [SYN] Seq=0 Win=65535 MSS=1460`,
      bytes: synSizes.frameBytes,
    },
  };

  const synAck: StageEvent = {
    type: "packet",
    id: `${p}-syn-ack`,
    from: opts.to,
    to: opts.from,
    tone: "handshake",
    label: "SYN-ACK",
    fast: true,
    layers: [
      ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
      ipv4Layer({
        src: opts.dstIp,
        dst: opts.srcIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER + 12,
      }),
      tcpLayer({
        sport: opts.dport,
        dport: sport,
        flags: "SYN, ACK",
        seq: sIsn,
        ack: cIsn + 1,
        optionsBytes: 12,
        optionsNote: "MSS=1460, NOP, WS=7, NOP, NOP, SACK Permitted",
      }),
    ],
    capture: {
      time: Number((opts.startTime + rtt / 2).toFixed(3)),
      src: opts.dstIp,
      dst: opts.srcIp,
      protocol: "TCP",
      info: `${opts.dport} -> ${sport} [SYN, ACK] Seq=0 Ack=1 MSS=1460`,
      bytes: synAckSizes.frameBytes,
    },
  };

  const ack: StageEvent = {
    type: "packet",
    id: `${p}-ack`,
    from: opts.from,
    to: opts.to,
    tone: "handshake",
    label: "TCP ACK",
    fast: true,
    layers: [
      ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER,
      }),
      tcpLayer({
        sport,
        dport: opts.dport,
        flags: "ACK",
        seq: cIsn + 1,
        ack: sIsn + 1,
      }),
    ],
    capture: {
      time: Number((opts.startTime + rtt).toFixed(3)),
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "TCP",
      info: `${sport} -> ${opts.dport} [ACK] Seq=1 Ack=1`,
      bytes: ackSizes.frameBytes,
    },
  };

  return [syn, synAck, ack];
}

export interface TcpAckOpts {
  id: string;
  from: string;
  to: string;
  srcIp: string;
  dstIp: string;
  sport: number;
  dport: number;
  seq: number;
  ack: number;
  time: number;
  tone?: Tone;
  label?: string;
}

export function tcpAck(opts: TcpAckOpts): StageEvent {
  const sizes = tcpFrameBytes(0, 0);
  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    tone: opts.tone ?? "control",
    label: opts.label ?? "TCP ACK",
    fast: true,
    layers: [
      ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER,
      }),
      tcpLayer({
        sport: opts.sport,
        dport: opts.dport,
        flags: "ACK",
        seq: opts.seq,
        ack: opts.ack,
      }),
    ],
    capture: {
      time: opts.time,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "TCP",
      info: `${opts.sport} -> ${opts.dport} [ACK] Seq=${opts.seq} Ack=${opts.ack}`,
      bytes: sizes.frameBytes,
    },
  };
}

export interface TcpCloseOpts {
  from: string;
  to: string;
  srcIp: string;
  dstIp: string;
  sport: number;
  dport: number;
  clientSeq: number;
  serverSeq: number;
  startTime: number;
  rtt?: number;
  prefix?: string;
}

export function tcpClose(opts: TcpCloseOpts): StageEvent[] {
  const rtt = opts.rtt ?? 0.02;
  const p = opts.prefix ?? "close";
  const bare = tcpFrameBytes(0, 0).frameBytes;

  const makeFinAck = (
    id: string,
    from: string,
    to: string,
    srcIp: string,
    dstIp: string,
    sport: number,
    dport: number,
    flags: string,
    seq: number,
    ack: number,
    time: number,
    label: string,
  ): StageEvent => ({
    type: "packet",
    id,
    from,
    to,
    tone: "handshake",
    label,
    fast: true,
    layers: [
      ethernetLayer(),
      ipv4Layer({
        src: srcIp,
        dst: dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER,
      }),
      tcpLayer({ sport, dport, flags, seq, ack }),
    ],
    capture: {
      time: Number(time.toFixed(3)),
      src: srcIp,
      dst: dstIp,
      protocol: "TCP",
      info: `${sport} -> ${dport} [${flags}] Seq=${seq} Ack=${ack}`,
      bytes: bare,
    },
  });

  return [
    makeFinAck(
      `${p}-fin-1`,
      opts.from,
      opts.to,
      opts.srcIp,
      opts.dstIp,
      opts.sport,
      opts.dport,
      "FIN, ACK",
      opts.clientSeq,
      opts.serverSeq,
      opts.startTime,
      "FIN-ACK",
    ),
    makeFinAck(
      `${p}-ack-1`,
      opts.to,
      opts.from,
      opts.dstIp,
      opts.srcIp,
      opts.dport,
      opts.sport,
      "ACK",
      opts.serverSeq,
      opts.clientSeq + 1,
      opts.startTime + rtt * 0.5,
      "TCP ACK",
    ),
    makeFinAck(
      `${p}-fin-2`,
      opts.to,
      opts.from,
      opts.dstIp,
      opts.srcIp,
      opts.dport,
      opts.sport,
      "FIN, ACK",
      opts.serverSeq,
      opts.clientSeq + 1,
      opts.startTime + rtt * 0.6,
      "FIN-ACK",
    ),
    makeFinAck(
      `${p}-ack-2`,
      opts.from,
      opts.to,
      opts.srcIp,
      opts.dstIp,
      opts.sport,
      opts.dport,
      "ACK",
      opts.clientSeq + 1,
      opts.serverSeq + 1,
      opts.startTime + rtt * 1.1,
      "TCP ACK",
    ),
  ];
}
