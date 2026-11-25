<script setup lang="ts">
import { computed } from "vue";
import type { Actor, Frame, Link } from "@/engine/types";

const props = defineProps<{
  links: Link[];
  frameLinks: Frame["links"];
  actorMap: Map<string, Actor>;
}>();

const renderedLinks = computed(() => {
  const opMap = new Map(props.frameLinks.map((l) => [l.id, l.opacity]));
  const items: Array<{
    id: string;
    medium: Link["medium"];
    opacity: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    nx: number;
    ny: number;
  }> = [];

  for (const link of props.links) {
    const opacity = opMap.get(link.id) ?? 0;
    if (opacity <= 0) continue;
    const a = props.actorMap.get(link.from);
    const b = props.actorMap.get(link.to);
    if (!a || !b) continue;

    const x1 = a.at.x;
    const y1 = a.at.y;
    const x2 = b.at.x;
    const y2 = b.at.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;

    items.push({
      id: link.id,
      medium: link.medium,
      opacity,
      x1,
      y1,
      x2,
      y2,
      nx: (-dy / len) * 2,
      ny: (dx / len) * 2,
    });
  }

  return items;
});
</script>

<template>
  <g aria-hidden="true">
    <template v-for="item in renderedLinks" :key="item.id">
      <g v-if="item.medium === 'fiber'" :opacity="item.opacity">
        <line
          :x1="item.x1 + item.nx"
          :y1="item.y1 + item.ny"
          :x2="item.x2 + item.nx"
          :y2="item.y2 + item.ny"
          stroke="var(--color-tone-data)"
          :stroke-width="1"
        />
        <line
          :x1="item.x1 - item.nx"
          :y1="item.y1 - item.ny"
          :x2="item.x2 - item.nx"
          :y2="item.y2 - item.ny"
          stroke="var(--color-tone-data)"
          :stroke-width="1"
        />
      </g>

      <g v-else-if="item.medium === 'tunnel'" :opacity="item.opacity">
        <line
          :x1="item.x1"
          :y1="item.y1"
          :x2="item.x2"
          :y2="item.y2"
          stroke="var(--color-tone-secure)"
          :stroke-opacity="0.12"
          :stroke-width="10"
          stroke-linecap="round"
        />
        <line
          :x1="item.x1"
          :y1="item.y1"
          :x2="item.x2"
          :y2="item.y2"
          stroke="var(--color-tone-secure)"
          :stroke-width="1.5"
          stroke-dasharray="5 4"
        />
      </g>

      <line
        v-else-if="item.medium === 'wifi'"
        :x1="item.x1"
        :y1="item.y1"
        :x2="item.x2"
        :y2="item.y2"
        :opacity="item.opacity"
        stroke="var(--color-secondary)"
        :stroke-width="1.5"
        stroke-dasharray="6 4"
      />

      <line
        v-else-if="item.medium === 'internet'"
        :x1="item.x1"
        :y1="item.y1"
        :x2="item.x2"
        :y2="item.y2"
        :opacity="item.opacity"
        stroke="var(--color-muted)"
        :stroke-width="1"
        stroke-dasharray="4 4"
      />

      <line
        v-else
        :x1="item.x1"
        :y1="item.y1"
        :x2="item.x2"
        :y2="item.y2"
        :opacity="item.opacity"
        stroke="var(--color-secondary)"
        :stroke-width="1.5"
      />
    </template>
  </g>
</template>
