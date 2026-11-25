import type { StageEvent, Tone } from "@/engine/types";
import { EPHEMERAL_PORT_START, LAPTOP_MAC, ROUTER_MAC } from "@/content/world";
import { IPV4_HEADER, TCP_BASE_HEADER, tcpFrameBytes } from "./sizes";
import { ethernetLayer, ipv4Layer, tcpLayer } from "./layers";

export interface HttpReqOpts {
  id: string;
  from: string;
  to: string;
  srcIp: string;
  dstIp: string;
  sport?: number;
  dport?: number;
  method?: string;
  path?: string;
  host: string;
  seq?: number;
  ack?: number;
  time: number;
  encrypted?: boolean;
  tone?: Tone;
  label?: string;
}

export function httpRequest(opts: HttpReqOpts): StageEvent {
  const sport = opts.sport ?? EPHEMERAL_PORT_START;
  const dport = opts.dport ?? (opts.encrypted ? 443 : 80);
  const method = opts.method ?? "GET";
  const path = opts.path ?? "/";
  const rawHttp = `${method} ${path} HTTP/1.1\r\nHost: ${opts.host}\r\nAccept: text/html\r\n\r\n`;
  const payloadBytes = Buffer.byteLength(rawHttp, "utf8");
  const { frameBytes } = tcpFrameBytes(0, payloadBytes);

  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    tone: opts.tone ?? (opts.encrypted ? "secure" : "request"),
    label: opts.label ?? `${method} ${path}`,
    ...(opts.encrypted ? { locked: true } : {}),
    layers: [
      ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER + payloadBytes,
      }),
      tcpLayer({
        sport,
        dport,
        flags: "PSH, ACK",
        seq: opts.seq ?? 1,
        ack: opts.ack ?? 1,
        payloadBytes,
      }),
      {
        name: opts.encrypted ? "HTTP/1.1 (over TLS)" : "HTTP/1.1",
        summary: `${method} ${path}`,
        ...(opts.encrypted ? { encrypted: true } : {}),
        fields: [
          { name: "Request Line", value: `${method} ${path} HTTP/1.1` },
          { name: "Host", value: opts.host },
          { name: "Accept", value: "text/html" },
        ],
      },
    ],
    capture: {
      time: opts.time,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: opts.encrypted ? "TLSv1.3" : "HTTP",
      info: opts.encrypted ? "Application Data" : `${method} ${path} HTTP/1.1`,
      bytes: frameBytes,
    },
  };
}

export interface HttpResOpts {
  id: string;
  from: string;
  to: string;
  srcIp: string;
  dstIp: string;
  sport?: number;
  dport?: number;
  status?: number;
  statusText?: string;
  contentType?: string;
  bodyBytes: number;
  seq?: number;
  ack?: number;
  time: number;
  encrypted?: boolean;
  tone?: Tone;
  label?: string;
}

export function httpResponse(opts: HttpResOpts): StageEvent {
  const sport = opts.sport ?? (opts.encrypted ? 443 : 80);
  const dport = opts.dport ?? EPHEMERAL_PORT_START;
  const status = opts.status ?? 200;
  const statusText = opts.statusText ?? "OK";
  const contentType = opts.contentType ?? "text/html; charset=utf-8";
  const headerStr = `HTTP/1.1 ${status} ${statusText}\r\nContent-Type: ${contentType}\r\nContent-Length: ${opts.bodyBytes}\r\n\r\n`;
  const payloadBytes = Buffer.byteLength(headerStr, "utf8") + opts.bodyBytes;
  const { frameBytes } = tcpFrameBytes(0, payloadBytes);

  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    tone: opts.tone ?? (opts.encrypted ? "secure" : "response"),
    label: opts.label ?? `HTTP ${status}`,
    ...(opts.encrypted ? { locked: true } : {}),
    layers: [
      ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER + payloadBytes,
      }),
      tcpLayer({
        sport,
        dport,
        flags: "PSH, ACK",
        seq: opts.seq ?? 1,
        ack: opts.ack ?? 1,
        payloadBytes,
      }),
      {
        name: opts.encrypted ? "HTTP/1.1 (over TLS)" : "HTTP/1.1",
        summary: `${status} ${statusText} (${opts.bodyBytes} B body)`,
        ...(opts.encrypted ? { encrypted: true } : {}),
        fields: [
          { name: "Status Line", value: `HTTP/1.1 ${status} ${statusText}` },
          { name: "Content-Type", value: contentType },
          { name: "Content-Length", value: `${opts.bodyBytes} bytes` },
        ],
      },
    ],
    capture: {
      time: opts.time,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: opts.encrypted ? "TLSv1.3" : "HTTP",
      info: opts.encrypted
        ? "Application Data"
        : `HTTP/1.1 ${status} ${statusText} (${contentType})`,
      bytes: frameBytes,
    },
  };
}
