<script setup lang="ts">
import type { Frame } from "@/engine/types";

defineProps<{
  markers: Frame["markers"];
}>();
</script>

<template>
  <g aria-hidden="true">
    <g
      v-for="m in markers"
      :key="m.key"
      :transform="`translate(${m.x}, ${m.y})`"
    >
      <circle
        :cx="0"
        :cy="0"
        :r="9"
        fill="var(--color-stage)"
        stroke="var(--color-tone-error)"
        :stroke-width="1.5"
      />
      <line
        :x1="-5"
        :y1="-5"
        :x2="5"
        :y2="5"
        stroke="var(--color-tone-error)"
        :stroke-width="2.2"
        stroke-linecap="round"
      />
      <line
        :x1="5"
        :y1="-5"
        :x2="-5"
        :y2="5"
        stroke="var(--color-tone-error)"
        :stroke-width="2.2"
        stroke-linecap="round"
      />
    </g>
  </g>
</template>
