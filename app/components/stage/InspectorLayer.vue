<script setup lang="ts">
import { computed } from "vue";
import { Lock } from "lucide-vue-next";
import type { Layer } from "@/engine/types";

defineOptions({ name: "InspectorLayer" });

const props = defineProps<{
  layers: Layer[];
  index: number;
  othersView: boolean;
  bytes?: number;
}>();

const layer = computed(() => props.layers[props.index]);
const isCollapsedEncrypted = computed(
  () => props.othersView && Boolean(layer.value?.encrypted),
);
</script>

<template>
  <div
    v-if="layer"
    class="mt-2 rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-2.5 ps-3"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="shrink-0 text-[13px] font-medium text-[var(--color-primary)]">
        {{ isCollapsedEncrypted ? "Encrypted" : layer.name }}
      </span>
      <span
        v-if="isCollapsedEncrypted"
        class="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--color-tone-secure)]"
      >
        <Lock :size="14" :stroke-width="1.5" />
        {{ bytes ? `${bytes} B` : layer.summary ?? "Protected" }}
      </span>
      <span
        v-else-if="layer.summary"
        class="truncate font-mono text-[11px] text-[var(--color-muted)]"
      >
        {{ layer.summary }}
      </span>
    </div>

    <dl v-if="!isCollapsedEncrypted" class="mt-2 space-y-1">
      <div
        v-for="(field, fi) in layer.fields"
        :key="`${field.name}-${fi}`"
        class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 text-[12px] leading-4"
      >
        <dt class="text-[var(--color-secondary)]">{{ field.name }}</dt>
        <dd class="break-all font-mono text-[var(--color-primary)]">
          {{ field.value }}
        </dd>
      </div>
    </dl>

    <InspectorLayer
      v-if="!isCollapsedEncrypted && index + 1 < layers.length"
      :layers="layers"
      :index="index + 1"
      :others-view="othersView"
      :bytes="bytes"
    />
  </div>
</template>
