<script setup lang="ts">
import type { Flow } from "@/content/schema";

defineProps<{
  topic: Flow;
}>();

const LAYER_LABELS: Record<
  "link" | "internet" | "transport" | "application",
  string
> = {
  link: "Link",
  internet: "Internet",
  transport: "Transport",
  application: "Application",
};
</script>

<template>
  <NuxtLink
    :to="`/learn/${topic.meta.slug}/`"
    class="flex flex-col justify-between rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 transition-colors duration-150 hover:bg-[var(--color-raised)]"
  >
    <div>
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="text-[16px] font-medium text-[var(--color-primary)]">
          {{ topic.meta.title }}
        </h3>
        <span
          v-if="topic.meta.layer"
          class="shrink-0 rounded-[4px] border border-[var(--color-hairline)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]"
        >
          {{ LAYER_LABELS[topic.meta.layer.tcpip] }}
        </span>
      </div>
      <div
        v-if="topic.meta.fullName"
        class="mt-0.5 text-[12px] text-[var(--color-muted)]"
      >
        {{ topic.meta.fullName }}
      </div>
      <p class="mt-2 text-[14px] leading-5 text-[var(--color-secondary)]">
        {{ topic.meta.tagline }}
      </p>
    </div>
  </NuxtLink>
</template>
