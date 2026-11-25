/**
 * Wire-size constants and helpers for Ethernet II, IP, UDP, TCP, and DNS.
 * Capture lengths reflect frames as observed on the wire without the 4-byte FCS.
 */

export const ETH_HEADER = 14;
export const IPV4_HEADER = 20;
export const IPV6_HEADER = 40;
export const UDP_HEADER = 8;
export const TCP_BASE_HEADER = 20;
export const MIN_FRAME_BYTES = 60;
export const IPV4_MTU = 1500;
export const IPV4_MSS = 1460;
export const DNS_HEADER = 12;
export const DNS_OPT_RR_BYTES = 11;
export const ARP_PAYLOAD_BYTES = 28;

const utf8Encoder = new TextEncoder();

export function utf8ByteLength(text: string): number {
  return utf8Encoder.encode(text).length;
}

export function padFrameBytes(rawBytes: number): number {
  return Math.max(MIN_FRAME_BYTES, rawBytes);
}

/**
 * Computes the uncompressed DNS wire length of a domain name in labels + trailing 0x00.
 */
export function dnsNameWireLength(name: string): number {
  const trimmed = name.replace(/\.$/, "");
  if (!trimmed) return 1;
  const labels = trimmed.split(".");
  let total = 1; // terminating root zero-length label
  for (const label of labels) {
    total += 1 + utf8ByteLength(label);
  }
  return total;
}

export function udpFrameBytes(
  payloadBytes: number,
  ipv6 = false,
): { rawBytes: number; frameBytes: number } {
  const ipHeader = ipv6 ? IPV6_HEADER : IPV4_HEADER;
  const rawBytes = ETH_HEADER + ipHeader + UDP_HEADER + payloadBytes;
  return { rawBytes, frameBytes: padFrameBytes(rawBytes) };
}

export function tcpFrameBytes(
  optionsBytes = 0,
  payloadBytes = 0,
  ipv6 = false,
): { rawBytes: number; frameBytes: number } {
  const ipHeader = ipv6 ? IPV6_HEADER : IPV4_HEADER;
  const rawBytes =
    ETH_HEADER + ipHeader + TCP_BASE_HEADER + optionsBytes + payloadBytes;
  return { rawBytes, frameBytes: padFrameBytes(rawBytes) };
}

/**
 * Splits a payload of `totalBytes` into TCP segments of at most `mss` bytes.
 */
export function splitIntoSegments(
  totalBytes: number,
  mss: number = IPV4_MSS,
): number[] {
  if (totalBytes <= 0) return [];
  const segments: number[] = [];
  let remaining = totalBytes;
  while (remaining > 0) {
    const chunk = Math.min(mss, remaining);
    segments.push(chunk);
    remaining -= chunk;
  }
  return segments;
}
