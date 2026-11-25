<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { CompiledTimeline } from "@/engine/compile";
import { clamp01 } from "@/engine/easing";
import { STREAM_SPACING_MS } from "@/engine/registry";
import type { Tone } from "@/engine/types";
import { TONE_VARS } from "@/stage/tokens";
import SvgPacketChip from "./SvgPacketChip.vue";

const props = defineProps<{
  timeline: CompiledTimeline;
  t: number;
  playing: boolean;
  hoveredPacketId?: string;
  selectedPacketId?: string;
  canSelect?: boolean;
}>();

const emit = defineEmits<{
  selectPacket: [eventId: string];
}>();

interface SeqItem {
  key: string;
  eventId: string;
  stepIndex: number;
  from: string;
  to: string;
  tone: Tone;
  label: string;
  locked: boolean;
  lost: boolean;
  startMs: number;
  endMs: number;
  y: number;
}

const LANE_HEADER_H = 56;
const STEP_BANNER_H = 28;
const ROW_H = 44;
const LEFT_GUTTER = 12;

const scrollRef = ref<HTMLDivElement | null>(null);

const layout = computed(() => {
  const usedIds = new Set<string>();
  for (const ce of props.timeline.flatEvents) {
    if (ce.event.type === "packet" || ce.event.type === "stream") {
      usedIds.add(ce.event.from);
      usedIds.add(ce.event.to);
    }
  }

  const orderedActors = props.timeline.flow.scene.actors
    .filter((a) => usedIds.has(a.id))
    .sort((a, b) => a.at.x - b.at.x);

  const laneSpacing = Math.max(150, 760 / Math.max(1, orderedActors.length));
  const laneX = new Map<string, number>();
  const lanes = orderedActors.map((actor, idx) => {
    const x = Math.round(LEFT_GUTTER + laneSpacing * (idx + 0.5));
    laneX.set(actor.id, x);
    return { actor, x };
  });

  const width = Math.max(
    600,
    Math.round(LEFT_GUTTER * 2 + laneSpacing * Math.max(1, orderedActors.length)),
  );

  const items: SeqItem[] = [];
  const stepBands: Array<{
    stepIndex: number;
    title: string;
    y: number;
    height: number;
    startMs: number;
    endMs: number;
  }> = [];

  let curY = LANE_HEADER_H;

  for (const step of props.timeline.steps) {
    const bandTop = curY;
    curY += STEP_BANNER_H;

    const stepEvents = props.timeline.flatEvents.filter(
      (ce) =>
        ce.stepIndex === step.stepIndex &&
        (ce.event.type === "packet" || ce.event.type === "stream"),
    );

    if (stepEvents.length === 0) {
      curY += ROW_H * 0.6;
    } else {
      for (const ce of stepEvents) {
        if (ce.event.type === "packet") {
          const ev = ce.event;
          items.push({
            key: ev.id,
            eventId: ev.id,
            stepIndex: step.stepIndex,
            from: ev.from,
            to: ev.to,
            tone: ev.tone,
            label: ev.label,
            locked: Boolean(ev.locked),
            lost: Boolean(ev.lost),
            startMs: ce.startMs,
            endMs: ce.endMs,
            y: curY + ROW_H / 2,
          });
          curY += ROW_H;
        } else if (ce.event.type === "stream") {
          const ev = ce.event;
          const single = ce.packetInfo?.singleDurationMs ?? 600;
          const lostSet = new Set(ev.lostIndexes ?? []);
          for (let i = 0; i < ev.count; i++) {
            const sStart = ce.startMs + i * STREAM_SPACING_MS;
            items.push({
              key: `${ev.id}-${i}`,
              eventId: ev.id,
              stepIndex: step.stepIndex,
              from: ev.from,
              to: ev.to,
              tone: ev.tone,
              label: ev.label,
              locked: Boolean(ev.locked),
              lost: lostSet.has(i),
              startMs: sStart,
              endMs: sStart + single,
              y: curY + ROW_H / 2,
            });
            curY += ROW_H;
          }
        }
      }
    }

    stepBands.push({
      stepIndex: step.stepIndex,
      title: step.title,
      y: bandTop,
      height: curY - bandTop,
      startMs: step.startMs,
      endMs: step.endMs,
    });
  }

  return {
    lanes,
    laneX,
    items,
    stepBands,
    totalHeight: curY + 16,
    width,
  };
});

const activeItem = computed(() => {
  let best: SeqItem | undefined;
  for (const item of layout.value.items) {
    if (item.startMs <= props.t) best = item;
  }
  return best;
});

watch(
  () => [props.playing, activeItem.value?.key] as const,
  ([isPlaying]) => {
    if (!isPlaying || !activeItem.value || !scrollRef.value) return;
    const container = scrollRef.value;
    const targetY = activeItem.value.y;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (targetY < viewTop + 60 || targetY > viewBottom - 60) {
      container.scrollTop = Math.max(0, targetY - container.clientHeight / 2);
    }
  },
);

