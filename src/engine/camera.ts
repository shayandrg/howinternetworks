import type { Actor } from "./types";

export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 600;
export const MIN_CAMERA_WIDTH = 600;
export const STAGE_ASPECT = 5 / 3;
export const CAMERA_PADDING = 80;
export const LABEL_CHAR_WIDTH = 7.5;

export interface CameraBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ActorBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes the bounding box of an actor including its SVG icon and text labels.
 */
export function actorBoundingBox(actor: Actor): ActorBox {
  const maxLabelChars = Math.max(
    actor.label.length,
    actor.sublabel?.length ?? 0,
  );
  const labelHalfW = (maxLabelChars * LABEL_CHAR_WIDTH) / 2;
  const halfW = Math.max(40, labelHalfW);
  const topY = actor.at.y - 34;
  const bottomY = actor.at.y + (actor.sublabel ? 72 : 56);
  return {
    minX: actor.at.x - halfW,
    minY: topY,
    maxX: actor.at.x + halfW,
    maxY: bottomY,
  };
}

export function computeCameraBox(
  allActors: Actor[],
  focusIds: string[],
): CameraBox {
  const focusSet = new Set(focusIds);
  const targets = allActors.filter((a) => focusSet.has(a.id));
  if (targets.length === 0) {
    return { x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const actor of targets) {
    const box = actorBoundingBox(actor);
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }

  minX -= CAMERA_PADDING;
  minY -= CAMERA_PADDING;
  maxX += CAMERA_PADDING;
  maxY += CAMERA_PADDING;

  let w = maxX - minX;
  let h = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  if (w / h < STAGE_ASPECT) {
    w = h * STAGE_ASPECT;
  } else if (w / h > STAGE_ASPECT) {
    h = w / STAGE_ASPECT;
  }

  if (w < MIN_CAMERA_WIDTH) {
    w = MIN_CAMERA_WIDTH;
    h = w / STAGE_ASPECT;
  }

  if (w >= WORLD_WIDTH || h >= WORLD_HEIGHT) {
    return { x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT };
  }

  const x = Math.max(0, Math.min(WORLD_WIDTH - w, cx - w / 2));
  const y = Math.max(0, Math.min(WORLD_HEIGHT - h, cy - h / 2));

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    w: Number(w.toFixed(2)),
    h: Number(h.toFixed(2)),
  };
}

export function interpolateCamera(
  from: CameraBox,
  to: CameraBox,
  easedT: number,
): CameraBox {
  return {
    x: from.x + (to.x - from.x) * easedT,
    y: from.y + (to.y - from.y) * easedT,
    w: from.w + (to.w - from.w) * easedT,
    h: from.h + (to.h - from.h) * easedT,
  };
}
