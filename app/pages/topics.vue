<script setup lang="ts">
import { computed, ref } from "vue";
import { Search } from "lucide-vue-next";
import { topics } from "@/content";
import { GROUPS } from "@/content/groups";
import TopicCard from "~/components/site/TopicCard.vue";

useHead({
  title: "Topics",
  link: [{ rel: "canonical", href: "/topics/" }],
});
useSeoMeta({
  description:
    "Browse all interactive internet protocol topics grouped by role and TCP/IP layer.",
});

type LayerFilter = "all" | "application" | "transport" | "internet" | "link";

const FILTER_OPTIONS: Array<{ id: LayerFilter; label: string }> = [
  { id: "all", label: "All layers" },
  { id: "application", label: "Application" },
  { id: "transport", label: "Transport" },
  { id: "internet", label: "Internet" },
  { id: "link", label: "Link" },
];

const layer = ref<LayerFilter>("all");
const query = ref("");

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];

  return topics.filter((t) => {
    if (layer.value !== "all" && t.meta.layer?.tcpip !== layer.value) {
      return false;
    }
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
});

const groupedSections = computed(() =>
  GROUPS.map((group) => ({
    ...group,
    topics: filtered.value.filter((t) => t.meta.group === group.id),
  })).filter((g) => g.topics.length > 0),
);
</script>

<template>
  <div class="mx-auto max-w-[1320px] px-4 py-8">
    <h1 class="text-[32px] font-medium leading-[1.15] tracking-tight text-[var(--color-primary)]">
      Topics
    </h1>
    <p class="mt-2 text-[15px] leading-[22px] text-[var(--color-secondary)]">
      Every interactive flow currently available ({{ topics.length }}
      {{ topics.length === 1 ? "topic" : "topics" }}).
    </p>

    <div class="mt-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Filter by layer"
          class="flex flex-wrap gap-1.5"
        >
          <button
            v-for="opt in FILTER_OPTIONS"
            :key="opt.id"
            type="button"
            :aria-pressed="layer === opt.id"
            :class="`min-h-[36px] cursor-pointer rounded-[8px] border px-3 text-[13px] transition-colors duration-150 ${
              layer === opt.id
                ? 'border-[var(--color-accent)] bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
                : 'border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`"
            @click="layer = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>

        <label class="relative block sm:w-64">
          <span class="sr-only">Filter topics</span>
          <Search
            :size="16"
            :stroke-width="1.5"
            class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            v-model="query"
            type="search"
            placeholder="Filter topics"
            class="h-9 w-full rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] pe-3 ps-9 text-[14px] text-[var(--color-primary)] placeholder:text-[var(--color-muted)]"
          >
        </label>
      </div>

      <p
        v-if="filtered.length === 0"
        class="mt-8 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-6 text-center text-[15px] text-[var(--color-secondary)]"
      >
        No topic matches “{{ query || layer }}”. Try a protocol name like DNS or
        TCP.
      </p>

      <div v-else class="mt-8 space-y-10">
        <section
          v-for="group in groupedSections"
          :key="group.id"
          :aria-labelledby="`group-${group.id}`"
        >
          <h2
            :id="`group-${group.id}`"
            class="text-[18px] font-medium text-[var(--color-primary)]"
          >
            {{ group.label }}
          </h2>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <TopicCard
              v-for="topic in group.topics"
              :key="topic.meta.slug"
              :topic="topic"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
