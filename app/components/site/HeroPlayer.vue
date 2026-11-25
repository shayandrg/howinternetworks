<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { Pause, Play, RotateCcw } from "lucide-vue-next";
import type { Flow } from "@/content/schema";
import { compileFlow } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer } from "@/engine/player";
import StageCanvas from "~/components/stage/StageCanvas.vue";
import { usePlayerSelector } from "~/composables/usePlayer";

const props = defineProps<{
  flow: Flow;
}>();

const timeline = computed(() => compileFlow(props.flow));
const player = createPlayer(timeline.value, { mode: "continuous" });

const t = usePlayerSelector(player, (s) => s.t);
const playing = usePlayerSelector(player, (s) => s.playing);
const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);

const reducedMotion = ref(false);
const wrapRef = ref<HTMLDivElement | null>(null);
const hasAutoStarted = ref(false);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = mq.matches;

  if (mq.matches) {
    const step0End = timeline.value.steps[0]?.endMs ?? 0;
    player.seek(step0End);
  } else if (wrapRef.value && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAutoStarted.value) {
          hasAutoStarted.value = true;
          player.play();
          observer?.disconnect();
          observer = null;
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(wrapRef.value);
  }
});

onUnmounted(() => {
  observer?.disconnect();
  player.destroy();
});

const frame = computed(() =>
  frameAt(timeline.value, t.value, { reducedMotion: reducedMotion.value }),
);
const ended = computed(() => t.value >= timeline.value.totalMs - 1);
const currentStep = computed(
  () => (props.flow.steps[stepIndex.value] ?? props.flow.steps[0])!,
);
</script>

<template>
  <div
    ref="wrapRef"
    class="rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3"
  >
    <div class="mb-2 flex items-center justify-between gap-2 px-1">
      <NuxtLink
        :to="`/learn/${flow.meta.slug}/`"
        class="text-[13px] font-medium text-[var(--color-primary)] hover:underline"
      >
        {{ flow.meta.title }}: {{ currentStep.title }}
      </NuxtLink>

      <button
        v-if="ended"
        type="button"
        class="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2.5 text-[12px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-raised)]"
        @click="player.replay()"
      >
        <RotateCcw :size="14" :stroke-width="1.5" />
        <span>Replay</span>
      </button>
      <button
        v-else-if="playing"
        type="button"
        class="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2.5 text-[12px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-raised)]"
        @click="player.pause()"
      >
        <Pause :size="14" :stroke-width="1.5" />
        <span>Pause</span>
      </button>
      <button
        v-else
        type="button"
        class="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-[8px] bg-[var(--color-btn-primary-bg)] px-2.5 text-[12px] font-medium text-[var(--color-btn-primary-fg)]"
        @click="player.play()"
      >
        <Play :size="14" :stroke-width="1.5" />
        <span>Play</span>
      </button>
    </div>

    <StageCanvas
      :actors="flow.scene.actors"
      :links="flow.scene.links"
      :frame="frame"
      :step-title="currentStep.title"
    />
  </div>
</template>
