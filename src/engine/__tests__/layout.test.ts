import { describe, expect, it } from "vitest";
import { topics } from "@/content";
import { kitchenSinkFlow } from "@/content/flows/_kitchen-sink";
import { compileFlow } from "../compile";
import { frameAt } from "../frame";
import { actorBoundingBox, WORLD_HEIGHT, WORLD_WIDTH } from "../camera";
import type { CompiledEvent } from "../compile";

function boxesOverlap(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

describe("topic layout, timing, and visibility rules (12, 13, 14)", () => {
  it("enforces compile duration, step bounds, actor margins/overlaps, and route visibility", () => {
    for (const topic of topics) {
      // 12. Compiles, total <= 120s, each step 1.5s..20s
      const timeline = compileFlow(topic);
      expect(
        timeline.totalMs,
        `${topic.meta.slug} totalMs <= 120000`,
      ).toBeLessThanOrEqual(120000);
      for (const step of timeline.steps) {
        expect(
          step.durationMs,
          `${topic.meta.slug}.${step.id} >= 1500 ms`,
        ).toBeGreaterThanOrEqual(1500);
        expect(
          step.durationMs,
          `${topic.meta.slug}.${step.id} <= 20000 ms`,
        ).toBeLessThanOrEqual(20000);
      }

      // 13. Actor margins >= 40 from world edge and no overlapping actor boxes
      const boxes = topic.scene.actors.map((a) => {
        expect(
          a.at.x,
          `${topic.meta.slug}.${a.id}.x >= 40`,
        ).toBeGreaterThanOrEqual(40);
        expect(
          a.at.x,
          `${topic.meta.slug}.${a.id}.x <= ${WORLD_WIDTH - 40}`,
        ).toBeLessThanOrEqual(WORLD_WIDTH - 40);
        expect(
          a.at.y,
          `${topic.meta.slug}.${a.id}.y >= 40`,
        ).toBeGreaterThanOrEqual(40);
        expect(
          a.at.y,
          `${topic.meta.slug}.${a.id}.y <= ${WORLD_HEIGHT - 40}`,
        ).toBeLessThanOrEqual(WORLD_HEIGHT - 40);
        return { id: a.id, box: actorBoundingBox(a) };
      });

      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(
            boxesOverlap(boxes[i].box, boxes[j].box),
            `${topic.meta.slug} overlap between ${boxes[i].id} and ${boxes[j].id}`,
          ).toBe(false);
        }
      }

      // 14. Packet route passes through actors and links visible when packet starts
      const packetEvents: CompiledEvent[] = timeline.flatEvents.filter(
        (ce) => ce.event.type === "packet" || ce.event.type === "stream",
      );
      for (const ce of packetEvents) {
        const f = frameAt(timeline, ce.startMs);
        const route = ce.packetInfo!.route;
        for (const actorId of route.actorIds) {
          const actorFrame = f.actors.find((a) => a.id === actorId);
          expect(
            actorFrame && actorFrame.opacity > 0,
            `${topic.meta.slug}.${ce.event.type} actor ${actorId} not visible at ${ce.startMs}ms`,
          ).toBe(true);
        }
        for (const linkId of route.linkIds) {
          const linkFrame = f.links.find((l) => l.id === linkId);
          expect(
            linkFrame && linkFrame.opacity > 0,
            `${topic.meta.slug}.${ce.event.type} link ${linkId} not visible at ${ce.startMs}ms`,
          ).toBe(true);
        }
      }
    }
  });

  it("compiles kitchenSinkFlow cleanly with no actor overlap", () => {
    const timeline = compileFlow(kitchenSinkFlow);
    expect(timeline.steps).toHaveLength(3);
    const fEnd = frameAt(timeline, timeline.totalMs);
    expect(fEnd.visibleCaptures).toBe(6);
  });
});
