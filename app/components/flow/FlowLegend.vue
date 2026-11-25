<script setup lang="ts">
import { computed } from "vue";
import type { Flow } from "@/content/schema";
import type { StageEvent, Tone } from "@/engine/types";
import { TONE_LABELS, TONE_VARS } from "@/stage/tokens";

const props = defineProps<{
  flow: Flow;
}>();

function collectUsedTones(events: StageEvent[], out: Set<Tone>): void {
  for (const ev of events) {
    if (ev.type === "packet" || ev.type === "stream") {
      out.add(ev.tone);
    } else if (ev.type === "together") {
      collectUsedTones(ev.events, out);
    }
  }
}

const items = computed(() => {
  if (props.flow.legend) return props.flow.legend;
  const used = new Set<Tone>();
  for (const s of props.flow.steps) {
    collectUsedTones(s.events, used);
  }
  return Array.from(used).map((tone) => ({
    tone,
    label: TONE_LABELS[tone],
  }));
});
</script>

<template>
  <div
    v-if="items.length > 0"
    class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-secondary)]"
  >
    <span
      v-for="item in items"
      :key="`${item.tone}-${item.label}`"
      class="inline-flex items-center gap-1.5"
    >
      <span
        aria-hidden="true"
        class="inline-block h-2 w-2 rounded-full"
        :style="{ backgroundColor: TONE_VARS[item.tone] }"
      />
      <span>{{ item.label }}</span>
    </span>
  </div>
</template>
