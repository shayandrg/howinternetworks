import { describe, expect, it } from "vitest";
import { resolveRoute, pointAlongPolyline } from "../route";
import type { Actor, Link } from "../types";

const actors: Actor[] = [
  { id: "laptop", kind: "laptop", label: "Laptop", at: { x: 100, y: 300 } },
  { id: "router", kind: "router", label: "Router", at: { x: 400, y: 300 } },
  { id: "server", kind: "server", label: "Server", at: { x: 700, y: 300 } },
  { id: "island", kind: "server", label: "Island", at: { x: 850, y: 100 } },
];

const links: Link[] = [
  { id: "l1", from: "laptop", to: "router", medium: "wifi" },
  { id: "l2", from: "router", to: "server", medium: "fiber" },
];

describe("resolveRoute", () => {
  it("finds shortest path through the router via BFS", () => {
    const route = resolveRoute({ actors, links }, "laptop", "server", undefined, "test.s1.p1");
    expect(route.actorIds).toEqual(["laptop", "router", "server"]);
    expect(route.linkIds).toEqual(["l1", "l2"]);
    expect(route.length).toBe(600);
  });

  it("throws a descriptive error naming the event when disconnected", () => {
    expect(() =>
      resolveRoute({ actors, links }, "laptop", "island", undefined, "dns.step1.bad-pkt"),
    ).toThrow(/dns\.step1\.bad-pkt/);
  });

  it("interpolates halfway along a polyline cleanly", () => {
    const pos = pointAlongPolyline(
      [
        [100, 300],
        [400, 300],
        [700, 300],
      ],
      0.5,
    );
    expect(pos.x).toBeCloseTo(400, 5);
    expect(pos.y).toBeCloseTo(300, 5);
  });
});
