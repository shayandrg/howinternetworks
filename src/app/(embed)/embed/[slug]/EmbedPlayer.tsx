"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Flow } from "@/content/schema";
import { compileFlow } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer, usePlayerSelector } from "@/engine/player";
import { Stage } from "@/stage/Stage";
import { Transport } from "@/components/flow/Transport";
import { RichText } from "@/components/flow/RichText";
import { ShortcutsDialog } from "@/components/flow/ShortcutsDialog";

export function EmbedPlayer({ flow }: { flow: Flow }) {
  const timeline = useMemo(() => compileFlow(flow), [flow]);
  const player = useMemo(
    () => createPlayer(timeline, { mode: "step" }),
    [timeline],
  );

  const t = usePlayerSelector(player, (s) => s.t);
  const playing = usePlayerSelector(player, (s) => s.playing);
  const speed = usePlayerSelector(player, (s) => s.speed);
  const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      player.destroy();
    };
  }, [player]);

  const frame = frameAt(timeline, t, { reducedMotion });
  const step = flow.steps[stepIndex] ?? flow.steps[0];

  return (
    <div className="mx-auto max-w-4xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[14px] font-medium text-[var(--color-primary)]">
          {flow.meta.title}: {step.title}
        </span>
        <Link
          href={`/learn/${flow.meta.slug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
        >
          Open the full topic
        </Link>
      </div>

      <Stage
        actors={flow.scene.actors}
        links={flow.scene.links}
        frame={frame}
        stepTitle={step.title}
      />

      <Transport
        timeline={timeline}
        t={t}
        playing={playing}
        speed={speed}
        stepIndex={stepIndex}
        mode="simple"
        onPrev={() => player.prev()}
        onTogglePlay={() => player.toggle()}
        onNext={() => player.next()}
        onReplay={() => player.replay()}
        onSeek={(nextT) => player.seek(nextT)}
        onSetSpeed={(s) => player.setSpeed(s)}
        onSetMode={() => {}}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <p className="mt-3 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3 text-[15px] leading-[22px] text-[var(--color-primary)]">
        <RichText text={step.simple} />
      </p>

      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