const visibleArrows = computed(() => {
  const out: Array<{
    key: string;
    eventId: string;
    x1: number;
    x2: number;
    y: number;
    curX: number;
    midX: number;
    dir: number;
    color: string;
    tone: Tone;
    label: string;
    locked: boolean;
    lost: boolean;
    progress: number;
    highlighted: boolean;
  }> = [];

  for (const item of layout.value.items) {
    if (props.t < item.startMs) continue;
    const x1 = layout.value.laneX.get(item.from) ?? 0;
    const x2 = layout.value.laneX.get(item.to) ?? 0;
    const progress = clamp01(
      (props.t - item.startMs) / Math.max(1, item.endMs - item.startMs),
    );
    const targetFrac = item.lost ? 0.55 : 1;
    const drawFrac = targetFrac * progress;
    const curX = x1 + (x2 - x1) * drawFrac;
    const dir = x2 >= x1 ? 1 : -1;

    out.push({
      key: item.key,
      eventId: item.eventId,
      x1,
      x2,
      y: item.y,
      curX,
      midX: (x1 + curX) / 2,
      dir,
      color: TONE_VARS[item.tone],
      tone: item.tone,
      label: item.label,
      locked: item.locked,
      lost: item.lost,
      progress,
      highlighted:
        props.hoveredPacketId === item.eventId ||
        props.selectedPacketId === item.eventId,
    });
  }

  return out;
});
</script>

<template>
  <div
    ref="scrollRef"
    class="max-h-[460px] w-full overflow-auto rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-stage)]"
  >
    <svg
      :viewBox="`0 0 ${layout.width} ${layout.totalHeight}`"
      role="img"
      aria-label="Sequence diagram"
      class="block h-auto w-full min-w-[540px] select-none"
    >
      <g v-for="band in layout.stepBands" :key="`band-${band.stepIndex}`">
        <rect
          :x="0"
          :y="band.y"
          :width="layout.width"
          :height="band.height"
          :fill="t >= band.startMs && t <= band.endMs ? 'var(--color-raised)' : 'transparent'"
          :fill-opacity="t >= band.startMs && t <= band.endMs ? 0.45 : 0"
        />
        <line
          :x1="0"
          :y1="band.y"
          :x2="layout.width"
          :y2="band.y"
          stroke="var(--color-hairline)"
          :stroke-width="1"
        />
        <text
          :x="12"
          :y="band.y + 18"
          :font-size="11.5"
          font-family="var(--font-sans), sans-serif"
          :font-weight="500"
          fill="var(--color-secondary)"
        >
          {{ band.stepIndex + 1 }}. {{ band.title }}
        </text>
      </g>

      <g v-for="lane in layout.lanes" :key="`lane-${lane.actor.id}`">
        <text
          :x="lane.x"
          :y="22"
          text-anchor="middle"
          :font-size="12.5"
          font-family="var(--font-sans), sans-serif"
          :font-weight="500"
          fill="var(--color-primary)"
        >
          {{ lane.actor.label }}
        </text>
        <text
          v-if="lane.actor.sublabel"
          :x="lane.x"
          :y="38"
          text-anchor="middle"
          :font-size="11"
          font-family="var(--font-mono), monospace"
          fill="var(--color-muted)"
        >
          {{ lane.actor.sublabel }}
        </text>
        <line
          :x1="lane.x"
          :y1="LANE_HEADER_H - 8"
          :x2="lane.x"
          :y2="layout.totalHeight - 8"
          stroke="var(--color-hairline)"
          :stroke-width="1.5"
          stroke-dasharray="4 4"
        />
      </g>

      <g v-for="arrow in visibleArrows" :key="arrow.key">
        <line
          :x1="arrow.x1"
          :y1="arrow.y"
          :x2="arrow.curX"
          :y2="arrow.y"
          :stroke="arrow.color"
          :stroke-width="1.75"
        />
        <polygon
          v-if="!arrow.lost && arrow.progress >= 0.95 && arrow.x1 !== arrow.x2"
          :points="`${arrow.x2},${arrow.y} ${arrow.x2 - arrow.dir * 8},${arrow.y - 4} ${arrow.x2 - arrow.dir * 8},${arrow.y + 4}`"
          :fill="arrow.color"
        />
        <g
          v-if="arrow.lost && arrow.progress >= 0.95"
          :transform="`translate(${arrow.curX}, ${arrow.y})`"
        >
          <line
            :x1="-5"
            :y1="-5"
            :x2="5"
            :y2="5"
            stroke="var(--color-tone-error)"
            :stroke-width="2"
          />
          <line
            :x1="5"
            :y1="-5"
            :x2="-5"
            :y2="5"
            stroke="var(--color-tone-error)"
            :stroke-width="2"
          />
        </g>
        <SvgPacketChip
          :x="arrow.midX"
          :y="arrow.y - 12"
          :tone="arrow.tone"
          :label="arrow.label"
          :locked="arrow.locked"
          :highlighted="arrow.highlighted"
          :clickable="canSelect"
          @select="emit('selectPacket', arrow.eventId)"
        />
      </g>
    </svg>
  </div>
</template>
