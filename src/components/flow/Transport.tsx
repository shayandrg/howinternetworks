"use client";

import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { CompiledTimeline } from "@/engine/compile";
import type { PlaybackSpeed } from "@/engine/player";
import type { TextMode } from "@/lib/url-state";

interface TransportProps {
  timeline: CompiledTimeline;
  t: number;
  playing: boolean;
  speed: PlaybackSpeed;
  stepIndex: number;
  mode: TextMode;
  onPrev: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onReplay: () => void;
  onSeek: (t: number) => void;
  onSetSpeed: (s: PlaybackSpeed) => void;
  onSetMode: (m: TextMode) => void;
  onOpenShortcuts: () => void;
}

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 1.5, 2];

export function Transport({
  timeline,
  t,
  playing,
  speed,
  stepIndex,
  mode,
  onPrev,
  onTogglePlay,
  onNext,
  onReplay,
  onSeek,
  onSetSpeed,
  onSetMode,
  onOpenShortcuts,
}: TransportProps) {
  const steps = timeline.steps;
  const currentStep = steps[stepIndex];
  const atStart = t <= 0 && stepIndex === 0;
  const atLastStep = stepIndex >= steps.length - 1;

  return (
    <div className="mt-3 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3">
      {/* Scrubber with step ticks */}
      <div className="relative mb-2.5 flex items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2"
        >
          {steps.map((s) => {
            const pct =
              timeline.totalMs > 0 ? (s.startMs / timeline.totalMs) * 100 : 0;
            return (
              <span
                key={s.id}
                style={{ insetInlineStart: `${pct}%` }}
                className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-[var(--color-muted)]/50"
              />
            );
          })}
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(timeline.totalMs))}
          value={Math.round(t)}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Timeline scrubber"
          aria-valuetext={
            currentStep
              ? `Step ${stepIndex + 1} of ${steps.length}: ${currentStep.title}`
              : undefined
          }
          className="relative z-10 h-6 w-full cursor-pointer accent-[var(--color-accent)]"
        />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={atStart}
            aria-label="Previous step"
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-raised)] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[36px] md:min-w-[36px]"
          >
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[8px] bg-[var(--color-btn-primary-bg)] px-4 text-[14px] font-medium text-[var(--color-btn-primary-fg)] transition-opacity duration-150 hover:opacity-90 md:min-h-[36px] md:px-3.5"
          >
            {playing ? (
              <>
                <Pause size={16} strokeWidth={1.5} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={16} strokeWidth={1.5} />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={atLastStep}
            aria-label="Next step"
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-raised)] disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[36px] md:min-w-[36px]"
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={onReplay}
            aria-label="Replay from start"
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)] md:min-h-[36px] md:min-w-[36px]"
          >
            <RotateCcw size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1 text-[13px] text-[var(--color-secondary)]">
            <span className="sr-only">Playback speed</span>
            <select
              value={speed}
              onChange={(e) =>
                onSetSpeed(Number(e.target.value) as PlaybackSpeed)
              }
              aria-label="Playback speed"
              className="min-h-[44px] cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 font-mono text-[12px] text-[var(--color-primary)] md:min-h-[36px]"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </label>

          <div
            role="group"
            aria-label="Explanation mode"
            className="inline-flex rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] p-0.5"
          >
            <button
              type="button"
              onClick={() => onSetMode("simple")}
              aria-pressed={mode === "simple"}
              className={`min-h-[40px] cursor-pointer rounded-[6px] px-2.5 text-[13px] transition-colors duration-150 md:min-h-[30px] ${
                mode === "simple"
                  ? "bg-[var(--color-card)] font-medium text-[var(--color-primary)]"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => onSetMode("technical")}
              aria-pressed={mode === "technical"}
              className={`min-h-[40px] cursor-pointer rounded-[6px] px-2.5 text-[13px] transition-colors duration-150 md:min-h-[30px] ${
                mode === "technical"
                  ? "bg-[var(--color-card)] font-medium text-[var(--color-primary)]"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              }`}
            >
              Technical
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts"
            className="hidden min-h-[36px] min-w-[36px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)] md:inline-flex"
          >
            <HelpCircle size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
