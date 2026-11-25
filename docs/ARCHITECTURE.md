# Architecture

This document explains how the stage engine, renderer, and player work together, and how to extend them for new visual effects or actor types.

## Core concepts

Every topic is modeled as a declarative `Flow`:

- **Scene**: A list of `Actor` nodes and `Link` edges on a `1000 x 600` world coordinate grid. Only actors listed in `scene.start.visible` start visible at `t = 0`; additional actors and hidden links fade in through `reveal` events.
- **Step**: One named unit of the story (`title`, `simple`, `technical`, optional `facts`, and ordered `events`).
- **Event**: An atomic visual or state change (`packet`, `stream`, `reveal`, `hide`, `focus`, `highlight`, `note`, `badge`, `screen`, `wait`, or `together`).
- **Timeline**: `compileFlow(flow)` resolves every packet route and compiles every step and event into absolute millisecond intervals `[startMs, endMs]` at `1x` speed.
- **Frame**: `frameAt(timeline, t, options)` is a pure function that takes a compiled timeline and a timestamp `t` and returns everything visible at that instant (`Frame`). Neither the SVG stage nor the sequence diagram keeps animation state of its own.

Because `frameAt(timeline, t)` is pure and deterministic, play, pause, stepping forward or backward, scrubbing, speed changes, URL deep links (`?step=N`), reduced-motion mode, and automated tests all read from one source of truth without drift.

## Timing and routing

Events inside a step execute sequentially separated by a `120 ms` gap, followed by a `300 ms` tail at the end of every step. Step intervals are contiguous starting at `t = 0`. A `together` event runs all of its children concurrently starting at its own `startMs` and lasts as long as its longest child.

- `packet`: duration is `clamp(pathLength / 0.45, 600, 1600)` ms (`fast: true` halves it).
- `stream`: `count` chips depart `140 ms` apart, each taking one packet's duration.
- `reveal` / `hide`: `300 ms` opacity fade.
- `focus`: `700 ms` `easeInOutCubic` camera pan/zoom to the bounding box of focused actors (including labels) plus `80` units of padding, widened to `5:3` aspect ratio and never narrower than `600` world units.
- `highlight`: `600 ms` emphasis ring.
- `note`: `1500 ms` event (`250 ms` fade-in and upward rise), remaining visible until the step ends (or until `totalMs` if `persist: true`).
- `badge`: `1000 ms` event setting a persistent label on an actor until replaced.
- `screen`: browser typing (`60 ms/char`), loading (`600 ms`), page (`400 ms`), terminal (`300 ms/line`), or mail (`400 ms`).
- `wait`: exact `ms`.

Routes are resolved at compile time in `src/engine/route.ts` either across explicit `via` hops or via breadth-first search over undirected links. Missing paths throw a compile error naming the topic, step, and event. Packets travel along the resolved polyline as a single `easeInOutCubic` curve.

## Motion and reduced motion

- Packet chips use a `22 px` tall rounded rectangle with `1.5 px` tone-colored border, a low-opacity tint over the opaque stage background, a `6 px` tone dot, optional lock glyph, and `11 px` `IBM Plex Mono` text in the primary text color.
- Trails draw the traveled portion of the polyline at `40%` opacity and fade over `500 ms` after arrival, accompanied by a single expanding arrival ring (`400 ms`).
- Lost packets halt at `55%` of their path, fade out over `300 ms`, and leave a `12 px` red `X` marker until the step ends.
- When `prefers-reduced-motion: reduce` is active, camera moves snap immediately, arrival rings are disabled, and packets display at the source for the first `40%` of their flight and at the destination for the rest with a static full-path line.

## Player store (`src/engine/player.ts`)

`FlowPlayerStore` is a framework-free store driven by `requestAnimationFrame`, clamping frame deltas to `50 ms` and pausing automatically when `document.hidden` becomes true. In default `"step"` mode, playback halts at the exact end of the active step until the user presses Play or Next. Home hero playback uses `"continuous"` mode.

React components read state via `usePlayerSelector(store, selector)` backed by `useSyncExternalStore`. Only `Stage` and `SequenceView` subscribe to `t`; `StepRail`, `StepPanel`, and `CaptureTable` subscribe only to `stepIndex` or `visibleCaptures` so they do not re-render every animation frame.

## Three views and the capture table

1. **Network (`src/stage/Stage.tsx`)**: SVG stage rendering links, actors (`src/stage/actors/`), screens, badges, packet trails and chips, loss markers, and callout notes.
2. **Sequence (`src/stage/SequenceView.tsx`)**: Vertical lifelines ordered by actor `x` coordinate with step bands and progressive horizontal arrows built from the same compiled timeline.
3. **What's inside (`src/stage/Inspector.tsx`)**: Nested envelope inspection of the selected packet's `layers`, with a `"What others on the network can see"` toggle that collapses `encrypted: true` layers into locked summary blocks.

`CaptureTable` displays a sticky-header table of captured frames as their packets begin, highlights the active packet, and seeks/selects on click or `Enter`.

## Extending the engine (worked example)

Suppose a future topic needs a `"pulse-wave"` event (for example, radiating Wi-Fi rings from an access point):

1. **Add the event type** in `src/engine/types.ts` and its `.strict()` Zod schema in `src/content/schema.ts`:
   ```ts
   | { type: "pulse-wave"; at: string; tone: Tone; ms?: number }
   ```
2. **Register timing** in `src/engine/registry.ts` inside `eventRegistry`:
   ```ts
   "pulse-wave": {
     duration: (event) => event.ms ?? 800,
   }
   ```
3. **Evaluate it in `frameAt`** (`src/engine/frame.ts`) when `ce.startMs <= t && t <= ce.endMs`, adding any computed geometry to `Frame`.
4. **Render it** in a dedicated SVG layer under `src/stage/layers/` and mount it inside `Stage.tsx`.
5. **Add unit tests** in `src/engine/__tests__/frame.test.ts` verifying duration and purity.
