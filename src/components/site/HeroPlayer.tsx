"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { Flow } from "@/content/schema";
import { compileFlow } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer, usePlayerSelector } from "@/engine/player";
import { Stage } from "@/stage/Stage";

export function HeroPlayer({ flow }: { flow: Flow }) {
  const timeline = useMemo(() => compileFlow(flow), [flow]);
  const player = useMemo(
    () => createPlayer(timeline, { mode: "continuous" }),
    [timeline],
  );
  const t = usePlayerSelector(player, (s) => s.t);
  const playing = usePlayerSelector(player, (s) => s.playing);
  const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);

  const [reducedMotion, setReducedMotion] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);

    if (mq.matches) {
      const step0End = timeline.steps[0]?.endMs ?? 0;
      player.seek(step0End);
    } else if (wrapRef.current && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !hasAutoStarted.current) {
            hasAutoStarted.current = true;
            player.play();
            obs.disconnect();
          }
        },
        { threshold: 0.25 },
      );
      obs.observe(wrapRef.current);
      return () => {
        obs.disconnect();
        player.destroy();
      };
    }

    return () => player.destroy();
  }, [player, timeline]);

  const frame = frameAt(timeline, t, { reducedMotion });
  const ended = t >= timeline.totalMs - 1;
  const currentStep = flow.steps[stepIndex] ?? flow.steps[0];

  return (
    <div
      ref={wrapRef}
      className="rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <Link
          href={`/learn/${flow.meta.slug}/`}
          className="text-[13px] font-medium text-[var(--color-primary)] hover:underline"
        >
          {flow.meta.title}: {currentStep.title}
        </Link>

        {ended ? (
          <button
            type="button"
            onClick={() => player.replay()}
            className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2.5 text-[12px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-raised)]"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
            <span>Replay</span>
          </button>
        ) : playing ? (
          <button
            type="button"
            onClick={() => player.pause()}
            className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2.5 text-[12px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-raised)]"
          >
            <Pause size={14} strokeWidth={1.5} />
            <span>Pause</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => player.play()}
            className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-[8px] bg-[var(--color-btn-primary-bg)] px-2.5 text-[12px] font-medium text-[var(--color-btn-primary-fg)]"
          >
            <Play size={14} strokeWidth={1.5} />
            <span>Play</span>
          </button>
        )}
      </div>

      <Stage
        actors={flow.scene.actors}
        links={flow.scene.links}
        frame={frame}
        stepTitle={currentStep.title}
      />
    </div>
  );
}
