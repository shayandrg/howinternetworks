<script setup lang="ts">
import type { Frame } from "@/engine/types";
import { TONE_VARS } from "@/stage/tokens";
import SvgPacketChip from "./SvgPacketChip.vue";

defineProps<{
  packets: Frame["packets"];
  hoveredPacketId?: string;
  selectedPacketId?: string;
  canSelect?: boolean;
}>();

const emit = defineEmits<{
  selectPacket: [eventId: string];
}>();

function pointsStr(trail: Array<[number, number]>): string {
  return trail.map((pt) => `${pt[0]},${pt[1]}`).join(" ");
}
</script>

<template>
  <g>
    <g v-for="pkt in packets" :key="`trail-${pkt.key}`">
      <polyline
        v-if="pkt.trail.length >= 2 && pkt.trailOpacity > 0"
        :points="pointsStr(pkt.trail)"
        fill="none"
        :stroke="TONE_VARS[pkt.tone]"
        :stroke-width="2"
        :stroke-opacity="0.4 * pkt.trailOpacity"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
    <template v-for="pkt in packets" :key="`chip-${pkt.key}`">
      <SvgPacketChip
        v-if="pkt.opacity > 0"
        :x="pkt.x"
        :y="pkt.y"
        :tone="pkt.tone"
        :label="pkt.label"
        :locked="pkt.locked"
        :opacity="pkt.opacity"
        :highlighted="hoveredPacketId === pkt.eventId || selectedPacketId === pkt.eventId"
        :clickable="canSelect"
        @select="emit('selectPacket', pkt.eventId)"
      />
    </template>
  </g>
</template>
