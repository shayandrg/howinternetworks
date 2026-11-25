<script setup lang="ts">
import { computed } from "vue";
import type { Actor, Frame } from "@/engine/types";
import { TONE_VARS } from "@/stage/tokens";

const props = defineProps<{
  actors: Actor[];
  frameActors: Frame["actors"];
}>();

const visibleBadges = computed(() => {
  const actorMap = new Map(props.actors.map((a) => [a.id, a]));
  const out: Array<{
    id: string;
    opacity: number;
    w: number;
    h: number;
    cx: number;
    topY: number;
    color: string;
    text: string;
  }> = [];

  for (const fa of props.frameActors) {
    if (!fa.badge || fa.opacity <= 0) continue;
    const actor = actorMap.get(fa.id);
    if (!actor) continue;

    const w = Math.max(64, fa.badge.text.length * 6.5 + 16);
    const h = 20;
    const cx = Math.max(w / 2 + 8, Math.min(1000 - w / 2 - 8, actor.at.x));
    const topY = actor.at.y + (actor.sublabel ? 72 : 56);
    const color = fa.badge.tone
      ? TONE_VARS[fa.badge.tone]
      : "var(--color-secondary)";

    out.push({
      id: fa.id,
      opacity: fa.opacity,
      w,
      h,
      cx,
      topY,
      color,
      text: fa.badge.text,
    });
  }

  return out;
});
</script>

<template>
  <g aria-hidden="true">
    <g
      v-for="badge in visibleBadges"
      :key="`badge-${badge.id}`"
      :opacity="badge.opacity"
    >
      <rect
        :x="badge.cx - badge.w / 2"
        :y="badge.topY"
        :width="badge.w"
        :height="badge.h"
        :rx="5"
        fill="var(--color-card)"
      />
      <rect
        :x="badge.cx - badge.w / 2"
        :y="badge.topY"
        :width="badge.w"
        :height="badge.h"
        :rx="5"
        :fill="badge.color"
        :fill-opacity="0.1"
        :stroke="badge.color"
        :stroke-width="1.2"
      />
      <text
        :x="badge.cx"
        :y="badge.topY + 13.5"
        text-anchor="middle"
        :font-size="10.5"
        font-family="var(--font-mono), monospace"
        :font-weight="500"
        fill="var(--color-primary)"
      >
        {{ badge.text }}
      </text>
    </g>
  </g>
</template>
