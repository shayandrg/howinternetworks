<script setup lang="ts">
import { ref } from "vue";
import type { Layer, Tone } from "@/engine/types";
import InspectorLayer from "./InspectorLayer.vue";
import PacketChip from "./PacketChip.vue";

export interface InspectedPacket {
  id: string;
  label: string;
  tone: Tone;
  locked?: boolean;
  bytes?: number;
  layers?: Layer[];
}

defineProps<{
  packet?: InspectedPacket;
}>();

const othersView = ref(false);
</script>

<template>
  <section
    aria-label="Packet inspector"
    class="mt-4 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] p-3"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-[14px] font-medium text-[var(--color-primary)]">
        What's inside
      </h3>
      <PacketChip
        v-if="packet"
        :tone="packet.tone"
        :label="packet.label"
        :locked="packet.locked"
      />
    </div>

    <label class="mt-2.5 flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-secondary)]">
      <input
        v-model="othersView"
        type="checkbox"
        class="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
      >
      <span>What others on the network can see</span>
    </label>

    <p v-if="!packet" class="mt-3 text-[13px] text-[var(--color-muted)]">
      Play a step or select a captured packet to inspect its layers.
    </p>
    <p
      v-else-if="!packet.layers || packet.layers.length === 0"
      class="mt-3 text-[13px] text-[var(--color-muted)]"
    >
      No layer details for this message yet.
    </p>
    <div v-else class="mt-2">
      <InspectorLayer
        :layers="packet.layers"
        :index="0"
        :others-view="othersView"
        :bytes="packet.bytes"
      />
    </div>
  </section>
</template>
