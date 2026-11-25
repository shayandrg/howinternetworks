<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { kitchenSinkFlow } from "@/content/flows/_kitchen-sink";
import { compileFlow } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer } from "@/engine/player";
import CaptureTable from "~/components/stage/CaptureTable.vue";
import PacketInspector, {
  type InspectedPacket,
} from "~/components/stage/PacketInspector.vue";
import SequenceView from "~/components/stage/SequenceView.vue";
import StageCanvas from "~/components/stage/StageCanvas.vue";
import { usePlayerSelector } from "~/composables/usePlayer";

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}

const timeline = compileFlow(kitchenSinkFlow);
const player = createPlayer(timeline, { mode: "continuous" });

const t = usePlayerSelector(player, (s) => s.t);
const playing = usePlayerSelector(player, (s) => s.playing);
const speed = usePlayerSelector(player, (s) => s.speed);
const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);

const view = ref<"network" | "sequence">("network");
const reducedMotion = ref(false);
const selectedPacketId = ref<string | undefined>(undefined);

onUnmounted(() => {
  player.destroy();
});

const frame = computed(() =>
  frameAt(timeline, t.value, { reducedMotion: reducedMotion.value }),
);
const activeId = computed(
  () => selectedPacketId.value ?? frame.value.currentPacketId,
);

const inspectedPacket = computed<InspectedPacket | undefined>(() => {
  const id = activeId.value;
  if (!id) return undefined;
  for (const ce of timeline.flatEvents) {
    const ev = ce.event;
    if ((ev.type === "packet" || ev.type === "stream") && ev.id === id) {
      const cap = ev.type === "packet" ? ev.capture : ev.captures?.[0];
      return {
        id: ev.id,
        label: ev.label,
        tone: ev.tone,
        locked: ev.locked,
        bytes: cap?.bytes,
        layers: ev.layers,
      };
    }
  }
  return undefined;
});

const currentStep = computed(() => kitchenSinkFlow.steps[stepIndex.value]);
const SPEEDS = [0.5, 1, 1.5, 2] as const;
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-4 px-4 py-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-medium">Stage dev: Kitchen Sink</h1>
        <p class="text-sm text-[var(--color-secondary)]">
          Step {{ stepIndex + 1 }} of {{ kitchenSinkFlow.steps.length }}:
          {{ currentStep?.title }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="cursor-pointer rounded-[8px] bg-[var(--color-btn-primary-bg)] px-3 py-1.5 text-sm font-medium text-[var(--color-btn-primary-fg)]"
          @click="player.toggle()"
        >
          {{ playing ? "Pause" : "Play" }}
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
          @click="player.replay()"
        >
          Replay
        </button>
        <button
          v-for="s in SPEEDS"
          :key="s"
          type="button"
          :class="`cursor-pointer rounded-[8px] border border-[var(--color-hairline)] px-2.5 py-1.5 text-sm ${
            speed === s ? 'bg-[var(--color-raised)] font-medium' : 'bg-[var(--color-card)]'
          }`"
          @click="player.setSpeed(s)"
        >
          {{ s }}x
        </button>
        <button
          type="button"
          class="cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
          @click="view = view === 'network' ? 'sequence' : 'network'"
        >
          View: {{ view }}
        </button>
        <label class="flex cursor-pointer items-center gap-1.5 text-sm">
          <input v-model="reducedMotion" type="checkbox">
          Reduced motion
        </label>
      </div>
    </div>

    <StageCanvas
      v-if="view === 'network'"
      :actors="kitchenSinkFlow.scene.actors"
      :links="kitchenSinkFlow.scene.links"
      :frame="frame"
      :step-title="currentStep?.title ?? 'Kitchen Sink'"
      :selected-packet-id="activeId"
      can-select
      @select-packet="(id) => (selectedPacketId = id)"
    />
    <SequenceView
      v-else
      :timeline="timeline"
      :t="t"
      :playing="playing"
      :selected-packet-id="activeId"
      can-select
      @select-packet="(id) => (selectedPacketId = id)"
    />

    <CaptureTable
      :captures="timeline.captures"
      :visible-captures="frame.visibleCaptures"
      :active-packet-id="activeId"
      @select-capture="
        (cap) => {
          player.seek(cap.startMs);
          selectedPacketId = cap.eventId;
        }
      "
    />

    <PacketInspector :packet="inspectedPacket" />
  </div>
</template>
