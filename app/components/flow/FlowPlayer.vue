<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AlertCircle, ExternalLink } from "lucide-vue-next";
import type { Flow } from "@/content/schema";
import { compileFlow, type CompiledTimeline } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer } from "@/engine/player";
import type { StageEvent, Step } from "@/engine/types";
import { shouldIgnoreKeyEvent } from "@/lib/keyboard";
import { stripMarkup } from "@/lib/rich-text";
import {
  readUrlState,
  writeUrlState,
  type StageViewMode,
  type TextMode,
} from "@/lib/url-state";
import { siteConfig } from "@/site.config";
import CaptureTable from "~/components/stage/CaptureTable.vue";
import type { InspectedPacket } from "~/components/stage/PacketInspector.vue";
import SequenceView from "~/components/stage/SequenceView.vue";
import StageCanvas from "~/components/stage/StageCanvas.vue";
import { usePlayerSelector } from "~/composables/usePlayer";
import FactsGrid from "./FactsGrid.vue";
import FlowLegend from "./FlowLegend.vue";
import RichText, { type PacketChipMeta } from "./RichText.vue";
import ShortcutsDialog from "./ShortcutsDialog.vue";
import SourcesList from "./SourcesList.vue";
import StepPanel from "./StepPanel.vue";
import StepRail from "./StepRail.vue";
import TransportBar from "./TransportBar.vue";
import TryItBox from "./TryItBox.vue";

export interface RelatedTopicLink {
  slug: string;
  title: string;
  tagline: string;
}

const props = defineProps<{
  flow: Flow;
  relatedTopics: RelatedTopicLink[];
}>();

function collectStepPackets(
  step: Step | undefined,
): Map<string, PacketChipMeta> {
  const map = new Map<string, PacketChipMeta>();
  if (!step) return map;
  const walk = (events: StageEvent[]) => {
    for (const ev of events) {
      if (ev.type === "packet" || ev.type === "stream") {
        map.set(ev.id, {
          id: ev.id,
          label: ev.label,
          tone: ev.tone,
          locked: ev.locked,
        });
      } else if (ev.type === "together") {
        walk(ev.events);
      }
    }
  };
  walk(step.events);
  return map;
}

