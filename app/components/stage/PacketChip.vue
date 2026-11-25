<script setup lang="ts">
import { computed } from "vue";
import type { Tone } from "@/engine/types";
import { TONE_VARS } from "@/stage/tokens";

const props = withDefaults(
  defineProps<{
    tone: Tone;
    label: string;
    locked?: boolean;
    active?: boolean;
    interactive?: boolean;
  }>(),
  {
    locked: false,
    active: false,
    interactive: false,
  },
);

const emit = defineEmits<{
  click: [];
  mouseenter: [];
  mouseleave: [];
  focus: [];
  blur: [];
}>();

const color = computed(() => TONE_VARS[props.tone]);
const chipStyle = computed(() => ({
  borderColor: color.value,
  backgroundColor: `color-mix(in srgb, ${color.value} 12%, var(--color-stage))`,
  outline: props.active ? "2px solid var(--color-accent)" : undefined,
  outlineOffset: props.active ? "2px" : undefined,
}));
</script>

<template>
  <button
    v-if="interactive"
    type="button"
    :style="chipStyle"
    class="inline-flex h-[22px] cursor-pointer items-center gap-1.5 rounded-[6px] border-[1.5px] px-2 align-middle transition-colors duration-150"
    @click="emit('click')"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
    @focus="emit('focus')"
    @blur="emit('blur')"
  >
    <span
      aria-hidden="true"
      class="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      :style="{ backgroundColor: color }"
    />
    <svg
      v-if="locked"
      aria-hidden="true"
      width="10"
      height="11"
      viewBox="0 0 10 11"
      class="shrink-0"
    >
      <rect
        x="1"
        y="4.5"
        width="8"
        height="5.5"
        rx="1"
        fill="none"
        :stroke="color"
        stroke-width="1.3"
      />
      <path
        d="M3 4.5 V3 A2 2 0 0 1 7 3 V4.5"
        fill="none"
        :stroke="color"
        stroke-width="1.3"
      />
    </svg>
    <span class="font-mono text-[11px] font-medium leading-none text-[var(--color-primary)]">
      {{ label }}
    </span>
  </button>
  <span
    v-else
    :style="chipStyle"
    class="inline-flex h-[22px] items-center gap-1.5 rounded-[6px] border-[1.5px] px-2 align-middle"
  >
    <span
      aria-hidden="true"
      class="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      :style="{ backgroundColor: color }"
    />
    <svg
      v-if="locked"
      aria-hidden="true"
      width="10"
      height="11"
      viewBox="0 0 10 11"
      class="shrink-0"
    >
      <rect
        x="1"
        y="4.5"
        width="8"
        height="5.5"
        rx="1"
        fill="none"
        :stroke="color"
        stroke-width="1.3"
      />
      <path
        d="M3 4.5 V3 A2 2 0 0 1 7 3 V4.5"
        fill="none"
        :stroke="color"
        stroke-width="1.3"
      />
    </svg>
    <span class="font-mono text-[11px] font-medium leading-none text-[var(--color-primary)]">
      {{ label }}
    </span>
  </span>
</template>
