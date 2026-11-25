<script setup lang="ts">
import type { Fact } from "@/engine/types";

defineProps<{
  facts: Fact[];
  title?: string;
}>();
</script>

<template>
  <div v-if="facts.length > 0">
    <h3
      v-if="title"
      class="mb-2 text-[14px] font-medium text-[var(--color-primary)]"
    >
      {{ title }}
    </h3>
    <dl class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div
        v-for="fact in facts"
        :key="fact.label"
        class="rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-2"
      >
        <dt class="text-[12px] text-[var(--color-muted)]">
          {{ fact.label }}
        </dt>
        <dd class="mt-0.5 text-[14px] font-medium text-[var(--color-primary)]">
          {{ fact.value }}
        </dd>
      </div>
    </dl>
  </div>
</template>
