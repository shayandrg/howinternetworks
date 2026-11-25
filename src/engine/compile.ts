import type { Capture, StageEvent } from "./types";
import type { Flow } from "@/content/schema";
import { computeCameraBox, type CameraBox } from "./camera";
import {
  EVENT_GAP_MS,
  STEP_TAIL_MS,
  STREAM_SPACING_MS,
  eventRegistry,
  type CompileContext,
  type CompiledEvent,
  type EventHandler,
} from "./registry";

export type { CompiledEvent } from "./registry";

export interface CompiledStep {
  stepIndex: number;
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  events: CompiledEvent[];
}

export interface CompiledCapture {
  index: number;
  capture: Capture;
  startMs: number;
  packetKey: string;
  eventId: string;
  stepIndex: number;
}

export interface CompiledTimeline {
  flow: Flow;
  initialCamera: CameraBox;
  steps: CompiledStep[];
  flatEvents: CompiledEvent[];
  captures: CompiledCapture[];
  totalMs: number;
}

function compileEventNode(
  event: StageEvent,
  startMs: number,
  stepIndex: number,
  stepEndMsRef: { value: number },
  ctx: CompileContext,
): CompiledEvent {
  const handler = eventRegistry[event.type] as EventHandler<StageEvent>;
  const durationMs = handler.duration(event, ctx);
  const extra = handler.compile ? handler.compile(event, ctx) : {};

  let children: CompiledEvent[] | undefined;
  if (event.type === "together") {
    children = event.events.map((child) =>
      compileEventNode(child, startMs, stepIndex, stepEndMsRef, ctx),
    );
  }

  const compiled: CompiledEvent = {
    event,
    startMs,
    endMs: startMs + durationMs,
    durationMs,
    stepIndex,
    get stepEndMs() {
      return stepEndMsRef.value;
    },
    ...extra,
    ...(children ? { children } : {}),
  };

  return compiled;
}

function collectOrderedEvents(
  compiled: CompiledEvent,
  out: CompiledEvent[],
): void {
  out.push(compiled);
  if (compiled.children) {
    for (const child of compiled.children) {
      collectOrderedEvents(child, out);
    }
  }
}

export function compileFlow(flow: Flow): CompiledTimeline {
  const steps: CompiledStep[] = [];
  const flatEvents: CompiledEvent[] = [];
  const captures: CompiledCapture[] = [];

  let cursorMs = 0;

  for (let stepIndex = 0; stepIndex < flow.steps.length; stepIndex++) {
    const step = flow.steps[stepIndex];
    const stepStartMs = cursorMs;
    const stepEndMsRef = { value: stepStartMs };
    const ctx: CompileContext = {
      topicSlug: flow.meta.slug,
      stepId: step.id,
      actors: flow.scene.actors,
      links: flow.scene.links,
    };

    const compiledEvents: CompiledEvent[] = [];
    for (let i = 0; i < step.events.length; i++) {
      if (i > 0) {
        cursorMs += EVENT_GAP_MS;
      }
      const ev = compileEventNode(
        step.events[i],
        cursorMs,
        stepIndex,
        stepEndMsRef,
        ctx,
      );
      compiledEvents.push(ev);
      collectOrderedEvents(ev, flatEvents);
      cursorMs += ev.durationMs;
    }

    cursorMs += STEP_TAIL_MS;
    const stepEndMs = cursorMs;
    stepEndMsRef.value = stepEndMs;

    steps.push({
      stepIndex,
      id: step.id,
      title: step.title,
      startMs: stepStartMs,
      endMs: stepEndMs,
      durationMs: stepEndMs - stepStartMs,
      events: compiledEvents,
    });
  }

  for (const ce of flatEvents) {
    if (ce.event.type === "packet" && ce.event.capture) {
      captures.push({
        index: captures.length,
        capture: ce.event.capture,
        startMs: ce.startMs,
        packetKey: ce.event.id,
        eventId: ce.event.id,
        stepIndex: ce.stepIndex,
      });
    } else if (ce.event.type === "stream" && ce.event.captures) {
      const streamEv = ce.event;
      streamEv.captures!.forEach((cap, idx) => {
        captures.push({
          index: captures.length,
          capture: cap,
          startMs: ce.startMs + idx * STREAM_SPACING_MS,
          packetKey: `${streamEv.id}-${idx}`,
          eventId: streamEv.id,
          stepIndex: ce.stepIndex,
        });
      });
    }
  }

  const initialCamera = computeCameraBox(
    flow.scene.actors,
    flow.scene.start.focus,
  );

  return {
    flow,
    initialCamera,
    steps,
    flatEvents,
    captures,
    totalMs: cursorMs,
  };
}
