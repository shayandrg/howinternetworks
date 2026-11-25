<script setup lang="ts">
import { computed } from "vue";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-vue-next";
import type { CompiledTimeline } from "@/engine/compile";
import type { PlaybackSpeed } from "@/engine/player";
import type { TextMode } from "@/lib/url-state";

const props = defineProps<{
  timeline: CompiledTimeline;
  t: number;
  playing: boolean;
  speed: PlaybackSpeed;
  stepIndex: number;
  mode: TextMode;
}>();

const emit = defineEmits<{
  prev: [];
  togglePlay: [];
  next: [];
  replay: [];
  seek: [t: number];
  setSpeed: [s: PlaybackSpeed];
  setMode: [m: TextMode];
  openShortcuts: [];
}>();

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 1.5, 2];

const steps = computed(() => props.timeline.steps);
const currentStep = computed(() => steps.value[props.stepIndex]);
const atStart = computed(() => props.t <= 0 && props.stepIndex === 0);
const atLastStep = computed(() => props.stepIndex >= steps.value.length - 1);

function onRangeInput(e: Event) {
  emit("seek", Number((e.target as HTMLInputElement).value));
}

function onSpeedChange(e: Event) {
  emit("setSpeed", Number((e.target as HTMLSelectElement).value) as PlaybackSpeed);
}
</script>

<template>
  <div class="mt-3 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3">
    <!-- Scrubber with step ticks -->
    <div class="relative mb-2.5 flex items-center">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2"
      >
        <span
          v-for="s in steps"
          :key="s.id"
          :style="{
            insetInlineStart: `${timeline.totalMs > 0 ? (s.startMs / timeline.totalMs) * 100 : 0}%`,
          }"
          class="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-[var(--color-muted)]/50"
        />
      </div>
      <input
        type="range"
        :min="0"
        :max="Math.max(1, Math.round(timeline.totalMs))"
        :value="Math.round(t)"
        aria-label="Timeline scrubber"
        :aria-valuetext="
          currentStep
            ? `Step ${stepIndex + 1} of ${steps.length}: ${currentStep.title}`
            : undefined
        "
        class="relative z-10 h-6 w-full cursor-pointer accent-[var(--color-accent)]"
        @input="onRangeInput"
      >
    </div>

    <!-- Controls row -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          :disabled="atStart"
          aria-label="Previous step"
          class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-raised)] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[36px] md:min-w-[36px]"
          @click="emit('prev')"
        >
          <ChevronLeft :size="18" :stroke-width="1.5" />
        </button>

        <button
          type="button"
          :aria-label="playing ? 'Pause' : 'Play'"
          class="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[8px] bg-[var(--color-btn-primary-bg)] px-4 text-[14px] font-medium text-[var(--color-btn-primary-fg)] transition-opacity duration-150 hover:opacity-90 md:min-h-[36px] md:px-3.5"
          @click="emit('togglePlay')"
        >
          <Pause v-if="playing" :size="16" :stroke-width="1.5" />
          <Play v-else :size="16" :stroke-width="1.5" />
          <span>{{ playing ? "Pause" : "Play" }}</span>
        </button>

        <button
          type="button"
          :disabled="atLastStep"
          aria-label="Next step"
          class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-raised)] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[36px] md:min-w-[36px]"
          @click="emit('next')"
        >
          <ChevronRight :size="18" :stroke-width="1.5" />
        </button>

        <button
          type="button"
          aria-label="Replay from start"
          class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)] md:min-h-[36px] md:min-w-[36px]"
          @click="emit('replay')"
        >
          <RotateCcw :size="16" :stroke-width="1.5" />
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <label class="inline-flex items-center gap-1 text-[13px] text-[var(--color-secondary)]">
          <span class="sr-only">Playback speed</span>
          <select
            :value="speed"
            aria-label="Playback speed"
            class="min-h-[44px] cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 font-mono text-[12px] text-[var(--color-primary)] md:min-h-[36px]"
            @change="onSpeedChange"
          >
            <option v-for="s in SPEEDS" :key="s" :value="s">
              {{ s }}x
            </option>
          </select>
        </label>

        <div
          role="group"
          aria-label="Explanation mode"
          class="inline-flex rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] p-0.5"
        >
          <button
            type="button"
            :aria-pressed="mode === 'simple'"
            :class="`min-h-[40px] cursor-pointer rounded-[6px] px-2.5 text-[13px] transition-colors duration-150 md:min-h-[30px] ${
              mode === 'simple'
                ? 'bg-[var(--color-card)] font-medium text-[var(--color-primary)]'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`"
            @click="emit('setMode', 'simple')"
          >
            Simple
          </button>
          <button
            type="button"
            :aria-pressed="mode === 'technical'"
            :class="`min-h-[40px] cursor-pointer rounded-[6px] px-2.5 text-[13px] transition-colors duration-150 md:min-h-[30px] ${
              mode === 'technical'
                ? 'bg-[var(--color-card)] font-medium text-[var(--color-primary)]'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`"
            @click="emit('setMode', 'technical')"
          >
            Technical
          </button>
        </div>

        <button
          type="button"
          aria-label="Keyboard shortcuts"
          class="hidden min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)] md:inline-flex"
          @click="emit('openShortcuts')"
        >
          <HelpCircle :size="16" :stroke-width="1.5" />
        </button>
      </div>
    </div>
  </div>
</template>
