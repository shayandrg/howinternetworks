import { describe, expect, it } from "vitest";
import type { StageEvent } from "@/engine/types";
import { topics } from "../index";
import { FlowSchema, GlossaryTermSchema, type Flow } from "../schema";
import { glossaryMap, glossaryTerms } from "../glossary";
import { GROUP_LABELS } from "../groups";
import { WORLD_PUBLIC_IPS } from "../world";

const ALLOWED_SPEC_DOMAINS = new Set([
  "www.rfc-editor.org",
  "datatracker.ietf.org",
  "www.iana.org",
  "standards.ieee.org",
  "www.w3.org",
  "html.spec.whatwg.org",
  "websockets.spec.whatwg.org",
  "fetch.spec.whatwg.org",
  "www.wireguard.com",
  "www.modbus.org",
  "www.wi-fi.org",
]);

const BANNED_WORD_RE = /\b(simply|seamless|magic)\b/i;
const PRESS_REPLAY_RE = /press\s+replay/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const IPV4_RE = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
const RFC_RE = /\bRFC\s+(\d{3,5})\b/gi;
const GLOSSARY_LINK_RE = /\[\[([a-z0-9-]+)(?:\|[^\]]+)?\]\]/g;
const PACKET_CHIP_RE = /\{\{([a-z0-9-]+)\}\}/g;

function flattenEvents(events: StageEvent[]): StageEvent[] {
  const out: StageEvent[] = [];
  for (const ev of events) {
    out.push(ev);
    if (ev.type === "together") {
      out.push(...flattenEvents(ev.events));
    }
  }
  return out;
}

function isAllowedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
  if (WORLD_PUBLIC_IPS.includes(ip)) return true;
  if (ip === "0.0.0.0" || ip === "255.255.255.255") return true;
  const [a, b, c] = parts;
  // RFC 1918
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // RFC 5737 documentation ranges
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  // RFC 6598 CGNAT 100.64.0.0/10
  if (a === 100 && b >= 64 && b <= 127) return true;
  // Link-local 169.254.0.0/16
  if (a === 169 && b === 254) return true;
  // Multicast 224.0.0.0/4
  if (a >= 224 && a <= 239) return true;
  return false;
}

