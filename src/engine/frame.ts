import type { Frame, Tone } from "./types";
import type { CompiledTimeline } from "./compile";
import { interpolateCamera, type CameraBox } from "./camera";
import { clamp01, easeInOutCubic } from "./easing";
import { pointAlongPolyline } from "./route";
import {
  ARRIVAL_PULSE_MS,
  LOSS_FADE_MS,
  LOSS_FRACTION,
  NOTE_FADE_MS,
  REVEAL_MS,
  STREAM_SPACING_MS,
  TRAIL_FADE_MS,
} from "./registry";

export interface FrameOptions {
  reducedMotion?: boolean;
}

export function stepIndexAtTime(
  timeline: CompiledTimeline,
  t: number,
): number {
  const { steps } = timeline;
  if (steps.length === 0) return 0;
  if (t <= 0) return 0;
  if (t >= timeline.totalMs) return steps.length - 1;
  for (let i = 0; i < steps.length; i++) {
    if (t < steps[i]!.endMs) return i;
  }
  return steps.length - 1;
}

export function frameAt(
  timeline: CompiledTimeline,
  rawT: number,
  options?: FrameOptions,
): Frame {
  const reducedMotion = options?.reducedMotion ?? false;
  const t = Math.max(0, Math.min(timeline.totalMs, rawT));
  const stepIndex = stepIndexAtTime(timeline, t);
  const currentStep = timeline.steps[stepIndex];
  const stepProgress =
    currentStep && currentStep.durationMs > 0
      ? clamp01((t - currentStep.startMs) / currentStep.durationMs)
      : 0;

  const startVisible = new Set(timeline.flow.scene.start.visible);
  const actorOpacity = new Map<string, number>();
  const actorHighlight = new Map<string, number>();
  const actorPulse = new Map<string, number>();
  const actorBadge = new Map<string, { text: string; tone?: Tone }>();
  const actorScreen = new Map<
    string,
    (Frame["actors"][number]["screen"] & object)
  >();

  for (const actor of timeline.flow.scene.actors) {
    actorOpacity.set(actor.id, startVisible.has(actor.id) ? 1 : 0);
    actorHighlight.set(actor.id, 0);
    actorPulse.set(actor.id, 0);
  }

  const linkRevealOpacity = new Map<string, number>();
  for (const link of timeline.flow.scene.links) {
    linkRevealOpacity.set(link.id, link.hidden ? 0 : 1);
  }

  let cameraFrom: CameraBox = timeline.initialCamera;
  let cameraTo: CameraBox = timeline.initialCamera;
  let cameraStartMs = 0;
  let cameraEndMs = 0;

  const packets: Frame["packets"] = [];
  const markers: Frame["markers"] = [];
  const notes: Frame["notes"] = [];
  let currentPacketId: string | undefined;
  let latestPacketStartMs = -1;

  for (const ce of timeline.flatEvents) {
    const ev = ce.event;
    if (ev.type === "together") continue;
    if (ce.startMs > t) continue;

    switch (ev.type) {
      case "reveal": {
        const p = clamp01((t - ce.startMs) / REVEAL_MS);
        for (const id of ev.actors ?? []) {
          const prev = actorOpacity.get(id) ?? 0;
          actorOpacity.set(id, Math.max(prev, p));
        }
        for (const id of ev.links ?? []) {
          const prev = linkRevealOpacity.get(id) ?? 0;
          linkRevealOpacity.set(id, Math.max(prev, p));
        }
        break;
      }

      case "hide": {
        const p = clamp01((t - ce.startMs) / REVEAL_MS);
        for (const id of ev.actors ?? []) {
          const prev = actorOpacity.get(id) ?? 1;
          actorOpacity.set(id, Math.min(prev, 1 - p));
        }
        for (const id of ev.links ?? []) {
          const prev = linkRevealOpacity.get(id) ?? 1;
          linkRevealOpacity.set(id, Math.min(prev, 1 - p));
        }
        break;
      }

      case "focus": {
        if (!ce.focusInfo) break;
        const currentCamAtStart =
          cameraEndMs > cameraStartMs && ce.startMs < cameraEndMs
            ? interpolateCamera(
                cameraFrom,
                cameraTo,
                easeInOutCubic(
                  (ce.startMs - cameraStartMs) / (cameraEndMs - cameraStartMs),
                ),
              )
            : cameraTo;
        cameraFrom = currentCamAtStart;
        cameraTo = ce.focusInfo.targetCamera;
        cameraStartMs = ce.startMs;
        cameraEndMs = ce.endMs;
        break;
      }

      case "highlight": {
        if (t <= ce.endMs) {
          const p = clamp01((t - ce.startMs) / ce.durationMs);
          const val = Math.sin(p * Math.PI);
          for (const id of ev.actors) {
            actorHighlight.set(id, Math.max(actorHighlight.get(id) ?? 0, val));
          }
        }
        break;
      }

      case "badge": {
        actorBadge.set(ev.at, { text: ev.text, tone: ev.tone });
        break;
      }

      case "screen": {
        const progress =
          ce.durationMs > 0 ? clamp01((t - ce.startMs) / ce.durationMs) : 1;
        actorScreen.set(ev.at, { ...ev.screen, progress });
        break;
      }

      case "note": {
        const activeUntil = ev.persist ? timeline.totalMs : ce.stepEndMs;
        if (t <= activeUntil) {
          const fadeP = clamp01((t - ce.startMs) / NOTE_FADE_MS);
          const opacity = reducedMotion ? 1 : fadeP;
          const rise = reducedMotion ? 0 : 8 * (1 - fadeP);
          notes.push({
            id: ev.id,
            at: ev.at,
            text: ev.text,
            tone: ev.tone,
            opacity,
            rise,
          });
        }
        break;
      }

      case "packet": {
        if (!ce.packetInfo) break;
        if (ce.startMs >= latestPacketStartMs) {
          latestPacketStartMs = ce.startMs;
          currentPacketId = ev.id;
        }
        const { route, singleDurationMs } = ce.packetInfo;
        renderSinglePacket({
          key: ev.id,
          eventId: ev.id,
          tone: ev.tone,
          label: ev.label,
          locked: Boolean(ev.locked),
          lost: Boolean(ev.lost),
          toActor: ev.to,
          startMs: ce.startMs,
          endMs: ce.endMs,
          durationMs: singleDurationMs,
          stepEndMs: ce.stepEndMs,
          routePoints: route.points,
          t,
          reducedMotion,
          packets,
          markers,
          actorPulse,
        });
        break;
      }

      case "stream": {
        if (!ce.packetInfo) break;
        const { route, singleDurationMs } = ce.packetInfo;
        const lostSet = new Set(ev.lostIndexes ?? []);
        for (let i = 0; i < ev.count; i++) {
          const subStart = ce.startMs + i * STREAM_SPACING_MS;
          if (subStart > t) break;
          if (subStart >= latestPacketStartMs) {
            latestPacketStartMs = subStart;
            currentPacketId = ev.id;
          }
          const subEnd = subStart + singleDurationMs;
          renderSinglePacket({
            key: `${ev.id}-${i}`,
            eventId: ev.id,
            tone: ev.tone,
            label: ev.label,
            locked: Boolean(ev.locked),
            lost: lostSet.has(i),
            toActor: ev.to,
            startMs: subStart,
            endMs: subEnd,
            durationMs: singleDurationMs,
            stepEndMs: ce.stepEndMs,
            routePoints: route.points,
            t,
            reducedMotion,
            packets,
            markers,
            actorPulse,
          });
        }
        break;
      }
    }
  }

  let camera: CameraBox;
  if (reducedMotion || t >= cameraEndMs || cameraEndMs <= cameraStartMs) {
    camera = cameraTo;
  } else {
    const camP = clamp01((t - cameraStartMs) / (cameraEndMs - cameraStartMs));
    camera = interpolateCamera(cameraFrom, cameraTo, easeInOutCubic(camP));
  }

  const visibleCaptures = timeline.captures.reduce(
    (count, cap) => (cap.startMs <= t ? count + 1 : count),
    0,
  );

  return {
    t,
    stepIndex,
    stepProgress,
    camera,
    actors: timeline.flow.scene.actors.map((actor) => ({
      id: actor.id,
      opacity: actorOpacity.get(actor.id) ?? 0,
      highlight: actorHighlight.get(actor.id) ?? 0,
      pulse: actorPulse.get(actor.id) ?? 0,
      ...(actorBadge.has(actor.id)
        ? { badge: actorBadge.get(actor.id) }
        : {}),
      ...(actorScreen.has(actor.id)
        ? { screen: actorScreen.get(actor.id) }
        : {}),
    })),
    links: timeline.flow.scene.links.map((link) => {
      const revealOp = linkRevealOpacity.get(link.id) ?? 1;
      const fromOp = actorOpacity.get(link.from) ?? 0;
      const toOp = actorOpacity.get(link.to) ?? 0;
      return {
        id: link.id,
        opacity: Math.min(revealOp, fromOp, toOp),
      };
    }),
    packets,
    markers,
    notes,
    visibleCaptures,
    ...(currentPacketId ? { currentPacketId } : {}),
  };
}

