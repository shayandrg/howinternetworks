"use client";

import { useEffect, useMemo, useState } from "react";
import { compileFlow } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer, usePlayerSelector } from "@/engine/player";
import { kitchenSinkFlow } from "@/content/flows/_kitchen-sink";
import { Stage } from "@/stage/Stage";
import { SequenceView } from "@/stage/SequenceView";
import { CaptureTable } from "@/stage/CaptureTable";
import { Inspector, type InspectedPacket } from "@/stage/Inspector";
import type { StageEvent } from "@/engine/types";

function findInspectedPacket(
  timeline: ReturnType<typeof compileFlow>,
  activeId: string | undefined,
): InspectedPacket | undefined {
  if (!activeId) return undefined;
  for (const ce of timeline.flatEvents) {
    const ev: StageEvent = ce.event;
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

export function DevStageClient() {
  const timeline = useMemo(() => compileFlow(kitchenSinkFlow), []);
  const player = useMemo(
    () => createPlayer(timeline, { mode: "continuous" }),
    [timeline],
  );

  const t = usePlayerSelector(player, (s) => s.t);
  const playing = usePlayerSelector(player, (s) => s.playing);
  const speed = usePlayerSelector(player, (s) => s.speed);
  const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);

  const [view, setView] = useState<"network" | "sequence">("network");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedPacketId, setSelectedPacketId] = useState<string | undefined>();

  useEffect(() => {
    return () => player.destroy();
  }, [player]);

  const frame = useMemo(
    () => frameAt(timeline, t, { reducedMotion }),
    [timeline, t, reducedMotion],
  );

  const activeId = selectedPacketId ?? frame.currentPacketId;
  const inspectedPacket = findInspectedPacket(timeline, activeId);

  const currentStep = kitchenSinkFlow.steps[stepIndex];

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">Stage dev: Kitchen Sink</h1>
          <p className="text-sm text-[var(--color-secondary)]">
            Step {stepIndex + 1} of {kitchenSinkFlow.steps.length}: {currentStep?.title}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => player.toggle()}
            className="cursor-pointer rounded-[8px] bg-[var(--color-btn-primary-bg)] px-3 py-1.5 text-sm font-medium text-[var(--color-btn-primary-fg)]"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => player.replay()}
            className="cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
          >
            Replay
          </button>
          {([0.5, 1, 1.5, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => player.setSpeed(s)}
              className={`cursor-pointer rounded-[8px] border border-[var(--color-hairline)] px-2.5 py-1.5 text-sm ${
                speed === s
                  ? "bg-[var(--color-raised)] font-medium"
                  : "bg-[var(--color-card)]"
              }`}
            >
              {s}x
            </button>
          ))}
          <button
            type="button"
            onClick={() => setView((v) => (v === "network" ? "sequence" : "network"))}
            className="cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-1.5 text-sm"
          >
            View: {view}
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            Reduced motion
          </label>
        </div>
      </div>

      {view === "network" ? (
        <Stage
          actors={kitchenSinkFlow.scene.actors}
          links={kitchenSinkFlow.scene.links}
          frame={frame}
          stepTitle={currentStep?.title ?? "Kitchen Sink"}
          selectedPacketId={activeId}
          onSelectPacket={(id) => setSelectedPacketId(id)}
        />
      ) : (
        <SequenceView
          timeline={timeline}
          t={t}
          playing={playing}
          selectedPacketId={activeId}
          onSelectPacket={(id) => setSelectedPacketId(id)}
        />
      )}

      <CaptureTable
        captures={timeline.captures}
        visibleCaptures={frame.visibleCaptures}
        activePacketId={activeId}
        onSelectCapture={(cap) => {
          player.seek(cap.startMs);
          setSelectedPacketId(cap.eventId);
        }}
      />

      <Inspector packet={inspectedPacket} />
    </div>
  );
}
