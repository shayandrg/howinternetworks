import type { Actor, Link, StageEvent, Tone } from "./types";
import { resolveRoute, type ResolvedPath } from "./route";
import { computeCameraBox, type CameraBox } from "./camera";

export const EVENT_GAP_MS = 120;
export const STEP_TAIL_MS = 300;
export const STREAM_SPACING_MS = 140;
export const REVEAL_MS = 300;
export const FOCUS_MS = 700;
export const HIGHLIGHT_MS = 600;
export const NOTE_MS = 1500;
export const NOTE_FADE_MS = 250;
export const BADGE_MS = 1000;
export const TRAIL_FADE_MS = 500;
export const ARRIVAL_PULSE_MS = 400;
export const LOSS_FADE_MS = 300;
export const LOSS_FRACTION = 0.55;

export interface CompileContext {
  topicSlug: string;
  stepId: string;
  actors: Actor[];
  links: Link[];
}

export interface CompiledEventBase {
  event: StageEvent;
  startMs: number;
  endMs: number;
  durationMs: number;
  stepIndex: number;
  stepEndMs: number;
}

export interface CompiledPacketInfo {
  route: ResolvedPath;
  singleDurationMs: number;
}

export interface CompiledFocusInfo {
  targetCamera: CameraBox;
}

export type CompiledEvent = CompiledEventBase & {
  packetInfo?: CompiledPacketInfo;
  focusInfo?: CompiledFocusInfo;
  children?: CompiledEvent[];
};

export interface FrameBuilder {
  t: number;
  reducedMotion: boolean;
  actorOpacity: Map<string, number>;
  linkRevealOpacity: Map<string, number>;
  actorHighlight: Map<string, number>;
  actorPulse: Map<string, number>;
  actorBadge: Map<string, { text: string; tone?: Tone }>;
  actorScreen: Map<string, (StageEvent & { type: "screen" })["screen"] & { progress: number }>;
  cameraFrom: CameraBox;
  cameraTo: CameraBox;
  cameraStartMs: number;
  cameraEndMs: number;
  packets: Array<{
    key: string;
    eventId: string;
    tone: Tone;
    label: string;
    locked: boolean;
    x: number;
    y: number;
    opacity: number;
    lost: boolean;
    trail: Array<[number, number]>;
    trailOpacity: number;
  }>;
  markers: Array<{ key: string; x: number; y: number; kind: "lost" }>;
  notes: Array<{
    id: string;
    at: string;
    text: string;
    tone?: Tone;
    opacity: number;
    rise: number;
  }>;
  currentPacketId?: string;
}

export interface EventHandler<T extends StageEvent = StageEvent> {
  duration(event: T, ctx: CompileContext): number;
  compile?(
    event: T,
    ctx: CompileContext,
  ): Pick<CompiledEvent, "packetInfo" | "focusInfo" | "children">;
}

function packetSingleDuration(length: number, fast?: boolean): number {
  const base = Math.max(600, Math.min(1600, length / 0.45));
  return fast ? base * 0.5 : base;
}

function screenDuration(screen: (StageEvent & { type: "screen" })["screen"]): number {
  if (screen.app === "browser") {
    if (screen.state === "typing") return Math.max(60, screen.url.length * 60);
    if (screen.state === "loading") return 600;
    return 400;
  }
  if (screen.app === "terminal") {
    return Math.max(300, screen.lines.length * 300);
  }
  return 400;
}

export const eventRegistry: {
  [K in StageEvent["type"]]: EventHandler<Extract<StageEvent, { type: K }>>;
} = {
  packet: {
    duration(event, ctx) {
      const route = resolveRoute(
        { actors: ctx.actors, links: ctx.links },
        event.from,
        event.to,
        event.via,
        `${ctx.topicSlug}.${ctx.stepId}.${event.id}`,
      );
      return packetSingleDuration(route.length, event.fast);
    },
    compile(event, ctx) {
      const route = resolveRoute(
        { actors: ctx.actors, links: ctx.links },
        event.from,
        event.to,
        event.via,
        `${ctx.topicSlug}.${ctx.stepId}.${event.id}`,
      );
      return {
        packetInfo: {
          route,
          singleDurationMs: packetSingleDuration(route.length, event.fast),
        },
      };
    },
  },
  stream: {
    duration(event, ctx) {
      const route = resolveRoute(
        { actors: ctx.actors, links: ctx.links },
        event.from,
        event.to,
        event.via,
        `${ctx.topicSlug}.${ctx.stepId}.${event.id}`,
      );
      const single = packetSingleDuration(route.length, false);
      return (event.count - 1) * STREAM_SPACING_MS + single;
    },
    compile(event, ctx) {
      const route = resolveRoute(
        { actors: ctx.actors, links: ctx.links },
        event.from,
        event.to,
        event.via,
        `${ctx.topicSlug}.${ctx.stepId}.${event.id}`,
      );
      return {
        packetInfo: {
          route,
          singleDurationMs: packetSingleDuration(route.length, false),
        },
      };
    },
  },
  reveal: {
    duration: () => REVEAL_MS,
  },
  hide: {
    duration: () => REVEAL_MS,
  },
  focus: {
    duration: () => FOCUS_MS,
    compile(event, ctx) {
      return {
        focusInfo: {
          targetCamera: computeCameraBox(ctx.actors, event.actors),
        },
      };
    },
  },
  highlight: {
    duration: () => HIGHLIGHT_MS,
  },
  note: {
    duration: () => NOTE_MS,
  },
  badge: {
    duration: () => BADGE_MS,
  },
  screen: {
    duration: (event) => screenDuration(event.screen),
  },
  wait: {
    duration: (event) => event.ms,
  },
  together: {
    duration(event, ctx) {
      let max = 0;
      for (const child of event.events) {
        const handler = eventRegistry[child.type] as EventHandler<StageEvent>;
        max = Math.max(max, handler.duration(child, ctx));
      }
      return max;
    },
  },
};

export function getEventDuration(event: StageEvent, ctx: CompileContext): number {
  const handler = eventRegistry[event.type] as EventHandler<StageEvent>;
  return handler.duration(event, ctx);
}
