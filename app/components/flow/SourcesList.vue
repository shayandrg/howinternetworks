<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";

defineProps<{
  sources: Array<{ label: string; url: string }>;
}>();
</script>

<template>
  <section aria-labelledby="sources-heading">
    <h2
      id="sources-heading"
      class="text-[18px] font-medium text-[var(--color-primary)]"
    >
      Sources
    </h2>
    <ul class="mt-2.5 space-y-1.5">
      <li v-for="src in sources" :key="src.url">
        <a
          :href="src.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex max-w-full items-center gap-1.5 text-[14px] [overflow-wrap:anywhere] text-[var(--color-accent)] underline-offset-4 hover:underline"
        >
          <span>{{ src.label }}</span>
          <ExternalLink :size="14" :stroke-width="1.5" class="shrink-0" />
        </a>
      </li>
    </ul>
  </section>
</template>
