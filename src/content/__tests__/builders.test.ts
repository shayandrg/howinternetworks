import { describe, expect, it } from "vitest";
import {
  computeDnsQueryBytes,
  computeDnsResponseBytes,
} from "../builders/dns";
import {
  IPV4_MSS,
  splitIntoSegments,
  tcpFrameBytes,
} from "../builders/sizes";
import { WEB_DOMAIN, WEB_SERVER_IP } from "../world";

describe("content builders and size calculations", () => {
  it("computes DNS query for www.example.com (type A, IPv4/UDP) as 75 bytes", () => {
    const res = computeDnsQueryBytes(WEB_DOMAIN, false);
    expect(res.frameBytes).toBe(75);
  });

  it("computes DNS response with one A record using a name pointer as 91 bytes", () => {
    const res = computeDnsResponseBytes({
      qname: WEB_DOMAIN,
      answers: [
        {
          name: WEB_DOMAIN,
          type: "A",
          ttl: 3600,
          value: WEB_SERVER_IP,
          compressedName: true,
        },
      ],
      edns: false,
    });
    expect(res.frameBytes).toBe(91);
  });

  it("computes TCP SYN with 12 bytes of options as 66 bytes", () => {
    const res = tcpFrameBytes(12, 0);
    expect(res.rawBytes).toBe(66);
    expect(res.frameBytes).toBe(66);
  });

  it("computes bare TCP ACK as 54 header bytes, padded to 60", () => {
    const res = tcpFrameBytes(0, 0);
    expect(res.rawBytes).toBe(54);
    expect(res.frameBytes).toBe(60);
  });

  it("splits a 12,500-byte HTTP body into 9 TCP segments at MSS 1460", () => {
    const segments = splitIntoSegments(12500, IPV4_MSS);
    expect(segments).toHaveLength(9);
    expect(segments.reduce((a, b) => a + b, 0)).toBe(12500);
    expect(segments.slice(0, 8).every((s) => s === 1460)).toBe(true);
    expect(segments[8]).toBe(820);
  });
});
