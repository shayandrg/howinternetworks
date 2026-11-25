export type TextMode = "simple" | "technical";
export type StageViewMode = "network" | "sequence";

export interface TopicUrlState {
  step?: number; // 1-based
  mode?: TextMode;
  view?: StageViewMode;
}

export function readUrlState(): TopicUrlState {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const rawStep = params.get("step");
  const rawMode = params.get("mode");
  const rawView = params.get("view");

  const parsedStep = rawStep ? Number.parseInt(rawStep, 10) : NaN;
  const step =
    Number.isInteger(parsedStep) && parsedStep >= 1 ? parsedStep : undefined;
  const mode: TextMode | undefined =
    rawMode === "simple" || rawMode === "technical" ? rawMode : undefined;
  const view: StageViewMode | undefined =
    rawView === "network" || rawView === "sequence" ? rawView : undefined;

  return { step, mode, view };
}

export function writeUrlState(state: {
  step: number;
  mode: TextMode;
  view: StageViewMode;
}): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("step", String(state.step));
  url.searchParams.set("mode", state.mode);
  url.searchParams.set("view", state.view);
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
