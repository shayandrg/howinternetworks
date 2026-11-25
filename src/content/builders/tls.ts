import type { StageEvent } from "@/engine/types";
import { EPHEMERAL_PORT_START, LAPTOP_MAC, ROUTER_MAC } from "@/content/world";
import { IPV4_HEADER, TCP_BASE_HEADER, tcpFrameBytes } from "./sizes";
import { ethernetLayer, ipv4Layer, tcpLayer } from "./layers";

export interface TlsHandshakeOpts {
  from: string;
  to: string;
  srcIp: string;
  dstIp: string;
  sport?: number;
  dport?: number;
  serverName: string;
  alpn?: string;
  startTime: number;
  rtt?: number;
  prefix?: string;
}

export function tlsHandshake13(opts: TlsHandshakeOpts): StageEvent[] {
  const sport = opts.sport ?? EPHEMERAL_PORT_START;
  const dport = opts.dport ?? 443;
  const rtt = opts.rtt ?? 0.02;
  const p = opts.prefix ?? "tls13";

  const chPayload = 517; // TLS 1.3 ClientHello record size (RFC 8446 typical padded CH)
  const shPayload = 1600; // ServerHello + EncryptedExtensions + Certificate + CertificateVerify + Finished

  const chSizes = tcpFrameBytes(0, chPayload);
  const shSizes = tcpFrameBytes(0, shPayload);
  const finSizes = tcpFrameBytes(0, 64);

  const clientHello: StageEvent = {
    type: "packet",
    id: `${p}-client-hello`,
    from: opts.from,
    to: opts.to,
    tone: "secure",
    label: "ClientHello",
    layers: [
      ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER + chPayload,
      }),
      tcpLayer({
        sport,
        dport,
        flags: "PSH, ACK",
        seq: 1,
        ack: 1,
        payloadBytes: chPayload,
      }),
      {
        name: "TLS 1.3 Handshake",
        summary: `ClientHello (SNI ${opts.serverName})`,
        fields: [
          { name: "Handshake Type", value: "ClientHello (1)" },
          { name: "Supported Versions", value: "TLS 1.3 (0x0304)" },
          {
            name: "Cipher Suites",
            value: "TLS_AES_128_GCM_SHA256, TLS_CHACHA20_POLY1305_SHA256",
          },
          { name: "Key Share", value: "x25519 public key (32 bytes)" },
          { name: "Server Name (SNI)", value: opts.serverName },
          ...(opts.alpn ? [{ name: "ALPN", value: opts.alpn }] : []),
        ],
      },
    ],
    capture: {
      time: opts.startTime,
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "TLSv1.3",
      info: `Client Hello (SNI=${opts.serverName})`,
      bytes: chSizes.frameBytes,
    },
  };

  const serverHello: StageEvent = {
    type: "packet",
    id: `${p}-server-hello`,
    from: opts.to,
    to: opts.from,
    tone: "secure",
    label: "ServerHello + Cert",
    locked: true,
    layers: [
      ethernetLayer({ srcMac: ROUTER_MAC, dstMac: LAPTOP_MAC }),
      ipv4Layer({
        src: opts.dstIp,
        dst: opts.srcIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER + shPayload,
      }),
      tcpLayer({
        sport: dport,
        dport: sport,
        flags: "PSH, ACK",
        seq: 1,
        ack: 1 + chPayload,
        payloadBytes: shPayload,
      }),
      {
        name: "TLS 1.3 ServerHello",
        summary: "ServerHello (TLS 1.3, x25519)",
        fields: [
          { name: "Handshake Type", value: "ServerHello (2)" },
          { name: "Selected Version", value: "TLS 1.3 (0x0304)" },
          { name: "Cipher Suite", value: "TLS_AES_128_GCM_SHA256" },
          { name: "Key Share", value: "x25519 public key (32 bytes)" },
        ],
      },
      {
        name: "TLS 1.3 Encrypted Handshake",
        summary: "EncryptedExtensions, Certificate, CertificateVerify, Finished",
        encrypted: true,
        fields: [
          { name: "EncryptedExtensions", value: opts.alpn ?? "alpn" },
          { name: "Certificate", value: `Leaf + intermediate for ${opts.serverName}` },
          { name: "CertificateVerify", value: "Signature over handshake transcript" },
          { name: "Finished", value: "HMAC verify data" },
        ],
      },
    ],
    capture: {
      time: Number((opts.startTime + rtt).toFixed(3)),
      src: opts.dstIp,
      dst: opts.srcIp,
      protocol: "TLSv1.3",
      info: "Server Hello, Change Cipher Spec, Application Data",
      bytes: shSizes.frameBytes,
    },
  };

  const clientFinished: StageEvent = {
    type: "packet",
    id: `${p}-client-finished`,
    from: opts.from,
    to: opts.to,
    tone: "secure",
    label: "Client Finished",
    locked: true,
    fast: true,
    layers: [
      ethernetLayer({ srcMac: LAPTOP_MAC, dstMac: ROUTER_MAC }),
      ipv4Layer({
        src: opts.srcIp,
        dst: opts.dstIp,
        protocol: "TCP (6)",
        totalLength: IPV4_HEADER + TCP_BASE_HEADER + 64,
      }),
      tcpLayer({
        sport,
        dport,
        flags: "PSH, ACK",
        seq: 1 + chPayload,
        ack: 1 + shPayload,
        payloadBytes: 64,
      }),
      {
        name: "TLS 1.3 Encrypted Handshake",
        summary: "Client Finished (64 B)",
        encrypted: true,
        fields: [
          { name: "Handshake Type", value: "Finished (20)" },
          { name: "Verify Data", value: "HMAC over full handshake transcript" },
        ],
      },
    ],
    capture: {
      time: Number((opts.startTime + rtt * 1.1).toFixed(3)),
      src: opts.srcIp,
      dst: opts.dstIp,
      protocol: "TLSv1.3",
      info: "Change Cipher Spec, Application Data (Client Finished)",
      bytes: finSizes.frameBytes,
    },
  };

  return [clientHello, serverHello, clientFinished];
}