function findInspectedPacket(
  tl: CompiledTimeline,
  activeId: string | undefined,
): InspectedPacket | undefined {
  if (!activeId) return undefined;
  for (const ce of tl.flatEvents) {
    const ev = ce.event;
    if ((ev.type === "packet" || ev.type === "stream") && ev.id === activeId) {
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
}

function findEventStart(
  tl: CompiledTimeline,
  eventId: string,
): number | undefined {
  const found = tl.flatEvents.find(
    (ce) =>
      (ce.event.type === "packet" || ce.event.type === "stream") &&
      ce.event.id === eventId,
  );
  return found?.startMs;
}

const route = useRoute();
const router = useRouter();
const timeline = computed(() => compileFlow(props.flow));
const player = createPlayer(timeline.value, { mode: "step" });

const t = usePlayerSelector(player, (s) => s.t);
const playing = usePlayerSelector(player, (s) => s.playing);
const speed = usePlayerSelector(player, (s) => s.speed);
const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);

const mode = ref<TextMode>("simple");
const view = ref<StageViewMode>("network");
const reducedMotion = ref(false);
const selectedPacketId = ref<string | undefined>(undefined);
const hoveredPacketId = ref<string | undefined>(undefined);
const shortcutsOpen = ref(false);
const urlInitialized = ref(false);

let cleanupEvents: (() => void) | null = null;
let unmounted = false;

function readInitialState() {
  const fromWindow = readUrlState();
  const qStep = route.query.step;
  const rawStep = Array.isArray(qStep) ? qStep[0] : qStep;
  const parsedStep = rawStep ? Number.parseInt(String(rawStep), 10) : NaN;
  const routeStep =
    Number.isInteger(parsedStep) && parsedStep >= 1 ? parsedStep : undefined;

  const qMode = Array.isArray(route.query.mode)
    ? route.query.mode[0]
    : route.query.mode;
  const routeMode =
    qMode === "simple" || qMode === "technical" ? qMode : undefined;

  const qView = Array.isArray(route.query.view)
    ? route.query.view[0]
    : route.query.view;
  const routeView =
    qView === "network" || qView === "sequence" ? qView : undefined;

  return {
    step: fromWindow.step ?? routeStep,
    mode: fromWindow.mode ?? routeMode,
    view: fromWindow.view ?? routeView,
  };
}

function applyInitialState() {
  const initial = readInitialState();
  if (initial.step !== undefined) {
    player.goTo(initial.step - 1);
  }
  if (initial.mode) {
    mode.value = initial.mode;
  }
  if (initial.view) {
    view.value = initial.view;
  }
}

onMounted(() => {
  applyInitialState();
  router.isReady().then(() => {
    if (unmounted) return;
    applyInitialState();
    urlInitialized.value = true;
  });

  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = mq.matches;
  const onMqChange = () => {
    reducedMotion.value = mq.matches;
  };
  mq.addEventListener("change", onMqChange);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (shouldIgnoreKeyEvent(e.target)) return;

    if (e.key === " ") {
      e.preventDefault();
      player.toggle();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      selectedPacketId.value = undefined;
      player.next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectedPacketId.value = undefined;
      player.prev();
    } else if (e.key === "Home") {
      e.preventDefault();
      selectedPacketId.value = undefined;
      player.goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      selectedPacketId.value = undefined;
      player.goTo(props.flow.steps.length - 1);
    } else if (e.key >= "1" && e.key <= "9") {
      const idx = Number(e.key) - 1;
      if (idx < props.flow.steps.length) {
        e.preventDefault();
        selectedPacketId.value = undefined;
        player.goTo(idx);
      }
    } else if (e.key.toLowerCase() === "m") {
      e.preventDefault();
      mode.value = mode.value === "simple" ? "technical" : "simple";
    } else if (e.key.toLowerCase() === "v") {
      e.preventDefault();
      view.value = view.value === "network" ? "sequence" : "network";
    } else if (e.key === "?") {
      e.preventDefault();
      shortcutsOpen.value = !shortcutsOpen.value;
    }
  };

  window.addEventListener("keydown", onKeyDown);

  cleanupEvents = () => {
    mq.removeEventListener("change", onMqChange);
    window.removeEventListener("keydown", onKeyDown);
  };
});

onUnmounted(() => {
  unmounted = true;
  cleanupEvents?.();
  player.destroy();
});

watch([stepIndex, mode, view], ([nextStep, nextMode, nextView]) => {
  if (!urlInitialized.value) return;
  writeUrlState({ step: nextStep + 1, mode: nextMode, view: nextView });
});

const frame = computed(() =>
  frameAt(timeline.value, t.value, { reducedMotion: reducedMotion.value }),
);
const currentStep = computed(
  () => (props.flow.steps[stepIndex.value] ?? props.flow.steps[0])!,
);
const packetsById = computed(() => collectStepPackets(currentStep.value));
const activePacketId = computed(
  () => selectedPacketId.value ?? frame.value.currentPacketId,
);
const inspectedPacket = computed(() =>
  findInspectedPacket(timeline.value, activePacketId.value),
);
const finished = computed(() => t.value >= timeline.value.totalMs - 1);

const editUrl = computed(() =>
  siteConfig.editPattern.replace("{slug}", props.flow.meta.slug),
);
const reportUrl = computed(() => {
  const issueTitle = `[${props.flow.meta.slug}/${currentStep.value.id}] `;
  return `${siteConfig.newIssueUrl}?template=report-an-error.yml&title=${encodeURIComponent(issueTitle)}`;
});
</script>

