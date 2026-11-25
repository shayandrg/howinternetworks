<script setup lang="ts">
import { computed } from "vue";
import type { Tone } from "@/engine/types";
import { parseRichText } from "@/lib/rich-text";
import PacketChip from "~/components/stage/PacketChip.vue";
import GlossaryTerm from "./GlossaryTerm.vue";

export interface PacketChipMeta {
  id: string;
  label: string;
  tone: Tone;
  locked?: boolean;
}

const props = defineProps<{
  text: string;
  packetsById?: Map<string, PacketChipMeta>;
  hoveredPacketId?: string;
}>();

const emit = defineEmits<{
  hoverPacket: [id: string | undefined];
  selectPacket: [id: string];
}>();

const segments = computed(() => parseRichText(props.text));
</script>

<template>
  <template v-for="(seg, i) in segments" :key="i">
    <span v-if="seg.type === 'text'">{{ seg.text }}</span>
    <code
      v-else-if="seg.type === 'code'"
      class="rounded-[4px] bg-[var(--color-raised)] px-1.5 py-0.5 font-mono text-[0.88em] [overflow-wrap:anywhere] text-[var(--color-primary)]"
    >{{ seg.text }}</code>
    <GlossaryTerm
      v-else-if="seg.type === 'glossary'"
      :id="seg.id"
      :label="seg.label"
    />
    <code
      v-else-if="!packetsById?.get(seg.id)"
      class="rounded-[4px] bg-[var(--color-raised)] px-1 py-0.5 font-mono text-[0.85em]"
    >{{ seg.id }}</code>
    <span v-else class="mx-0.5 inline-block align-middle">
      <PacketChip
        :tone="packetsById.get(seg.id)!.tone"
        :label="packetsById.get(seg.id)!.label"
        :locked="packetsById.get(seg.id)!.locked"
        :active="hoveredPacketId === seg.id"
        interactive
        @mouseenter="emit('hoverPacket', seg.id)"
        @mouseleave="emit('hoverPacket', undefined)"
        @focus="emit('hoverPacket', seg.id)"
        @blur="emit('hoverPacket', undefined)"
        @click="emit('selectPacket', seg.id)"
      />
    </span>
  </template>
</template>