function renderSinglePacket(args: {
  key: string;
  eventId: string;
  tone: Tone;
  label: string;
  locked: boolean;
  lost: boolean;
  toActor: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  stepEndMs: number;
  routePoints: Array<[number, number]>;
  t: number;
  reducedMotion: boolean;
  packets: Frame["packets"];
  markers: Frame["markers"];
  actorPulse: Map<string, number>;
}): void {
  const {
    key,
    eventId,
    tone,
    label,
    locked,
    lost,
    toActor,
    startMs,
    endMs,
    durationMs,
    stepEndMs,
    routePoints,
    t,
    reducedMotion,
    packets,
    markers,
    actorPulse,
  } = args;

  if (lost) {
    const fadeMs = Math.min(LOSS_FADE_MS, durationMs * 0.4);
    const stopMs = endMs - fadeMs;
    const stopPos = pointAlongPolyline(routePoints, LOSS_FRACTION);

    if (t < stopMs) {
      const flightP = clamp01((t - startMs) / Math.max(1, stopMs - startMs));
      const frac = reducedMotion
        ? flightP < 0.4
          ? 0
          : LOSS_FRACTION
        : easeInOutCubic(flightP) * LOSS_FRACTION;
      const pos = pointAlongPolyline(routePoints, frac);
      packets.push({
        key,
        eventId,
        tone,
        label,
        locked,
        x: pos.x,
        y: pos.y,
        opacity: 1,
        lost: true,
        trail: reducedMotion ? stopPos.trail : pos.trail,
        trailOpacity: 1,
      });
    } else if (t <= endMs) {
      const fadeP = clamp01((t - stopMs) / Math.max(1, fadeMs));
      const opacity = 0.4 * (1 - fadeP);
      packets.push({
        key,
        eventId,
        tone,
        label,
        locked,
        x: stopPos.x,
        y: stopPos.y,
        opacity,
        lost: true,
        trail: stopPos.trail,
        trailOpacity: 1 - fadeP,
      });
      if (t <= stepEndMs) {
        markers.push({ key, x: stopPos.x, y: stopPos.y, kind: "lost" });
      }
    } else if (t <= stepEndMs) {
      markers.push({ key, x: stopPos.x, y: stopPos.y, kind: "lost" });
    }
    return;
  }

  // Normal (non-lost) packet
  if (t <= endMs) {
    const p = clamp01((t - startMs) / Math.max(1, durationMs));
    if (reducedMotion) {
      const atDest = p >= 0.4;
      const pos = pointAlongPolyline(routePoints, atDest ? 1 : 0);
      const crossfadeMs = 150;
      const switchT = startMs + durationMs * 0.4;
      const opacity =
        t >= switchT && t < switchT + crossfadeMs
          ? clamp01((t - switchT) / crossfadeMs)
          : 1;
      packets.push({
        key,
        eventId,
        tone,
        label,
        locked,
        x: pos.x,
        y: pos.y,
        opacity,
        lost: false,
        trail: [...routePoints],
        trailOpacity: 1,
      });
    } else {
      const frac = easeInOutCubic(p);
      const pos = pointAlongPolyline(routePoints, frac);
      packets.push({
        key,
        eventId,
        tone,
        label,
        locked,
        x: pos.x,
        y: pos.y,
        opacity: 1,
        lost: false,
        trail: pos.trail,
        trailOpacity: 1,
      });
    }
    return;
  }

  // Post-arrival: trail fade and arrival pulse ring
  const sinceArrival = t - endMs;
  if (sinceArrival <= TRAIL_FADE_MS && t <= stepEndMs) {
    const dest = routePoints[routePoints.length - 1] ?? [0, 0];
    packets.push({
      key,
      eventId,
      tone,
      label,
      locked,
      x: dest[0],
      y: dest[1],
      opacity: 0,
      lost: false,
      trail: [...routePoints],
      trailOpacity: 1 - clamp01(sinceArrival / TRAIL_FADE_MS),
    });
  }

  if (!reducedMotion && sinceArrival <= ARRIVAL_PULSE_MS && t <= stepEndMs) {
    const pulseP = clamp01(sinceArrival / ARRIVAL_PULSE_MS);
    actorPulse.set(toActor, Math.max(actorPulse.get(toActor) ?? 0, pulseP));
  }
}
