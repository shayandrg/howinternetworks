"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CompiledTimeline } from "@/engine/compile";
import { STREAM_SPACING_MS } from "@/engine/registry";
import { clamp01 } from "@/engine/easing";
import type { Tone } from "@/engine/types";
import { SvgPacketChip, TONE_VARS } from "./PacketChip";

interface SequenceViewProps {
  timeline: CompiledTimeline;
  t: number;
  playing: boolean;
  hoveredPacketId?: string;
  selectedPacketId?: string;
  onSelectPacket?: (eventId: string) => void;
}

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

export function SequenceView({
  timeline,
  t,
  playing,
  hoveredPacketId,
  selectedPacketId,
  onSelectPacket,
}: SequenceViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { lanes, items, stepBands, totalHeight, width } = useMemo(() => {
    const usedIds = new Set<string>();
    for (const ce of timeline.flatEvents) {
      if (ce.event.type === "packet" || ce.event.type === "stream") {
        usedIds.add(ce.event.from);
        usedIds.add(ce.event.to);
      }
    }

    const orderedActors = timeline.flow.scene.actors
      .filter((a) => usedIds.has(a.id))
      .sort((a, b) => a.at.x - b.at.x);

    const laneSpacing = Math.max(150, 760 / Math.max(1, orderedActors.length));
    const laneX = new Map<string, number>();
    const laneList = orderedActors.map((a, idx) => {
      const x = Math.round(LEFT_GUTTER + laneSpacing * (idx + 0.5));
      laneX.set(a.id, x);
      return { actor: a, x };
    });

    const svgWidth = Math.max(
      600,
      Math.round(LEFT_GUTTER * 2 + laneSpacing * Math.max(1, orderedActors.length)),
    );

    const seqItems: SeqItem[] = [];
    const bands: Array<{
      stepIndex: number;
      title: string;
      y: number;
      height: number;
      startMs: number;
      endMs: number;
    }> = [];

    let curY = LANE_HEADER_H;

    for (const step of timeline.steps) {
      const bandTop = curY;
      curY += STEP_BANNER_H;

      const stepEvents = timeline.flatEvents.filter(
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
            seqItems.push({
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
              seqItems.push({
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

      bands.push({
        stepIndex: step.stepIndex,
        title: step.title,
        y: bandTop,
        height: curY - bandTop,
        startMs: step.startMs,
        endMs: step.endMs,
      });
    }

    return {
      lanes: laneList,
      laneX,
      items: seqItems,
      stepBands: bands,
      totalHeight: curY + 16,
      width: svgWidth,
    };
  }, [timeline]);

  const activeItem = useMemo(() => {
    let best: SeqItem | undefined;
    for (const item of items) {
      if (item.startMs <= t) best = item;
    }
    return best;
  }, [items, t]);

  useEffect(() => {
    if (!playing || !activeItem || !scrollRef.current) return;
    const container = scrollRef.current;
    const targetY = activeItem.y;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (targetY < viewTop + 60 || targetY > viewBottom - 60) {
      container.scrollTop = Math.max(0, targetY - container.clientHeight / 2);
    }
  }, [playing, activeItem]);

  const lanePos = new Map(lanes.map((l) => [l.actor.id, l.x]));

  return (
    <div
      ref={scrollRef}
      className="max-h-[460px] w-full overflow-auto rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-stage)]"
    >
      <svg
        viewBox={`0 0 ${width} ${totalHeight}`}
        role="img"
        aria-label="Sequence diagram"
        className="block h-auto w-full min-w-[540px] select-none"
      >
        {/* Step bands */}
        {stepBands.map((band) => {
          const active = t >= band.startMs && t <= band.endMs;
          return (
            <g key={`band-${band.stepIndex}`}>
              <rect
                x={0}
                y={band.y}
                width={width}
                height={band.height}
                fill={active ? "var(--color-raised)" : "transparent"}
                fillOpacity={active ? 0.45 : 0}
              />
              <line
                x1={0}
                y1={band.y}
                x2={width}
                y2={band.y}
                stroke="var(--color-hairline)"
                strokeWidth={1}
              />
              <text
                x={12}
                y={band.y + 18}
                fontSize={11.5}
                fontFamily="var(--font-sans), sans-serif"
                fontWeight={500}
                fill="var(--color-secondary)"
              >
                {band.stepIndex + 1}. {band.title}
              </text>
            </g>
          );
        })}

        {/* Actor lifelines */}
        {lanes.map(({ actor, x }) => (
          <g key={`lane-${actor.id}`}>
            <text
              x={x}
              y={22}
              textAnchor="middle"
              fontSize={12.5}
              fontFamily="var(--font-sans), sans-serif"
              fontWeight={500}
              fill="var(--color-primary)"
            >
              {actor.label}
            </text>
            {actor.sublabel && (
              <text
                x={x}
                y={38}
                textAnchor="middle"
                fontSize={11}
                fontFamily="var(--font-mono), monospace"
                fill="var(--color-muted)"
              >
                {actor.sublabel}
              </text>
            )}
            <line
              x1={x}
              y1={LANE_HEADER_H - 8}
              x2={x}
              y2={totalHeight - 8}
              stroke="var(--color-hairline)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          </g>
        ))}

        {/* Packet arrows */}
        {items.map((item) => {
          if (t < item.startMs) return null;
          const x1 = lanePos.get(item.from) ?? 0;
          const x2 = lanePos.get(item.to) ?? 0;
          const progress = clamp01(
            (t - item.startMs) / Math.max(1, item.endMs - item.startMs),
          );
          const targetFrac = item.lost ? 0.55 : 1;
          const drawFrac = targetFrac * progress;
          const curX = x1 + (x2 - x1) * drawFrac;
          const dir = x2 >= x1 ? 1 : -1;
          const color = TONE_VARS[item.tone];
          const midX = (x1 + curX) / 2;
          const highlighted =
            hoveredPacketId === item.eventId ||
            selectedPacketId === item.eventId;

          return (
            <g key={item.key}>
              <line
                x1={x1}
                y1={item.y}
                x2={curX}
                y2={item.y}
                stroke={color}
                strokeWidth={1.75}
              />
              {!item.lost && progress >= 0.95 && x1 !== x2 && (
                <polygon
                  points={`${x2},${item.y} ${x2 - dir * 8},${item.y - 4} ${x2 - dir * 8},${item.y + 4}`}
                  fill={color}
                />
              )}
              {item.lost && progress >= 0.95 && (
                <g transform={`translate(${curX}, ${item.y})`}>
                  <line
                    x1={-5}
                    y1={-5}
                    x2={5}
                    y2={5}
                    stroke="var(--color-tone-error)"
                    strokeWidth={2}
                  />
                  <line
                    x1={5}
                    y1={-5}
                    x2={-5}
                    y2={5}
                    stroke="var(--color-tone-error)"
                    strokeWidth={2}
                  />
                </g>
              )}
              <SvgPacketChip
                x={midX}
                y={item.y - 12}
                tone={item.tone}
                label={item.label}
                locked={item.locked}
                highlighted={highlighted}
                onClick={
                  onSelectPacket ? () => onSelectPacket(item.eventId) : undefined
                }
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