function walkStrings(value: unknown, path: string, out: Array<{ path: string; text: string }>): void {
  if (typeof value === "string") {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walkStrings(item, `${path}[${idx}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walkStrings(v, `${path}.${k}`, out);
    }
  }
}

function assertPlainSerializable(value: unknown, path: string): void {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "function") {
    throw new Error(`Function found at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertPlainSerializable(item, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(`Non-plain object found at ${path}`);
    }
    for (const [k, v] of Object.entries(value)) {
      assertPlainSerializable(v, `${path}.${k}`);
    }
  }
}

function hasPath(
  actors: Set<string>,
  links: Flow["scene"]["links"],
  from: string,
  to: string,
  via?: string[],
): boolean {
  const hasEdge = (u: string, v: string) =>
    links.some((l) => (l.from === u && l.to === v) || (l.from === v && l.to === u));

  if (via && via.length > 0) {
    const seq = [from, ...via, to];
    for (let i = 0; i < seq.length - 1; i++) {
      if (!actors.has(seq[i]) || !actors.has(seq[i + 1]) || !hasEdge(seq[i], seq[i + 1])) {
        return false;
      }
    }
    return true;
  }

  const visited = new Set<string>([from]);
  const queue = [from];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === to) return true;
    for (const l of links) {
      const next = l.from === curr ? l.to : l.to === curr ? l.from : null;
      if (next && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

describe("glossary", () => {
  it("validates every glossary term against schema and writing rules", () => {
    const seenIds = new Set<string>();
    for (const term of glossaryTerms) {
      GlossaryTermSchema.parse(term);
      expect(seenIds.has(term.id)).toBe(false);
      seenIds.add(term.id);

      const strings: Array<{ path: string; text: string }> = [];
      walkStrings(term, `glossary.${term.id}`, strings);
      for (const { path, text } of strings) {
        expect(text, `${path} em dash`).not.toContain("\u2014");
        expect(text, `${path} exclamation`).not.toContain("!");
        expect(EMOJI_RE.test(text), `${path} emoji`).toBe(false);
        expect(PRESS_REPLAY_RE.test(text), `${path} press replay`).toBe(false);
        expect(BANNED_WORD_RE.test(text), `${path} banned word`).toBe(false);
      }
    }
  });
});

const PLANNED_SLUGS = new Set([
  "dns",
  "tcp",
  "http",
  "udp",
  "ip",
  "dhcp",
  "icmp",
  "tls",
  "https",
  "ssh",
  "smtp",
  "imap",
  "pop3",
  "ftp",
  "ethernet",
  "wifi",
  "wpa3",
  "ipv6",
  "quic",
  "dns-over-https",
  "dnssec",
  "ntp",
  "websocket",
  "http-proxy",
  "reverse-proxy",
  "captive-portal",
  "socks5",
  "wireguard",
  "ipsec",
  "bgp",
  "radius",
  "pppoe",
  "smb",
  "webrtc",
  "sip",
  "rtsp",
  "rtmp",
  "igmp",
  "modbus",
]);

describe("topics content validation", () => {
  it("has at least one topic", () => {
    expect(topics.length).toBeGreaterThan(0);
  });

  it("enforces all static content rules on every topic", () => {
    const seenSlugs = new Set<string>();

    for (const topic of topics) {
      // 1. Zod schema
      FlowSchema.parse(topic);

      // 2. Unique slug
      expect(seenSlugs.has(topic.meta.slug), `duplicate slug ${topic.meta.slug}`).toBe(false);
      seenSlugs.add(topic.meta.slug);

      // 11. Plain serializable object tree
      assertPlainSerializable(topic, topic.meta.slug);

      // 3. Group, prerequisites, related
      expect(topic.meta.group in GROUP_LABELS, `unknown group ${topic.meta.group}`).toBe(true);
      for (const pre of topic.meta.prerequisites) {
        expect(PLANNED_SLUGS.has(pre), `unknown prerequisite ${pre}`).toBe(true);
      }
      for (const rel of topic.meta.related) {
        expect(PLANNED_SLUGS.has(rel), `unknown related slug ${rel}`).toBe(true);
      }

      // 4. Limits
      expect(topic.meta.tagline.length, `${topic.meta.slug} tagline length`).toBeLessThanOrEqual(60);
      expect(topic.facts.length, `${topic.meta.slug} facts count`).toBeGreaterThanOrEqual(4);
      expect(topic.facts.length, `${topic.meta.slug} facts count`).toBeLessThanOrEqual(6);
      expect(topic.steps.length, `${topic.meta.slug} steps count`).toBeGreaterThanOrEqual(4);
      expect(topic.steps.length, `${topic.meta.slug} steps count`).toBeLessThanOrEqual(8);

      // Unique actor & link ids
      const actorIds = new Set<string>();
      for (const a of topic.scene.actors) {
        expect(actorIds.has(a.id), `duplicate actor ${a.id}`).toBe(false);
        actorIds.add(a.id);
      }
      const linkIds = new Set<string>();
      for (const l of topic.scene.links) {
        expect(linkIds.has(l.id), `duplicate link ${l.id}`).toBe(false);
        linkIds.add(l.id);
        expect(actorIds.has(l.from), `unknown link.from ${l.from}`).toBe(true);
        expect(actorIds.has(l.to), `unknown link.to ${l.to}`).toBe(true);
      }
      for (const v of topic.scene.start.visible) {
        expect(actorIds.has(v), `unknown start.visible ${v}`).toBe(true);
      }
      for (const f of topic.scene.start.focus) {
        expect(actorIds.has(f), `unknown start.focus ${f}`).toBe(true);
      }

      // 8. Sources
      expect(topic.meta.sources.length).toBeGreaterThanOrEqual(1);
      let hasAllowedDomain = false;
      for (const s of topic.meta.sources) {
        const u = new URL(s.url);
        expect(u.protocol, `non-https source ${s.url}`).toBe("https:");
        if (ALLOWED_SPEC_DOMAINS.has(u.hostname)) {
          hasAllowedDomain = true;
        }
      }
      expect(hasAllowedDomain, `${topic.meta.slug} needs an allowed spec domain`).toBe(true);

      // 10. Status and date
      if (topic.meta.status === "draft") {
        expect(
          topic.meta.reviewNotes && topic.meta.reviewNotes.length > 0,
          `${topic.meta.slug} draft must have reviewNotes`,
        ).toBe(true);
      }
      expect(Number.isNaN(Date.parse(topic.meta.lastVerified))).toBe(false);

      // Steps & events checks
      const stepIds = new Set<string>();
      const eventIds = new Set<string>();
      let prevCaptureTime = -1;

      for (const step of topic.steps) {
        expect(stepIds.has(step.id), `duplicate step ${step.id}`).toBe(false);
        stepIds.add(step.id);

        expect(step.title.length, `${topic.meta.slug}.${step.id} title`).toBeLessThanOrEqual(32);
        expect(step.simple.length, `${topic.meta.slug}.${step.id} simple`).toBeLessThanOrEqual(220);
        expect(step.technical.length, `${topic.meta.slug}.${step.id} technical`).toBeLessThanOrEqual(700);

        const flat = flattenEvents(step.events);
        const stepPacketIds = new Set<string>();

        for (const ev of flat) {
          if (ev.type === "packet" || ev.type === "stream") {
            expect(eventIds.has(ev.id), `duplicate event id ${ev.id}`).toBe(false);
            eventIds.add(ev.id);
            stepPacketIds.add(ev.id);
            expect(actorIds.has(ev.from), `unknown from ${ev.from}`).toBe(true);
            expect(actorIds.has(ev.to), `unknown to ${ev.to}`).toBe(true);
            expect(
              hasPath(actorIds, topic.scene.links, ev.from, ev.to, ev.via),
              `no route for ${ev.id} (${ev.from} -> ${ev.to})`,
            ).toBe(true);

            if (ev.type === "packet" && ev.capture) {
              expect(ev.capture.time).toBeGreaterThanOrEqual(prevCaptureTime);
              prevCaptureTime = ev.capture.time;
              expect(Number.isInteger(ev.capture.bytes) && ev.capture.bytes > 0).toBe(true);
            }
            if (ev.type === "stream" && ev.captures) {
              for (const cap of ev.captures) {
                expect(cap.time).toBeGreaterThanOrEqual(prevCaptureTime);
                prevCaptureTime = cap.time;
                expect(Number.isInteger(cap.bytes) && cap.bytes > 0).toBe(true);
              }
            }
          } else if (ev.type === "note") {
            expect(eventIds.has(ev.id), `duplicate note id ${ev.id}`).toBe(false);
            eventIds.add(ev.id);
            expect(actorIds.has(ev.at), `unknown note.at ${ev.at}`).toBe(true);
          } else if (ev.type === "badge" || ev.type === "screen") {
            expect(actorIds.has(ev.at), `unknown event.at ${ev.at}`).toBe(true);
          } else if (ev.type === "focus" || ev.type === "highlight") {
            for (const a of ev.actors) {
              expect(actorIds.has(a), `unknown actor ${a}`).toBe(true);
            }
          } else if (ev.type === "reveal" || ev.type === "hide") {
            for (const a of ev.actors ?? []) {
              expect(actorIds.has(a), `unknown actor ${a}`).toBe(true);
            }
            for (const l of ev.links ?? []) {
              expect(linkIds.has(l), `unknown link ${l}`).toBe(true);
            }
          }
        }

        // Glossary links & inline packet chips
        for (const text of [step.simple, step.technical]) {
          for (const m of text.matchAll(GLOSSARY_LINK_RE)) {
            expect(m[1] in glossaryMap, `unknown glossary term [[${m[1]}]]`).toBe(true);
          }
          for (const m of text.matchAll(PACKET_CHIP_RE)) {
            expect(
              stepPacketIds.has(m[1]),
              `unknown packet chip {{${m[1]}}} in ${topic.meta.slug}.${step.id}`,
            ).toBe(true);
          }
        }
      }

      // Intro & outro glossary links
      for (const text of [topic.intro.simple, topic.intro.technical, topic.outro.simple, topic.outro.technical]) {
        for (const m of text.matchAll(GLOSSARY_LINK_RE)) {
          expect(m[1] in glossaryMap, `unknown glossary term [[${m[1]}]]`).toBe(true);
        }
      }

      // 5, 7, 9: Walk all strings for banned chars/words, IPv4 allowlist, and RFC citations
      const allStrings: Array<{ path: string; text: string }> = [];
      walkStrings(topic, topic.meta.slug, allStrings);
      const sourceText = topic.meta.sources.map((s) => `${s.label} ${s.url}`).join(" ");

      for (const { path, text } of allStrings) {
        if (!path.includes(".sources[")) {
          expect(text, `${path} em dash`).not.toContain("\u2014");
          expect(text, `${path} exclamation`).not.toContain("!");
          expect(EMOJI_RE.test(text), `${path} emoji`).toBe(false);
          expect(PRESS_REPLAY_RE.test(text), `${path} press replay`).toBe(false);
          expect(BANNED_WORD_RE.test(text), `${path} banned word`).toBe(false);

          for (const m of text.matchAll(RFC_RE)) {
            const rfcNum = m[1];
            expect(
              new RegExp(`RFC\\s*${rfcNum}|rfc${rfcNum}\\b`, "i").test(sourceText),
              `${path} mentions RFC ${rfcNum} missing from sources`,
            ).toBe(true);
          }
        }

        for (const m of text.matchAll(IPV4_RE)) {
          expect(isAllowedIpv4(m[0]), `${path} disallowed IPv4 ${m[0]}`).toBe(true);
        }
      }
    }
  });
});
