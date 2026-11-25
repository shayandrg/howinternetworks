import fs from "node:fs";
import path from "node:path";
import { topics } from "../src/content";
import { glossaryTerms } from "../src/content/glossary";

const RESEARCH_DIR =
  process.env.RESEARCH_DIR || "H:\\apps\\howinternetworks-research";

const PROTOCOL_TOKENS = new Set([
  "http",
  "https",
  "tcp",
  "udp",
  "ip",
  "ipv4",
  "ipv6",
  "dns",
  "dhcp",
  "icmp",
  "tls",
  "ssl",
  "ssh",
  "smtp",
  "imap",
  "pop3",
  "ftp",
  "arp",
  "nat",
  "quic",
  "doh",
  "dnssec",
  "ntp",
  "websocket",
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
  "wifi",
  "wpa3",
  "ethernet",
  "syn",
  "ack",
  "fin",
  "rst",
  "psh",
  "get",
  "post",
  "ok",
  "ns",
  "mx",
  "a",
  "aaaa",
  "rfc",
  "ttl",
  "mtu",
  "mss",
  "mac",
  "port",
  "bytes",
  "b",
  "s",
  "ms",
]);

const IPV4_OR_NUM_RE = /^(\d+|\d+\.\d+\.\d+\.\d+|0x[0-9a-f]+|::?[0-9a-f:]+)$/i;

function normalizeWords(text: string): string[] {
  const cleaned = text
    .replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([a-z0-9-]+)\]\]/g, "$1")
    .replace(/\{\{[a-z0-9-]+\}\}/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.:/-]+/gu, " ")
    .replace(/[.:/-]+$/g, "");

  return cleaned
    .split(/\s+/)
    .map((w) => w.replace(/^[.:/-]+|[.:/-]+$/g, ""))
    .filter((w) => w.length > 0);
}

function isTechnicalOnlySequence(seq: string[]): boolean {
  return seq.every(
    (w) => PROTOCOL_TOKENS.has(w) || IPV4_OR_NUM_RE.test(w),
  );
}

function ngrams(words: string[], size = 8): string[] {
  const out: string[] = [];
  if (words.length < size) return out;
  for (let i = 0; i <= words.length - size; i++) {
    const slice = words.slice(i, i + size);
    if (!isTechnicalOnlySequence(slice)) {
      out.push(slice.join(" "));
    }
  }
  return out;
}

function collectResearchGrams(researchDir: string): Set<string> {
  const grams = new Set<string>();
  const liveDir = path.join(researchDir, "live-lessons");
  if (fs.existsSync(liveDir)) {
    for (const file of fs.readdirSync(liveDir)) {
      if (file.endsWith(".md") && file !== "INDEX.md") {
        const raw = fs.readFileSync(path.join(liveDir, file), "utf8");
        for (const g of ngrams(normalizeWords(raw))) {
          grams.add(g);
        }
      }
    }
  }

  const lessonsTs = path.join(researchDir, "extracted-repo-14", "lessons.ts");
  if (fs.existsSync(lessonsTs)) {
    const raw = fs.readFileSync(lessonsTs, "utf8");
    const stringLiterals = raw.match(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g) ?? [];
    for (const lit of stringLiterals) {
      const inner = lit.slice(1, -1);
      for (const g of ngrams(normalizeWords(inner))) {
        grams.add(g);
      }
    }
  }
  return grams;
}

function collectStrings(
  value: unknown,
  fieldPath: string,
  out: Array<{ field: string; text: string }>,
): void {
  if (typeof value === "string") {
    out.push({ field: fieldPath, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, `${fieldPath}[${i}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "sources" || k === "url" || k === "id" || k === "slug") continue;
      collectStrings(v, `${fieldPath}.${k}`, out);
    }
  }
}

function main() {
  if (!fs.existsSync(RESEARCH_DIR)) {
    console.log("originality check skipped: research folder not found");
    process.exit(0);
  }

  const researchGrams = collectResearchGrams(RESEARCH_DIR);
  const violations: Array<{ topic: string; field: string; phrase: string }> = [];

  for (const topic of topics) {
    const strings: Array<{ field: string; text: string }> = [];
    collectStrings(topic, topic.meta.slug, strings);
    for (const { field, text } of strings) {
      for (const g of ngrams(normalizeWords(text))) {
        if (researchGrams.has(g)) {
          violations.push({ topic: topic.meta.slug, field, phrase: g });
        }
      }
    }
  }

  for (const term of glossaryTerms) {
    const strings: Array<{ field: string; text: string }> = [];
    collectStrings(term, `glossary.${term.id}`, strings);
    for (const { field, text } of strings) {
      for (const g of ngrams(normalizeWords(text))) {
        if (researchGrams.has(g)) {
          violations.push({ topic: "glossary", field, phrase: g });
        }
      }
    }
  }

  if (violations.length > 0) {
    for (const v of violations) {
      console.error(
        `Originality failure [${v.topic}] ${v.field}: "${v.phrase}"`,
      );
    }
    process.exit(1);
  }

  console.log(
    `Originality check passed (${topics.length} topic(s), ${glossaryTerms.length} glossary terms checked against ${researchGrams.size} research 8-grams).`,
  );
}

main();
