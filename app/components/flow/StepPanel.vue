<script setup lang="ts">
import type { Step } from "@/engine/types";
import type { TextMode } from "@/lib/url-state";
import PacketInspector, {
  type InspectedPacket,
} from "~/components/stage/PacketInspector.vue";
import RichText, { type PacketChipMeta } from "./RichText.vue";

defineProps<{
  step: Step;
  stepIndex: number;
  totalSteps: number;
  mode: TextMode;
  packetsById: Map<string, PacketChipMeta>;
  hoveredPacketId?: string;
  inspectedPacket?: InspectedPacket;
}>();

const emit = defineEmits<{
  hoverPacket: [id: string | undefined];
  selectPacket: [id: string];
  prev: [];
  next: [];
}>();
</script>

<template>
  <aside
    aria-label="Current step"
    class="w-full shrink-0 rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 desktop:w-[360px]"
  >
    <div class="text-[12px] font-medium text-[var(--color-muted)] tabular-nums">
      Step {{ stepIndex + 1 }} of {{ totalSteps }}
    </div>
    <h2 class="mt-0.5 text-[20px] font-medium leading-tight text-[var(--color-primary)]">
      {{ step.title }}
    </h2>

    <p class="mt-3 text-[17px] leading-[26px] text-[var(--color-primary)]">
      <RichText
        :text="step.simple"
        :packets-by-id="packetsById"
        :hovered-packet-id="hoveredPacketId"
        @hover-packet="(id) => emit('hoverPacket', id)"
        @select-packet="(id) => emit('selectPacket', id)"
      />
    </p>

    <div
      v-if="mode === 'technical'"
      class="mt-3 rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] p-3"
    >
      <div class="mb-1 text-[12px] font-medium text-[var(--color-muted)]">
        Technical detail
      </div>
      <p class="text-[14px] leading-[21px] text-[var(--color-secondary)]">
        <RichText
          :text="step.technical"
          :packets-by-id="packetsById"
          :hovered-packet-id="hoveredPacketId"
          @hover-packet="(id) => emit('hoverPacket', id)"
          @select-packet="(id) => emit('selectPacket', id)"
        />
      </p>
    </div>

    <dl
      v-if="step.facts && step.facts.length > 0"
      class="mt-3 space-y-1.5 border-t border-[var(--color-hairline)] pt-3"
    >
      <div
        v-for="fact in step.facts"
        :key="fact.label"
        class="flex items-baseline justify-between gap-3 text-[13px]"
      >
        <dt class="text-[var(--color-muted)]">{{ fact.label }}</dt>
        <dd class="text-end font-mono text-[12px] text-[var(--color-primary)]">
          {{ fact.value }}
        </dd>
      </div>
    </dl>

    <!-- Mobile Back / Next controls -->
    <div class="mt-4 flex gap-2 md:hidden">
      <button
        type="button"
        :disabled="stepIndex === 0"
        class="min-h-[44px] flex-1 cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] text-[14px] font-medium text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        @click="emit('prev')"
      >
        Back
      </button>
      <button
        type="button"
        :disabled="stepIndex >= totalSteps - 1"
        class="min-h-[44px] flex-1 cursor-pointer rounded-[8px] bg-[var(--color-btn-primary-bg)] text-[14px] font-medium text-[var(--color-btn-primary-fg)] disabled:cursor-not-allowed disabled:opacity-40"
        @click="emit('next')"
      >
        Next
      </button>
    </div>

    <PacketInspector :packet="inspectedPacket" />
  </aside>
</template>
