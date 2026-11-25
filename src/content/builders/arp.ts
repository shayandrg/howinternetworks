import type { StageEvent } from "@/engine/types";
import { ARP_PAYLOAD_BYTES, ETH_HEADER, padFrameBytes } from "./sizes";
import { ethernetLayer } from "./layers";

export interface ArpOpts {
  id: string;
  from: string;
  to: string;
  senderMac: string;
  senderIp: string;
  targetMac?: string;
  targetIp: string;
  time: number;
}

export function arpRequest(opts: ArpOpts): StageEvent {
  const bytes = padFrameBytes(ETH_HEADER + ARP_PAYLOAD_BYTES);
  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    tone: "lookup",
    label: `ARP who-has ${opts.targetIp}`,
    fast: true,
    layers: [
      ethernetLayer({
        srcMac: opts.senderMac,
        dstMac: "ff:ff:ff:ff:ff:ff",
        etherType: "0x0806 (ARP)",
      }),
      {
        name: "ARP",
        summary: `Request: who has ${opts.targetIp}?`,
        fields: [
          { name: "Opcode", value: "Request (1)" },
          { name: "Sender MAC", value: opts.senderMac },
          { name: "Sender IP", value: opts.senderIp },
          { name: "Target MAC", value: "00:00:00:00:00:00" },
          { name: "Target IP", value: opts.targetIp },
        ],
      },
    ],
    capture: {
      time: opts.time,
      src: opts.senderMac,
      dst: "Broadcast",
      protocol: "ARP",
      info: `Who has ${opts.targetIp}? Tell ${opts.senderIp}`,
      bytes,
    },
  };
}

export function arpReply(opts: ArpOpts): StageEvent {
  const bytes = padFrameBytes(ETH_HEADER + ARP_PAYLOAD_BYTES);
  const tMac = opts.targetMac ?? "00:00:00:00:00:00";
  return {
    type: "packet",
    id: opts.id,
    from: opts.from,
    to: opts.to,
    tone: "response",
    label: `ARP is-at ${opts.senderMac}`,
    fast: true,
    layers: [
      ethernetLayer({
        srcMac: opts.senderMac,
        dstMac: tMac,
        etherType: "0x0806 (ARP)",
      }),
      {
        name: "ARP",
        summary: `Reply: ${opts.senderIp} is at ${opts.senderMac}`,
        fields: [
          { name: "Opcode", value: "Reply (2)" },
          { name: "Sender MAC", value: opts.senderMac },
          { name: "Sender IP", value: opts.senderIp },
          { name: "Target MAC", value: tMac },
          { name: "Target IP", value: opts.targetIp },
        ],
      },
    ],
    capture: {
      time: opts.time,
      src: opts.senderMac,
      dst: tMac,
      protocol: "ARP",
      info: `${opts.senderIp} is at ${opts.senderMac}`,
      bytes,
    },
  };
}
