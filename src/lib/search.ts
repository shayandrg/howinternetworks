import { topics } from "@/content";
import { glossaryTerms } from "@/content/glossary";

export interface SearchEntry {
  kind: "topic" | "glossary";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  searchText: string;
}

function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const t of topics) {
    const stepTitles = t.steps.map((s) => s.title).join(" ");
    const tags = t.meta.tags.join(" ");
    entries.push({
      kind: "topic",
      id: t.meta.slug,
      title: t.meta.title,
      subtitle: t.meta.tagline,
      href: `/learn/${t.meta.slug}/`,
      searchText: [
        t.meta.slug,
        t.meta.title,
        t.meta.fullName ?? "",
        t.meta.tagline,
        tags,
        stepTitles,
      ]
        .join(" ")
        .toLowerCase(),
    });
  }

  for (const g of glossaryTerms) {
    entries.push({
      kind: "glossary",
      id: g.id,
      title: g.term,
      subtitle: g.short,
      href: `/glossary/#${g.id}`,
      searchText: [g.id, g.term, g.short, ...(g.aka ?? [])]
        .join(" ")
        .toLowerCase(),
    });
  }

  return entries;
}

export const SEARCH_INDEX: SearchEntry[] = buildSearchIndex();

export function searchEntries(query: string): SearchEntry[] {
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return SEARCH_INDEX.slice(0, 12);
  }

  const matched = SEARCH_INDEX.filter((entry) => {
    const tokens = entry.searchText.split(/[^a-z0-9.-]+/).filter(Boolean);
    return words.every((qw) => tokens.some((tw) => tw.startsWith(qw)));
  });

  matched.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aStarts = words.some((w) => aTitle.startsWith(w)) ? 0 : 1;
    const bStarts = words.some((w) => bTitle.startsWith(w)) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    const aExact = words.some((w) => aTitle.includes(w)) ? 0 : 1;
    const bExact = words.some((w) => bTitle.includes(w)) ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;

    if (a.kind !== b.kind) return a.kind === "topic" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return matched.slice(0, 20);
}
