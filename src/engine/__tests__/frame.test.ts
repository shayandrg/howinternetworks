import { describe, expect, it } from "vitest";
import { compileFlow } from "../compile";
import { frameAt } from "../frame";
import { computeCameraBox } from "../camera";
import { defineFlow } from "@/content/schema";

const flow = defineFlow({
  meta: {
    slug: "frame-test",
    kind: "flow",
    collection: "protocols",
    group: "delivery",
    title: "Frame Test",
    tagline: "Test frame rendering",
    prerequisites: [],
    related: [],
    tags: [],
    sources: [{ label: "RFC 793", url: "https://www.rfc-editor.org/rfc/rfc793" }],
    status: "reviewed",
    lastVerified: "2026-11-25",
  },
  intro: { simple: "Simple", technical: "Technical" },
  facts: [
    { label: "A", value: "1" },
    { label: "B", value: "2" },
    { label: "C", value: "3" },
    { label: "D", value: "4" },
  ],
  scene: {
    actors: [
      { id: "a", kind: "laptop", label: "Laptop", at: { x: 100, y: 300 } },
      { id: "b", kind: "router", label: "Router", at: { x: 400, y: 300 } },
      { id: "c", kind: "server", label: "Server", at: { x: 700, y: 300 } },
    ],
    links: [
      { id: "ab", from: "a", to: "b", medium: "ethernet" },
      { id: "bc", from: "b", to: "c", medium: "fiber" },
    ],
    start: { visible: ["a", "b"], focus: ["a", "b"] },
  },
  steps: [
    {
      id: "step-1",
      title: "Send and focus",
      simple: "Simple 1",
      technical: "Technical 1",
      events: [
        { type: "reveal", actors: ["c"] },
        { type: "focus", actors: ["b", "c"] },
        {
          type: "packet",
          id: "pkt-1",
          from: "a",
          to: "c",
          tone: "request",
          label: "REQ",
          capture: {
            time: 0.01,
            src: "192.168.1.10",
            dst: "203.0.113.10",
            protocol: "TCP",
            info: "REQ",
            bytes: 60,
          },
        },
      ],
    },
    {
      id: "step-2",
      title: "Drop packet",
      simple: "Simple 2",
      technical: "Technical 2",
      events: [
        {
          type: "packet",
          id: "pkt-lost",
          from: "a",
          to: "c",
          tone: "error",
          label: "DROP",
          lost: true,
          capture: {
            time: 0.05,
            src: "192.168.1.10",
            dst: "203.0.113.10",
            protocol: "TCP",
            info: "DROP",
            bytes: 60,
          },
        },
        { type: "wait", ms: 600 },
      ],
    },
  ],
  outro: {
    title: "Done",
    simple: "Simple",
    technical: "Technical",
    facts: [{ label: "A", value: "1" }],
  },
});

describe("frameAt", () => {
  const timeline = compileFlow(flow);

  it("at t=0 shows only start-visible actors and no packets", () => {
    const f0 = frameAt(timeline, 0);
    expect(f0.actors.find((a) => a.id === "a")?.opacity).toBe(1);
    expect(f0.actors.find((a) => a.id === "b")?.opacity).toBe(1);
    expect(f0.actors.find((a) => a.id === "c")?.opacity).toBe(0);
    expect(f0.packets).toHaveLength(0);
  });

  it("places packet on path at midpoint and at destination at end", () => {
    const pktEvent = timeline.steps[0].events[2];
    const midT = pktEvent.startMs + pktEvent.durationMs / 2;
    const fMid = frameAt(timeline, midT);
    const pktMid = fMid.packets.find((p) => p.eventId === "pkt-1");
    expect(pktMid).toBeDefined();
    expect(pktMid!.x).toBeGreaterThan(100);
    expect(pktMid!.x).toBeLessThan(700);
    expect(pktMid!.y).toBeCloseTo(300, 5);

    const fEnd = frameAt(timeline, pktEvent.endMs);
    const pktEnd = fEnd.packets.find((p) => p.eventId === "pkt-1");
    expect(pktEnd).toBeDefined();
    expect(pktEnd!.x).toBeCloseTo(700, 5);
    expect(pktEnd!.y).toBeCloseTo(300, 5);
  });

  it("is pure and seeking backwards equals computing fresh", () => {
    const tTarget = 1800;
    const fresh = frameAt(timeline, tTarget);
    frameAt(timeline, timeline.totalMs);
    const rewound = frameAt(timeline, tTarget);
    expect(rewound).toEqual(fresh);
  });

  it("stops a lost packet at 55% and leaves a marker until step ends", () => {
    const lostEv = timeline.steps[1].events[0];
    const fEndLost = frameAt(timeline, lostEv.endMs);
    expect(fEndLost.markers).toHaveLength(1);
    // 55% from x=100 to x=700 is 100 + 600 * 0.55 = 430
    expect(fEndLost.markers[0].x).toBeCloseTo(430, 3);
    expect(fEndLost.markers[0].kind).toBe("lost");

    const fStepEnd = frameAt(timeline, timeline.steps[1].endMs);
    expect(fStepEnd.markers).toHaveLength(1);
  });

  it("sets camera equal to computed target box at end of focus step", () => {
    const fStep1End = frameAt(timeline, timeline.steps[0].endMs);
    const expected = computeCameraBox(flow.scene.actors, ["b", "c"]);
    expect(fStep1End.camera).toEqual(expected);
  });

  it("never decreases visibleCaptures as t grows", () => {
    let prev = 0;
    for (let t = 0; t <= timeline.totalMs; t += 100) {
      const f = frameAt(timeline, t);
      expect(f.visibleCaptures).toBeGreaterThanOrEqual(prev);
      prev = f.visibleCaptures;
    }
    expect(prev).toBe(2);
  });
});
