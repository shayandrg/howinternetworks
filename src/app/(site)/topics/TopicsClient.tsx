"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { Flow } from "@/content/schema";
import { GROUPS } from "@/content/groups";
import { TopicCard } from "@/components/site/TopicCard";

type LayerFilter = "all" | "application" | "transport" | "internet" | "link";

const FILTER_OPTIONS: Array<{ id: LayerFilter; label: string }> = [
  { id: "all", label: "All layers" },
  { id: "application", label: "Application" },
  { id: "transport", label: "Transport" },
  { id: "internet", label: "Internet" },
  { id: "link", label: "Link" },
];

export function TopicsClient({ topics }: { topics: Flow[] }) {
  const [layer, setLayer] = useState<LayerFilter>("all");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];

  const filtered = topics.filter((t) => {
    if (layer !== "all" && t.meta.layer?.tcpip !== layer) return false;
    if (words.length === 0) return true;
    const hay = [
      t.meta.slug,
      t.meta.title,
      t.meta.fullName ?? "",
      t.meta.tagline,
      ...t.meta.tags,
    ]
      .join(" ")
      .toLowerCase();
    const tokens = hay.split(/[^a-z0-9.-]+/).filter(Boolean);
    return words.every((w) => tokens.some((tok) => tok.startsWith(w)));
  });

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter by layer"
          className="flex flex-wrap gap-1.5"
        >
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLayer(opt.id)}
              aria-pressed={layer === opt.id}
              className={`min-h-[36px] cursor-pointer rounded-[8px] border px-3 text-[13px] transition-colors duration-150 ${
                layer === opt.id
                  ? "border-[var(--color-accent)] bg-[var(--color-raised)] font-medium text-[var(--color-primary)]"
                  : "border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="relative block sm:w-64">
          <span className="sr-only">Filter topics</span>
          <Search
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter topics"
            className="h-9 w-full rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] pe-3 ps-9 text-[14px] text-[var(--color-primary)] placeholder:text-[var(--color-muted)]"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-6 text-center text-[15px] text-[var(--color-secondary)]">
          No topic matches “{query || layer}”. Try a protocol name like DNS or
          TCP.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {GROUPS.map((group) => {
            const groupTopics = filtered.filter(
              (t) => t.meta.group === group.id,
            );
            if (groupTopics.length === 0) return null;
            return (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <h2
                  id={`group-${group.id}`}
                  className="text-[18px] font-medium text-[var(--color-primary)]"
                >
                  {group.label}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupTopics.map((topic) => (
                    <TopicCard key={topic.meta.slug} topic={topic} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
