import type { Actor, Link } from "./types";

export interface SceneGraph {
  actors: Actor[];
  links: Link[];
}

export interface ResolvedPath {
  actorIds: string[];
  linkIds: string[];
  points: Array<[number, number]>;
  length: number;
}

function findLinkBetween(
  links: Link[],
  a: string,
  b: string,
): Link | undefined {
  return links.find(
    (l) => (l.from === a && l.to === b) || (l.from === b && l.to === a),
  );
}

export function polylineLength(points: ReadonlyArray<[number, number]>): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    total += Math.hypot(dx, dy);
  }
  return total;
}

export function pointAlongPolyline(
  points: ReadonlyArray<[number, number]>,
  fraction: number,
): { x: number; y: number; trail: Array<[number, number]> } {
  if (points.length === 0) {
    return { x: 0, y: 0, trail: [] };
  }
  if (points.length === 1 || fraction <= 0) {
    return { x: points[0][0], y: points[0][1], trail: [points[0]] };
  }
  if (fraction >= 1) {
    const last = points[points.length - 1];
    return { x: last[0], y: last[1], trail: [...points] };
  }

  const total = polylineLength(points);
  if (total === 0) {
    const last = points[points.length - 1];
    return { x: last[0], y: last[1], trail: [points[0]] };
  }

  const target = total * fraction;
  let walked = 0;
  const trail: Array<[number, number]> = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    if (walked + segLen >= target) {
      const localT = segLen === 0 ? 1 : (target - walked) / segLen;
      const x = x1 + (x2 - x1) * localT;
      const y = y1 + (y2 - y1) * localT;
      trail.push([x, y]);
      return { x, y, trail };
    }
    walked += segLen;
    trail.push([x2, y2]);
  }

  const last = points[points.length - 1];
  return { x: last[0], y: last[1], trail: [...points] };
}

/**
 * Finds the route between `from` and `to` (explicit via hops or BFS shortest path).
 * Throws an Error naming `contextLabel` when no path exists.
 */
export function resolveRoute(
  scene: SceneGraph,
  from: string,
  to: string,
  via: string[] | undefined,
  contextLabel: string,
): ResolvedPath {
  const actorMap = new Map(scene.actors.map((a) => [a.id, a]));

  if (!actorMap.has(from)) {
    throw new Error(`${contextLabel}: unknown source actor "${from}"`);
  }
  if (!actorMap.has(to)) {
    throw new Error(`${contextLabel}: unknown destination actor "${to}"`);
  }

  let actorIds: string[];
  const linkIds: string[] = [];

  if (via && via.length > 0) {
    actorIds = [from, ...via, to];
    for (let i = 0; i < actorIds.length - 1; i++) {
      const u = actorIds[i];
      const v = actorIds[i + 1];
      if (!actorMap.has(u) || !actorMap.has(v)) {
        throw new Error(`${contextLabel}: unknown via actor in "${u} -> ${v}"`);
      }
      const link = findLinkBetween(scene.links, u, v);
      if (!link) {
        throw new Error(`${contextLabel}: no link between "${u}" and "${v}"`);
      }
      linkIds.push(link.id);
    }
  } else if (from === to) {
    actorIds = [from];
  } else {
    const parent = new Map<string, string | null>([[from, null]]);
    const queue: string[] = [from];
    let found = false;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === to) {
        found = true;
        break;
      }
      for (const link of scene.links) {
        const next =
          link.from === curr ? link.to : link.to === curr ? link.from : null;
        if (next && !parent.has(next)) {
          parent.set(next, curr);
          queue.push(next);
        }
      }
    }

    if (!found) {
      throw new Error(
        `${contextLabel}: no path between "${from}" and "${to}"`,
      );
    }

    actorIds = [];
    let cur: string | null = to;
    while (cur !== null) {
      actorIds.unshift(cur);
      cur = parent.get(cur) ?? null;
    }

    for (let i = 0; i < actorIds.length - 1; i++) {
      const link = findLinkBetween(scene.links, actorIds[i], actorIds[i + 1]);
      if (!link) {
        throw new Error(
          `${contextLabel}: missing link between "${actorIds[i]}" and "${actorIds[i + 1]}"`,
        );
      }
      linkIds.push(link.id);
    }
  }

  const points: Array<[number, number]> = actorIds.map((id) => {
    const actor = actorMap.get(id)!;
    return [actor.at.x, actor.at.y];
  });

  return {
    actorIds,
    linkIds,
    points,
    length: polylineLength(points),
  };
}
