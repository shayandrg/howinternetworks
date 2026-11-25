<script setup lang="ts">
import { computed } from "vue";
import type { Actor, Frame } from "@/engine/types";
import { TONE_VARS } from "@/stage/tokens";

const props = defineProps<{
  notes: Frame["notes"];
  actorMap: Map<string, Actor>;
}>();

const visibleNotes = computed(() => {
  const out: Array<{
    id: string;
    actorX: number;
    actorY: number;
    w: number;
    h: number;
    boxCenterX: number;
    boxBottomY: number;
    boxTopY: number;
    border: string;
    opacity: number;
    text: string;
  }> = [];

  for (const note of props.notes) {
    const actor = props.actorMap.get(note.at);
    if (!actor || note.opacity <= 0) continue;

    const w = Math.max(88, note.text.length * 6.8 + 20);
    const h = 24;
    const boxCenterX = Math.max(
      w / 2 + 12,
      Math.min(1000 - w / 2 - 12, actor.at.x),
    );
    const boxBottomY = actor.at.y - 48 - note.rise;
    const boxTopY = boxBottomY - h;
    const border = note.tone
      ? TONE_VARS[note.tone]
      : "var(--color-secondary)";

    out.push({
      id: note.id,
      actorX: actor.at.x,
      actorY: actor.at.y,
      w,
      h,
      boxCenterX,
      boxBottomY,
      boxTopY,
      border,
      opacity: note.opacity,
      text: note.text,
    });
  }

  return out;
});
</script>

<template>
  <g aria-hidden="true">
    <g
      v-for="note in visibleNotes"
      :key="note.id"
      :opacity="note.opacity"
    >
      <line
        :x1="note.actorX"
        :y1="note.actorY - 34"
        :x2="note.boxCenterX"
        :y2="note.boxBottomY"
        :stroke="note.border"
        :stroke-width="1.2"
      />
      <rect
        :x="note.boxCenterX - note.w / 2"
        :y="note.boxTopY"
        :width="note.w"
        :height="note.h"
        :rx="6"
        fill="var(--color-card)"
        :stroke="note.border"
        :stroke-width="1.5"
      />
      <text
        :x="note.boxCenterX"
        :y="note.boxTopY + 15.5"
        text-anchor="middle"
        :font-size="11"
        font-family="var(--font-sans), sans-serif"
        :font-weight="500"
        fill="var(--color-primary)"
      >
        {{ note.text }}
      </text>
    </g>
  </g>
</template>
