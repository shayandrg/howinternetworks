export type RichSegment =
  | { type: "text"; text: string }
  | { type: "glossary"; id: string; label?: string }
  | { type: "packet"; id: string }
  | { type: "code"; text: string };

const TOKEN_RE = /(\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]|\{\{([a-z0-9-]+)\}\}|`([^`]+)`)/g;

export function parseRichText(input: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(TOKEN_RE)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      segments.push({ type: "text", text: input.slice(lastIndex, idx) });
    }

    if (match[2]) {
      segments.push({
        type: "glossary",
        id: match[2],
        ...(match[3] ? { label: match[3] } : {}),
      });
    } else if (match[4]) {
      segments.push({ type: "packet", id: match[4] });
    } else if (match[5]) {
      segments.push({ type: "code", text: match[5] });
    }

    lastIndex = idx + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ type: "text", text: input.slice(lastIndex) });
  }

  return segments;
}

export function stripMarkup(input: string): string {
  return input
    .replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([a-z0-9-]+)\]\]/g, "$1")
    .replace(/\{\{[a-z0-9-]+\}\}/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
