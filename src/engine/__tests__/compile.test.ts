import { describe, expect, it } from "vitest";
import { compileFlow } from "../compile";
import { defineFlow } from "@/content/schema";

const testFlow = defineFlow({
  meta: {
    slug: "test-compile",
    kind: "flow",
    collection: "protocols",
    group: "names",
    title: "Test",
    tagline: "Test compile timing",
    prerequisites: [],
    related: [],
    tags: [],
    sources: [{ label: "RFC 1035", url: "https://www.rfc-editor.org/rfc/rfc1035" }],
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
      { id: "a", kind: "laptop", label: "A", at: { x: 100, y: 300 } },
      { id: "b", kind: "router", label: "B", at: { x: 550, y: 300 } },
      { id: "c", kind: "server", label: "C", at: { x: 850, y: 300 } },
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
      title: "Step 1",
      simple: "Simple 1",
      technical: "Technical 1",
      events: [
        {
          type: "together",
          events: [
            { type: "reveal", actors: ["c"] }, // 300 ms
            { type: "focus", actors: ["a", "c"] }, // 700 ms
          ],
        },
        {
          type: "packet",
          id: "p1",
          from: "a",
          to: "b",
          tone: "lookup",
          label: "P1",
        }, // dist 450 / 0.45 = 1000 ms
        {
          type: "packet",
          id: "p2",
          from: "b",
          to: "a",
          tone: "response",
          label: "P2",
          fast: true,
        }, // 1000 * 0.5 = 500 ms
      ],
    },
    {
      id: "step-2",
      title: "Step 2",
      simple: "Simple 2",
      technical: "Technical 2",
      events: [
        { type: "wait", ms: 1200 },
        { type: "note", id: "n1", at: "a", text: "Hi" }, // 1500 ms
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

describe("compileFlow", () => {
  it("compiles contiguous steps starting at 0 with exact timing rules", () => {
    const timeline = compileFlow(testFlow);
    expect(timeline.steps).toHaveLength(2);
    expect(timeline.steps[0].startMs).toBe(0);

    // Step 1: together(700) + gap(120) + p1(1000) + gap(120) + p2(500) + tail(300) = 2740
    expect(timeline.steps[0].endMs).toBeCloseTo(2740, 5);
    expect(timeline.steps[1].startMs).toBe(timeline.steps[0].endMs);

    // Step 2: wait(1200) + gap(120) + note(1500) + tail(300) = 3120
    expect(timeline.steps[1].durationMs).toBeCloseTo(3120, 5);
    expect(timeline.totalMs).toBeCloseTo(2740 + 3120, 5);
  });

  it("starts together children at the same time and lasts as long as the longest", () => {
    const timeline = compileFlow(testFlow);
    const tog = timeline.steps[0].events[0];
    expect(tog.startMs).toBe(0);
    expect(tog.durationMs).toBe(700);
    expect(tog.children).toHaveLength(2);
    expect(tog.children![0].startMs).toBe(0);
    expect(tog.children![0].durationMs).toBe(300);
    expect(tog.children![1].startMs).toBe(0);
    expect(tog.children![1].durationMs).toBe(700);
  });
});