<template>
  <div>
    <!-- Live announcement for assistive tech -->
    <div aria-live="polite" class="sr-only">
      {{ `Step ${stepIndex + 1} of ${flow.steps.length}: ${currentStep.title}. ${stripMarkup(currentStep.simple)}` }}
    </div>

    <!-- Main player -->
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[220px_minmax(0,1fr)_360px]">
      <StepRail
        :steps="flow.steps"
        :step-index="stepIndex"
        :finished="finished"
        @select-step="
          (idx) => {
            selectedPacketId = undefined;
            player.goTo(idx);
          }
        "
      />

      <div class="w-full min-w-0 flex-1">
        <div class="sticky top-0 z-10 bg-[var(--color-page-bg)] pb-2 md:static md:pb-0">
          <!-- View switch above stage -->
          <div class="mb-2 flex items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Stage view"
              class="inline-flex rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-0.5"
            >
              <button
                type="button"
                role="tab"
                :aria-selected="view === 'network'"
                :class="`cursor-pointer rounded-[6px] px-3 py-1 text-[13px] transition-colors duration-150 ${
                  view === 'network'
                    ? 'bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`"
                @click="view = 'network'"
              >
                Network
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="view === 'sequence'"
                :class="`cursor-pointer rounded-[6px] px-3 py-1 text-[13px] transition-colors duration-150 ${
                  view === 'sequence'
                    ? 'bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`"
                @click="view = 'sequence'"
              >
                Sequence
              </button>
            </div>

            <span class="font-mono text-[12px] tabular-nums text-[var(--color-muted)]">
              {{ (t / 1000).toFixed(1) }} s / {{ (timeline.totalMs / 1000).toFixed(1) }} s
            </span>
          </div>

          <StageCanvas
            v-if="view === 'network'"
            :actors="flow.scene.actors"
            :links="flow.scene.links"
            :frame="frame"
            :step-title="currentStep.title"
            :hovered-packet-id="hoveredPacketId"
            :selected-packet-id="activePacketId"
            can-select
            @select-packet="(id) => (selectedPacketId = id)"
          />
          <SequenceView
            v-else
            :timeline="timeline"
            :t="t"
            :playing="playing"
            :hovered-packet-id="hoveredPacketId"
            :selected-packet-id="activePacketId"
            can-select
            @select-packet="(id) => (selectedPacketId = id)"
          />
        </div>

        <TransportBar
          :timeline="timeline"
          :t="t"
          :playing="playing"
          :speed="speed"
          :step-index="stepIndex"
          :mode="mode"
          @prev="
            selectedPacketId = undefined;
            player.prev();
          "
          @toggle-play="player.toggle()"
          @next="
            selectedPacketId = undefined;
            player.next();
          "
          @replay="
            selectedPacketId = undefined;
            player.replay();
          "
          @seek="
            (nextT) => {
              selectedPacketId = undefined;
              player.seek(nextT);
            }
          "
          @set-speed="(s) => player.setSpeed(s)"
          @set-mode="(m) => (mode = m)"
          @open-shortcuts="shortcutsOpen = true"
        />

        <FlowLegend :flow="flow" />
      </div>

      <StepPanel
        :step="currentStep"
        :step-index="stepIndex"
        :total-steps="flow.steps.length"
        :mode="mode"
        :packets-by-id="packetsById"
        :hovered-packet-id="hoveredPacketId"
        :inspected-packet="inspectedPacket"
        @hover-packet="(id) => (hoveredPacketId = id)"
        @select-packet="
          (id) => {
            selectedPacketId = id;
            const start = findEventStart(timeline, id);
            if (start !== undefined) {
              player.seek(start);
            }
          }
        "
        @prev="
          selectedPacketId = undefined;
          player.prev();
        "
        @next="
          selectedPacketId = undefined;
          player.next();
        "
      />
    </div>

    <!-- Full-width capture table -->
    <CaptureTable
      :captures="timeline.captures"
      :visible-captures="frame.visibleCaptures"
      :active-packet-id="activePacketId"
      @select-capture="
        (cap) => {
          player.seek(cap.startMs);
          selectedPacketId = cap.eventId;
        }
      "
    />

    <!-- Outro highlight shown right after last step finishes -->
    <div
      v-if="finished"
      class="mt-6 rounded-[12px] border border-[var(--color-positive)]/35 bg-[var(--color-card)] p-4"
    >
      <div class="text-[12px] font-medium text-[var(--color-positive)]">
        Completed
      </div>
      <h3 class="mt-0.5 text-[18px] font-medium text-[var(--color-primary)]">
        {{ flow.outro.title }}
      </h3>
      <p class="mt-1.5 text-[15px] leading-[22px] text-[var(--color-secondary)]">
        {{ mode === "technical" ? flow.outro.technical : flow.outro.simple }}
      </p>
    </div>

    <!-- Lower reference sections -->
    <div class="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="min-w-0 space-y-8">
        <div
          v-if="flow.meta.status === 'draft' && flow.meta.reviewNotes?.length"
          class="rounded-[12px] border border-[var(--color-tone-request)]/40 bg-[var(--color-card)] p-4"
        >
          <div class="flex items-center gap-2 text-[14px] font-medium text-[var(--color-primary)]">
            <AlertCircle :size="16" :stroke-width="1.5" />
            <span>Draft topic: verification notes</span>
          </div>
          <ul class="mt-2 list-disc space-y-1 ps-5 text-[13px] text-[var(--color-secondary)]">
            <li v-for="(note, i) in flow.meta.reviewNotes" :key="i">
              {{ note }}
            </li>
          </ul>
        </div>

        <section aria-labelledby="intro-heading">
          <h2
            id="intro-heading"
            class="text-[18px] font-medium text-[var(--color-primary)]"
          >
            Overview
          </h2>
          <p class="mt-2 text-[15px] leading-[22px] text-[var(--color-primary)]">
            <RichText :text="flow.intro.simple" />
          </p>
          <p class="mt-3 text-[14px] leading-[21px] text-[var(--color-secondary)]">
            <RichText :text="flow.intro.technical" />
          </p>
        </section>

        <FactsGrid :facts="flow.facts" title="Key facts" />

        <section aria-labelledby="outro-heading">
          <h2
            id="outro-heading"
            class="text-[18px] font-medium text-[var(--color-primary)]"
          >
            {{ flow.outro.title }}
          </h2>
          <p class="mt-2 text-[15px] leading-[22px] text-[var(--color-primary)]">
            {{ flow.outro.simple }}
          </p>
          <p class="mt-2 text-[14px] leading-[21px] text-[var(--color-secondary)]">
            {{ flow.outro.technical }}
          </p>
          <div class="mt-3">
            <FactsGrid :facts="flow.outro.facts" />
          </div>
        </section>

        <TryItBox :items="flow.tryIt" />
      </div>

      <aside class="min-w-0 space-y-8">
        <SourcesList :sources="flow.meta.sources" />

        <section
          v-if="relatedTopics.length > 0"
          aria-labelledby="related-heading"
        >
          <h2
            id="related-heading"
            class="text-[18px] font-medium text-[var(--color-primary)]"
          >
            Related topics
          </h2>
          <ul class="mt-2.5 space-y-2">
            <li v-for="rel in relatedTopics" :key="rel.slug">
              <NuxtLink
                :to="`/learn/${rel.slug}/`"
                class="block rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-2.5 transition-colors duration-150 hover:bg-[var(--color-raised)]"
              >
                <div class="text-[14px] font-medium text-[var(--color-primary)]">
                  {{ rel.title }}
                </div>
                <div class="text-[12px] text-[var(--color-secondary)]">
                  {{ rel.tagline }}
                </div>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section class="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 text-[13px] text-[var(--color-secondary)]">
          <div>
            Last verified:
            <span class="font-mono">{{ flow.meta.lastVerified }}</span>
          </div>
          <div class="mt-3 flex flex-col gap-2">
            <a
              :href="editUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline"
            >
              <span>Edit this topic on GitHub</span>
              <ExternalLink :size="14" :stroke-width="1.5" />
            </a>
            <a
              :href="reportUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-[var(--color-accent)] hover:underline"
            >
              <span>Report an error in this step</span>
              <ExternalLink :size="14" :stroke-width="1.5" />
            </a>
          </div>
        </section>
      </aside>
    </div>

    <ShortcutsDialog :open="shortcutsOpen" @close="shortcutsOpen = false" />
  </div>
</template>
