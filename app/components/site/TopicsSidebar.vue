<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Search, X } from "lucide-vue-next";
import { useRoute } from "vue-router";
import { topics } from "@/content";
import { GROUPS } from "@/content/groups";

const props = defineProps<{
  openMobile: boolean;
  collapsedDesktop: boolean;
}>();

const emit = defineEmits<{
  closeMobile: [];
}>();

const route = useRoute();
const filter = ref("");

watch(
  () => route.fullPath,
  () => {
    emit("closeMobile");
  },
);

const normalizedPath = computed(() => route.path.replace(/\/+$/, "") || "/");

function isActiveTopic(slug: string): boolean {
  return normalizedPath.value === `/learn/${slug}`;
}

const groupedTopics = computed(() => {
  const q = filter.value.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter(Boolean) : [];

  return GROUPS.map((group) => {
    const items = topics.filter((t) => {
      if (t.meta.group !== group.id) return false;
      if (words.length === 0) return true;
      const hay = [
        t.meta.slug,
        t.meta.title,
        t.meta.fullName ?? "",
        ...t.meta.tags,
      ]
        .join(" ")
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    return { ...group, items };
  }).filter((g) => g.items.length > 0);
});

const LAYER_SHORT: Record<
  "link" | "internet" | "transport" | "application",
  string
> = {
  link: "L2",
  internet: "L3",
  transport: "L4",
  application: "L7",
};
</script>

<template>
  <!-- Desktop sidebar (>= 1024px) -->
  <aside
    v-show="!collapsedDesktop"
    aria-label="Topics sidebar"
    class="hidden w-[252px] shrink-0 border-e border-[var(--color-hairline)] bg-[var(--color-card)] lg:block"
  >
    <div class="sticky top-0 flex max-h-screen flex-col">
      <div class="border-b border-[var(--color-hairline)] p-3">
        <div class="mb-2 flex items-center justify-between text-[12px] font-medium text-[var(--color-muted)]">
          <span>All topics</span>
          <span class="font-mono tabular-nums">{{ topics.length }}</span>
        </div>
        <label class="relative block">
          <span class="sr-only">Filter sidebar topics</span>
          <Search
            :size="14"
            :stroke-width="1.5"
            class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            v-model="filter"
            type="search"
            placeholder="Quick filter..."
            class="h-8 w-full rounded-[7px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] pe-2.5 ps-8 text-[13px] text-[var(--color-primary)] placeholder:text-[var(--color-muted)]"
          >
        </label>
      </div>

      <nav
        aria-label="Topic navigation"
        class="flex-1 space-y-5 overflow-y-auto px-2.5 py-3"
      >
        <p
          v-if="groupedTopics.length === 0"
          class="px-2 py-4 text-center text-[13px] text-[var(--color-muted)]"
        >
          No matching topics.
        </p>

        <div
          v-for="group in groupedTopics"
          :key="group.id"
          class="space-y-1"
        >
          <div class="px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
            {{ group.label }}
          </div>
          <ul class="space-y-0.5">
            <li v-for="topic in group.items" :key="topic.meta.slug">
              <NuxtLink
                :to="`/learn/${topic.meta.slug}/`"
                :aria-current="isActiveTopic(topic.meta.slug) ? 'page' : undefined"
                :class="`flex items-center justify-between gap-2 rounded-[7px] px-2.5 py-1.5 text-[13px] leading-5 transition-colors duration-150 ${
                  isActiveTopic(topic.meta.slug)
                    ? 'bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
                    : 'text-[var(--color-secondary)] hover:bg-[var(--color-raised)]/60 hover:text-[var(--color-primary)]'
                }`"
              >
                <span class="truncate">{{ topic.meta.title }}</span>
                <span
                  v-if="topic.meta.layer"
                  class="shrink-0 font-mono text-[10.5px] text-[var(--color-muted)]"
                >
                  {{ LAYER_SHORT[topic.meta.layer.tcpip] }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  </aside>

  <!-- Mobile & tablet slide-over drawer (< 1024px) -->
  <div
    v-if="props.openMobile"
    role="dialog"
    aria-modal="true"
    aria-label="Topics menu"
    class="fixed inset-0 z-50 flex bg-black/45 lg:hidden"
    @click.self="emit('closeMobile')"
    @keydown.esc="emit('closeMobile')"
  >
    <aside class="flex h-full w-[280px] max-w-[85vw] flex-col border-e border-[var(--color-hairline)] bg-[var(--color-card)]">
      <div class="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3">
        <span class="text-[14px] font-medium text-[var(--color-primary)]">
          Topics ({{ topics.length }})
        </span>
        <button
          type="button"
          aria-label="Close topics sidebar"
          class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] text-[var(--color-secondary)] hover:bg-[var(--color-raised)]"
          @click="emit('closeMobile')"
        >
          <X :size="18" :stroke-width="1.5" />
        </button>
      </div>

      <div class="border-b border-[var(--color-hairline)] p-3">
        <label class="relative block">
          <span class="sr-only">Filter drawer topics</span>
          <Search
            :size="14"
            :stroke-width="1.5"
            class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            v-model="filter"
            type="search"
            placeholder="Quick filter..."
            class="h-9 w-full rounded-[7px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] pe-2.5 ps-8 text-[13px] text-[var(--color-primary)] placeholder:text-[var(--color-muted)]"
          >
        </label>
      </div>

      <nav
        aria-label="Mobile topic navigation"
        class="flex-1 space-y-5 overflow-y-auto px-3 py-3"
      >
        <div
          v-for="group in groupedTopics"
          :key="group.id"
          class="space-y-1"
        >
          <div class="px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
            {{ group.label }}
          </div>
          <ul class="space-y-0.5">
            <li v-for="topic in group.items" :key="topic.meta.slug">
              <NuxtLink
                :to="`/learn/${topic.meta.slug}/`"
                :aria-current="isActiveTopic(topic.meta.slug) ? 'page' : undefined"
                :class="`flex min-h-[40px] items-center justify-between gap-2 rounded-[7px] px-2.5 py-1.5 text-[14px] transition-colors duration-150 ${
                  isActiveTopic(topic.meta.slug)
                    ? 'bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
                    : 'text-[var(--color-secondary)] hover:bg-[var(--color-raised)]/60 hover:text-[var(--color-primary)]'
                }`"
                @click="emit('closeMobile')"
              >
                <span class="truncate">{{ topic.meta.title }}</span>
                <span
                  v-if="topic.meta.layer"
                  class="shrink-0 font-mono text-[11px] text-[var(--color-muted)]"
                >
                  {{ LAYER_SHORT[topic.meta.layer.tcpip] }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  </div>
</template>
