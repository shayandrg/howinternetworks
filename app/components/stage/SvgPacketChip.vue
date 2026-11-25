<script setup lang="ts">
import { computed } from "vue";
import type { Tone } from "@/engine/types";
import { measureChipWidth, TONE_VARS } from "@/stage/tokens";

const props = withDefaults(
  defineProps<{
    x: number;
    y: number;
    tone: Tone;
    label: string;
    locked?: boolean;
    opacity?: number;
    highlighted?: boolean;
    clickable?: boolean;
  }>(),
  {
    opacity: 1,
    highlighted: false,
    clickable: false,
  },
);

const emit = defineEmits<{
  select: [];
}>();

const h = 22;
const color = computed(() => TONE_VARS[props.tone]);
const w = computed(() => measureChipWidth(props.label, props.locked));
const left = computed(() => -w.value / 2);
const top = -h / 2;
</script>

<template>
  <g
    :transform="`translate(${x}, ${y})`"
    :opacity="opacity"
    :style="clickable ? { cursor: 'pointer' } : undefined"
    @click="clickable ? emit('select') : undefined"
  >
    <rect
      v-if="highlighted"
      :x="left - 3"
      :y="top - 3"
      :width="w + 6"
      :height="h + 6"
      :rx="8"
      fill="none"
      stroke="var(--color-accent)"
      :stroke-width="2"
    />
    <rect
      :x="left"
      :y="top"
      :width="w"
      :height="h"
      :rx="6"
      fill="var(--color-stage)"
    />
    <rect
      :x="left"
      :y="top"
      :width="w"
      :height="h"
      :rx="6"
      :fill="color"
      :fill-opacity="0.12"
      :stroke="color"
      :stroke-width="1.5"
    />
    <circle :cx="left + 11" :cy="0" :r="3" :fill="color" />
    <g v-if="locked" :transform="`translate(${left + 19}, -5)`">
      <rect
        :x="0"
        :y="4"
        :width="8"
        :height="6"
        :rx="1"
        fill="none"
        :stroke="color"
        :stroke-width="1.2"
      />
      <path
        d="M2 4 V2.5 A2 2 0 0 1 6 2.5 V4"
        fill="none"
        :stroke="color"
        :stroke-width="1.2"
      />
    </g>
    <text
      :x="left + 18 + (locked ? 12 : 0)"
      :y="3.5"
      :font-size="11"
      font-family="var(--font-mono), monospace"
      :font-weight="500"
      fill="var(--color-primary)"
    >
      {{ label }}
    </text>
  </g>
</template>
