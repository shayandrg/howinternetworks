<script setup lang="ts">
import { computed } from "vue";
import { getTopic } from "@/content";

const STATIONS = [
  { slug: "ip", title: "IP", fallback: "Addresses and routing between networks" },
  { slug: "dns", title: "DNS", fallback: "How domain names turn into IP addresses" },
  { slug: "tcp", title: "TCP", fallback: "Reliable, ordered byte delivery" },
  { slug: "http", title: "HTTP", fallback: "Requests and responses for web pages" },
  { slug: "tls", title: "TLS", fallback: "Encryption and identity on the wire" },
  { slug: "https", title: "HTTPS", fallback: "HTTP protected inside a TLS tunnel" },
] as const;

const resolvedStations = computed(() =>
  STATIONS.map((station) => {
    const topic = getTopic(station.slug);
    return {
      slug: station.slug,
      title: topic?.meta.title ?? station.title,
      tagline: topic?.meta.tagline ?? station.fallback,
      href: topic ? `/learn/${station.slug}/` : "/topics/",
    };
  }),
);
</script>

<template>
  <section aria-labelledby="start-here-heading" class="py-10">
    <h2
      id="start-here-heading"
      class="text-[22px] font-medium text-[var(--color-primary)]"
    >
      Start here
    </h2>

    <div class="relative mt-6">
      <div
        aria-hidden="true"
        class="absolute inset-x-6 top-4 hidden h-0.5 bg-[var(--color-hairline)] lg:block"
      />

      <ol class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <li
          v-for="(station, idx) in resolvedStations"
          :key="station.slug"
          class="relative"
        >
          <NuxtLink
            :to="station.href"
            class="flex h-full flex-col rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 transition-colors duration-150 hover:bg-[var(--color-raised)]"
          >
            <div class="flex items-center gap-2">
              <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-card)] font-mono text-[11px] font-medium tabular-nums text-[var(--color-accent)]">
                {{ idx + 1 }}
              </span>
              <span class="text-[15px] font-medium text-[var(--color-primary)]">
                {{ station.title }}
              </span>
            </div>
            <p class="mt-2 text-[13px] leading-[18px] text-[var(--color-secondary)]">
              {{ station.tagline }}
            </p>
          </NuxtLink>
        </li>
      </ol>
    </div>
  </section>
</template>
