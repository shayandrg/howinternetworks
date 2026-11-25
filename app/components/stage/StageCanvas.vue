<script setup lang="ts">
import { computed } from "vue";
import type { Actor, Frame, Link } from "@/engine/types";
import ActorIcon from "./ActorIcon.vue";
import BadgesLayer from "./BadgesLayer.vue";
import LinksLayer from "./LinksLayer.vue";
import MarkersLayer from "./MarkersLayer.vue";
import NotesLayer from "./NotesLayer.vue";
import PacketsLayer from "./PacketsLayer.vue";
import ScreensLayer from "./ScreensLayer.vue";

const props = defineProps<{
  actors: Actor[];
  links: Link[];
  frame: Frame;
  stepTitle: string;
  hoveredPacketId?: string;
  selectedPacketId?: string;
  canSelect?: boolean;
}>();

const emit = defineEmits<{
  selectPacket: [eventId: string];
}>();

const actorMap = computed(() => new Map(props.actors.map((a) => [a.id, a])));
const frameActorMap = computed(
  () => new Map(props.frame.actors.map((fa) => [fa.id, fa])),
);
const viewBox = computed(
  () =>
    `${props.frame.camera.x} ${props.frame.camera.y} ${props.frame.camera.w} ${props.frame.camera.h}`,
);

const visibleActors = computed(() => {
  const out: Array<{
    actor: Actor;
    opacity: number;
    pulse: number;
    highlight: number;
  }> = [];

  for (const actor of props.actors) {
    const fa = frameActorMap.value.get(actor.id);
    const opacity = fa?.opacity ?? 0;
    if (opacity <= 0) continue;
    out.push({
      actor,
      opacity,
      pulse: fa?.pulse ?? 0,
      highlight: fa?.highlight ?? 0,
    });
  }

  return out;
});
</script>

<template>
  <div class="w-full overflow-hidden rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-stage)]">
    <svg
      :viewBox="viewBox"
      role="img"
      :aria-label="stepTitle"
      preserveAspectRatio="xMidYMid meet"
      class="block aspect-[4/3] w-full select-none md:aspect-[5/3]"
    >
      <LinksLayer
        :links="links"
        :frame-links="frame.links"
        :actor-map="actorMap"
      />

      <g>
        <g
          v-for="item in visibleActors"
          :key="item.actor.id"
          :transform="`translate(${item.actor.at.x}, ${item.actor.at.y})`"
          :opacity="item.opacity"
        >
          <circle
            v-if="item.highlight > 0"
            :cx="0"
            :cy="0"
            :r="40"
            fill="none"
            stroke="var(--color-accent)"
            :stroke-width="2"
            :stroke-opacity="item.highlight * 0.8"
          />
          <circle
            v-if="item.pulse > 0"
            :cx="0"
            :cy="0"
            :r="28 + item.pulse * 14"
            fill="none"
            stroke="var(--color-accent)"
            :stroke-width="1.75"
            :stroke-opacity="0.5 * (1 - item.pulse)"
          />
          <ActorIcon :kind="item.actor.kind" />
          <text
            :x="0"
            :y="42"
            text-anchor="middle"
            :font-size="13"
            font-family="var(--font-sans), sans-serif"
            :font-weight="500"
            fill="var(--color-primary)"
          >
            {{ item.actor.label }}
          </text>
          <text
            v-if="item.actor.sublabel"
            :x="0"
            :y="58"
            text-anchor="middle"
            :font-size="12"
            font-family="var(--font-mono), monospace"
            fill="var(--color-muted)"
          >
            {{ item.actor.sublabel }}
          </text>
        </g>
      </g>

      <ScreensLayer :actors="actors" :frame-actors="frame.actors" />
      <BadgesLayer :actors="actors" :frame-actors="frame.actors" />
      <PacketsLayer
        :packets="frame.packets"
        :hovered-packet-id="hoveredPacketId"
        :selected-packet-id="selectedPacketId"
        :can-select="canSelect"
        @select-packet="(id) => emit('selectPacket', id)"
      />
      <MarkersLayer :markers="frame.markers" />
      <NotesLayer :notes="frame.notes" :actor-map="actorMap" />
    </svg>
  </div>
</template>
