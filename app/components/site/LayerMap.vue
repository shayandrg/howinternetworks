<script setup lang="ts">
import { computed } from "vue";
import { topics } from "@/content";

const LAYERS = [
  {
    id: "application",
    name: "Application",
    desc: "Web, mail, names, and network setup protocols",
  },
  {
    id: "transport",
    name: "Transport",
    desc: "Ports, streams, datagrams, and reliability",
  },
  {
    id: "internet",
    name: "Internet",
    desc: "Addressing, forwarding across networks, and tunnels",
  },
  {
    id: "link",
    name: "Link",
    desc: "Frames over cables, Wi-Fi radio, and local access",
  },
] as const;

const layerGroups = computed(() =>
  LAYERS.map((layer) => ({
    ...layer,
    topics: topics.filter((t) => t.meta.layer?.tcpip === layer.id),
  })),
);
</script>

<template>
  <section aria-labelledby="layer-map-heading" class="py-10">
    <h2
      id="layer-map-heading"
      class="text-[22px] font-medium text-[var(--color-primary)]"
    >
      Every topic, by layer
    </h2>

    <div class="mt-6 space-y-3">
      <div
        v-for="layer in layerGroups"
        :key="layer.id"
        class="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 class="text-[15px] font-medium text-[var(--color-primary)]">
              {{ layer.name }}
            </h3>
            <p class="text-[13px] text-[var(--color-secondary)]">
              {{ layer.desc }}
            </p>
          </div>
          <span class="font-mono text-[12px] tabular-nums text-[var(--color-muted)]">
            {{ layer.topics.length }}
            {{ layer.topics.length === 1 ? "topic" : "topics" }}
          </span>
        </div>

        <div
          v-if="layer.topics.length > 0"
          class="mt-3 flex flex-wrap gap-2"
        >
          <NuxtLink
            v-for="t in layer.topics"
            :key="t.meta.slug"
            :to="`/learn/${t.meta.slug}/`"
            class="rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2.5 py-1 text-[13px] font-medium text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-raised)]"
          >
            {{ t.meta.title }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
