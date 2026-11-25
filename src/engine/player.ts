"use client";

import { useSyncExternalStore } from "react";
import type { CompiledTimeline } from "./compile";
import { stepIndexAtTime } from "./frame";

export type PlaybackSpeed = 0.5 | 1 | 1.5 | 2;
export type PlaybackMode = "step" | "continuous";

export interface PlayerState {
  t: number;
  playing: boolean;
  speed: PlaybackSpeed;
  mode: PlaybackMode;
  stepIndex: number;
}

export const STEP_PREV_THRESHOLD_MS = 300;

export class FlowPlayerStore {
  private timeline: CompiledTimeline;
  private state: PlayerState;
  private pausedAtStepEnd = false;
  private listeners = new Set<() => void>();
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private visibilityCleanup: (() => void) | null = null;

  constructor(
    timeline: CompiledTimeline,
    initial?: Partial<{ speed: PlaybackSpeed; mode: PlaybackMode }>,
  ) {
    this.timeline = timeline;
    this.state = {
      t: 0,
      playing: false,
      speed: initial?.speed ?? 1,
      mode: initial?.mode ?? "step",
      stepIndex: 0,
    };
  }

  getState = (): PlayerState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(next: Partial<PlayerState>): void {
    const updated = { ...this.state, ...next };
    if (
      updated.t === this.state.t &&
      updated.playing === this.state.playing &&
      updated.speed === this.state.speed &&
      updated.mode === this.state.mode &&
      updated.stepIndex === this.state.stepIndex
    ) {
      return;
    }
    this.state = updated;
    this.emit();
  }

  private startLoop(): void {
    if (typeof window === "undefined") return;
    if (this.rafId !== null) return;

    if (typeof document !== "undefined" && !this.visibilityCleanup) {
      const onVis = () => {
        if (document.hidden && this.state.playing) {
          this.pause();
        }
      };
      document.addEventListener("visibilitychange", onVis);
      this.visibilityCleanup = () =>
        document.removeEventListener("visibilitychange", onVis);
    }

    this.lastTimestamp = null;
    const loop = (now: number) => {
      if (!this.state.playing) {
        this.rafId = null;
        return;
      }
      if (this.lastTimestamp !== null) {
        const rawDelta = Math.max(0, now - this.lastTimestamp);
        const clampedDelta = Math.min(50, rawDelta);
        this.advance(clampedDelta);
      }
      this.lastTimestamp = now;
      if (this.state.playing) {
        this.rafId = window.requestAnimationFrame(loop);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (typeof window !== "undefined" && this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this.lastTimestamp = null;
  }

  destroy(): void {
    this.stopLoop();
    if (this.visibilityCleanup) {
      this.visibilityCleanup();
      this.visibilityCleanup = null;
    }
    this.listeners.clear();
  }

  /**
   * Advances playback by `deltaMs` of wall-clock time (multiplied by `speed`).
   * Exported publicly so unit tests can drive the clock deterministically.
   */
  advance(deltaMs: number): void {
    if (!this.state.playing || deltaMs <= 0) return;

    const { steps, totalMs } = this.timeline;
    if (steps.length === 0 || totalMs <= 0) {
      this.setState({ playing: false });
      this.stopLoop();
      return;
    }

    const activeIdx = this.state.stepIndex;
    const activeStep = steps[activeIdx];
    const nextT = this.state.t + deltaMs * this.state.speed;

    if (this.state.mode === "step" && activeStep) {
      if (nextT >= activeStep.endMs) {
        this.pausedAtStepEnd = true;
        this.setState({
          t: activeStep.endMs,
          playing: false,
          stepIndex: activeIdx,
        });
        this.stopLoop();
        return;
      }
      this.setState({ t: nextT });
      return;
    }

    // Continuous mode
    if (nextT >= totalMs) {
      this.pausedAtStepEnd = true;
      this.setState({
        t: totalMs,
        playing: false,
        stepIndex: steps.length - 1,
      });
      this.stopLoop();
      return;
    }

    this.setState({
      t: nextT,
      stepIndex: stepIndexAtTime(this.timeline, nextT),
    });
  }

  play(): void {
    const { steps, totalMs } = this.timeline;
    if (steps.length === 0) return;

    let startT = this.state.t;
    let stepIndex = this.state.stepIndex;

    if (this.state.t >= totalMs) {
      startT = 0;
      stepIndex = 0;
      this.pausedAtStepEnd = false;
    } else if (this.pausedAtStepEnd) {
      this.pausedAtStepEnd = false;
      if (stepIndex < steps.length - 1) {
        stepIndex = stepIndex + 1;
        startT = steps[stepIndex].startMs;
      }
    }

    this.setState({ t: startT, stepIndex, playing: true });
    this.startLoop();
  }

  pause(): void {
    this.setState({ playing: false });
    this.stopLoop();
  }

  toggle(): void {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  next(): void {
    const { steps } = this.timeline;
    if (steps.length === 0) return;
    const targetIdx = Math.min(steps.length - 1, this.state.stepIndex + 1);
    const targetStep = steps[targetIdx];
    this.pausedAtStepEnd = false;
    this.setState({
      t: targetStep.startMs,
      stepIndex: targetIdx,
      playing: true,
    });
    this.startLoop();
  }

  prev(): void {
    const { steps } = this.timeline;
    if (steps.length === 0) return;
    const curr = steps[this.state.stepIndex];
    this.pausedAtStepEnd = false;
    if (this.state.t - curr.startMs > STEP_PREV_THRESHOLD_MS) {
      this.setState({ t: curr.startMs, stepIndex: curr.stepIndex });
      return;
    }
    const prevIdx = Math.max(0, this.state.stepIndex - 1);
    this.setState({
      t: steps[prevIdx].startMs,
      stepIndex: prevIdx,
    });
  }

  goTo(stepIndex: number, autoPlay = false): void {
    const { steps } = this.timeline;
    if (steps.length === 0) return;
    const clamped = Math.max(0, Math.min(steps.length - 1, stepIndex));
    this.pausedAtStepEnd = false;
    this.setState({
      t: steps[clamped].startMs,
      stepIndex: clamped,
      playing: autoPlay,
    });
    if (autoPlay) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  seek(t: number): void {
    const clamped = Math.max(0, Math.min(this.timeline.totalMs, t));
    this.pausedAtStepEnd = false;
    this.setState({
      t: clamped,
      stepIndex: stepIndexAtTime(this.timeline, clamped),
    });
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.setState({ speed });
  }

  setMode(mode: PlaybackMode): void {
    this.setState({ mode });
  }

  replay(): void {
    this.pausedAtStepEnd = false;
    this.setState({ t: 0, stepIndex: 0, playing: true });
    this.startLoop();
  }
}

export function createPlayer(
  timeline: CompiledTimeline,
  initial?: Partial<{ speed: PlaybackSpeed; mode: PlaybackMode }>,
): FlowPlayerStore {
  return new FlowPlayerStore(timeline, initial);
}

export function usePlayerSelector<T>(
  store: FlowPlayerStore,
  selector: (state: PlayerState) => T,
): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
