import { describe, expect, it } from "vitest";
import { compileFlow } from "../compile";
import { createPlayer } from "../player";
import { dnsFlow } from "@/content/flows/dns";

describe("FlowPlayerStore", () => {
  const timeline = compileFlow(dnsFlow);

  it("stops at the exact end of the current step in step mode", () => {
    const player = createPlayer(timeline, { mode: "step" });
    player.play();
    expect(player.getState().playing).toBe(true);

    const step0End = timeline.steps[0].endMs;
    player.advance(step0End + 500);

    const state = player.getState();
    expect(state.t).toBe(step0End);
    expect(state.playing).toBe(false);
    expect(state.stepIndex).toBe(0);

    // Calling play() again continues with the next step
    player.play();
    expect(player.getState().stepIndex).toBe(1);
    expect(player.getState().playing).toBe(true);
    player.destroy();
  });

  it("supports next, prev (with 300ms threshold), goTo, replay and speed", () => {
    const player = createPlayer(timeline, { mode: "step" });

    player.goTo(2);
    expect(player.getState().stepIndex).toBe(2);
    expect(player.getState().t).toBe(timeline.steps[2].startMs);

    // Seek 400ms into step 2 -> prev jumps to start of step 2
    player.seek(timeline.steps[2].startMs + 400);
    player.prev();
    expect(player.getState().t).toBe(timeline.steps[2].startMs);
    expect(player.getState().stepIndex).toBe(2);

    // Within 300ms of step 2 start -> prev jumps to step 1
    player.prev();
    expect(player.getState().t).toBe(timeline.steps[1].startMs);
    expect(player.getState().stepIndex).toBe(1);

    // next advances to step 2 and plays
    player.next();
    expect(player.getState().stepIndex).toBe(2);
    expect(player.getState().playing).toBe(true);

    // speed 2x doubles t advance
    const before = player.getState().t;
    player.setSpeed(2);
    player.advance(100);
    expect(player.getState().t).toBe(before + 200);

    // replay restarts at 0 and plays
    player.replay();
    expect(player.getState().t).toBe(0);
    expect(player.getState().stepIndex).toBe(0);
    expect(player.getState().playing).toBe(true);

    player.destroy();
  });
});
