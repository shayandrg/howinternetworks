# Build specification: How the Internet Works

Read this whole file before you write any code. It is the single source of truth for the project. When it is specific, do exactly what it says. When it is silent, choose the simplest option that fits it and record the choice in one line in `docs/DECISIONS.md`.

---

## 0. How you work

You are the only engineer on this project. The repository is `H:\apps\howinternetworks` (already cloned, empty, branch `main`, remote `https://github.com/shayandrg/howinternetworks`).

1. Work through the milestones in section 11 in order, M0 to M9. Do not start a milestone until the previous one has passed its gate.
2. A gate passes only when every listed command exits with code 0 and every checklist item is true. Do not mark a gate as passed because the code "should" work.
3. At the start of each milestone, re-read the sections of this file that the milestone names.
4. Commit after every milestone and after every content topic, with the message given. Never push, never force, never rewrite history. The owner reviews and pushes.
5. Keep `PROGRESS.md` current: milestones done, the topic you are on, gate results, open problems. If your session ends for any reason, the next session continues from `PROGRESS.md`.
6. Do not ask the owner questions unless you are truly blocked (a required file is missing, an install fails twice). Decide, log it in `docs/DECISIONS.md`, continue.
7. Never invent a technical fact. Every number, port, flag, field name, message name, timer and RFC number in the content must come from the research pack AND be confirmed by the RFC or official spec listed in that topic's sources. If you cannot confirm it, leave it out, or keep it and set the topic to `status: "draft"` with the open question in `reviewNotes`.
8. Never copy text, code, artwork or layout from the research pack or the original site into the repository. Facts are free to use. Wording and code are not: the original has no license. Write every sentence yourself. `npm run originality` enforces this for text.
9. Use the latest stable versions npm installs today. Do not pin versions from memory. When an API does not behave the way you remember, read the installed package's types and README in `node_modules` instead of guessing.
10. This is a Windows machine. npm scripts run under `cmd.exe`, so `&&` works inside `package.json` scripts, but bash-only syntax (`rm -rf`, `export X=`, `$VAR`) does not. Use `rimraf` or `cross-env` if you need them.
11. Before you call anything done, run it. A page you never opened is not finished.
12. If a tool you would need is not available to you (no browser, no screenshots, no web access), do the closest check you can and write exactly what you could not verify in `PROGRESS.md`. Never claim a check you did not run.

---

## 1. What we are building

**Product.** A free, open-source, interactive atlas of how the internet works. People watch data move between devices one step at a time, read a short plain-language caption for each step, and can open any message to see what is inside it.

**Audience.** Curious beginners first: students, junior developers, anyone who has wondered what happens when they press Enter. A Technical mode serves engineers.

**Principles.**
- Easy first. The default mode is Simple: one or two short sentences per step, no unexplained jargon. Technical mode adds the precise detail.
- Show, then tell. Every step has an animation. The text explains what the animation just showed.
- One step at a time. The player pauses at the end of each step. The reader moves on when ready.
- Correct. Every fact traces to an RFC or official spec, and the sources are listed on the page.
- Open. Code under MIT, content under CC BY-SA 4.0. A contributor adds a topic by adding one file.
- Built to grow. Protocols are only the first collection. The same engine will later show journeys (what happens when you open a website, end to end), infrastructure (undersea cables, CDNs, exchange points), security (certificates, VPNs, Tor) and history. Nothing in the engine may assume that a topic is a protocol.

**Credit.** The idea comes from Protocol Explorer by Dilum Sanjaya (https://protocol-explorer-alpha.vercel.app/, https://x.com/DilumSanjaya). We use it as a fact checklist only. Our design, code and text are original. Credit it on the About page and in the README with exactly this sentence: "Inspired by Protocol Explorer by Dilum Sanjaya. No code or text was copied."

---

## 2. Inputs: the research pack

Folder: `H:\apps\howinternetworks-research\` (outside the repo). Read its `README.md` first.

- `live-lessons/INDEX.md`: the 39 topics of the original site.
- `live-lessons/NN-<id>.md`: one readable fact sheet per topic. Values written as `${...}` were computed by the original code: recompute them with our builders (section 6.5).
- `live-lessons/NN-<id>.raw.js`: minified source of that topic. Use it only for packet details the `.md` lacks.
- `extracted-repo-14/lessons.ts` and `types.ts`: readable source of the first 14 topics. The best place for packet-level detail of those 14.
- `VERIFICATION.md`: what has already been checked.
- `VERIFICATION-findings.md`: per-topic ERROR, MISLEADING and CONTESTED items. Fix every ERROR and MISLEADING item in our version. Phrase every CONTESTED item neutrally. Where this file disagrees with the topic table in section 6.3, the findings file wins; log the change in `docs/DECISIONS.md`.

If the folder is missing, stop and tell the owner. Do not scrape the original site yourself.

Never copy any file from this folder into the repo. Add nothing from it to git.

---

## 3. Tech stack (decided, do not change)

- **Next.js** (latest, App Router), **React**, **TypeScript** with `strict: true`. Static export: `output: "export"`. No server code, no API routes, no database, no analytics, no cookies.
- **Tailwind CSS v4** exactly as `create-next-app` sets it up: `@import "tailwindcss";` plus an `@theme` block in `src/app/globals.css`. Do not create `tailwind.config.js`. Do not write v3 syntax such as `@tailwind base;`.
- **zod** for content schemas. Infer TypeScript types from the schemas with `z.infer`.
- **lucide-react** for interface icons only (16 or 18 px, stroke 1.5, color of the secondary or muted text). Device artwork on the stage is our own SVG.
- **No animation library.** The stage is our own deterministic timeline (section 5) rendered as SVG by React.
- **Vitest** for unit tests. **Playwright** (Chromium only) for end-to-end tests. **tsx** to run TypeScript scripts. **serve** to serve `out/` during e2e tests.
- **Fonts** with `next/font/google`: IBM Plex Sans for the interface and IBM Plex Mono for data (addresses, ports, packet labels, the capture table). Reason: Plex comes from engineering documentation, which fits a reference work, and the family has Arabic and Hebrew companions for future right-to-left translations. Mono is never used for headings. Plex is not a variable font, so pass weights explicitly: `IBM_Plex_Sans({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex-sans" })` and `IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-plex-mono" })`, then map them in the `@theme` block (`--font-sans`, `--font-mono`).
- **Dark mode with Tailwind v4**: the theme is a `data-theme="light" | "dark"` attribute on `<html>`. Add this line to `globals.css` so `dark:` follows it instead of the system setting: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`. Define every colour token as a CSS variable for light on `:root` and override it under `[data-theme=dark]`.
- **Hosting**: any static host. Vercel is the recommended target. GitHub Actions runs the checks.

### 3.1 Next.js static export rules (read before coding)

- Every dynamic route exports `generateStaticParams()` and `export const dynamicParams = false`.
- `params` is a Promise in pages, layouts and `generateMetadata`: `const { slug } = await params;`
- Do not read `searchParams` in server components; a static export has none. Read query parameters on the client in `useEffect` from `window.location.search`, or wrap any component that calls `useSearchParams()` in `<Suspense>`.
- `next.config.ts`: `output: "export"`, `images: { unoptimized: true }`, `trailingSlash: true`.
- `src/app/sitemap.ts` and `src/app/robots.ts` both need `export const dynamic = "force-static";`.
- No `Math.random()`, `Date.now()`, `window` or `localStorage` during render. Browser-only code runs in `useEffect` or in event handlers. This prevents hydration errors.
- Pages are server components. They import a topic's data and pass it to a client component. Topic data must therefore be plain, JSON-serializable data: no functions, no class instances, no `undefined` values that matter, no `Date` objects.
- Lint with the script `create-next-app` generated. Recent Next.js versions removed `next lint`; if so the script is `eslint .`.

---

## 4. Repository layout

Create this structure. Names are exact.

```
.github/
  workflows/ci.yml
  ISSUE_TEMPLATE/report-an-error.yml
  ISSUE_TEMPLATE/propose-a-topic.yml
  pull_request_template.md
docs/
  SPEC.md                 copy of this file
  ARCHITECTURE.md         engine and stage, how to extend them
  CONTENT-GUIDE.md        how to write and verify a topic
  DECISIONS.md            one line per decision this spec did not make
scripts/
  check-originality.ts
src/
  site.config.ts          site name, repo URL, edit URL pattern, issue URL
  app/
    layout.tsx            ONLY <html>, <body>, fonts, globals.css and the theme script. No header, no footer.
    globals.css  not-found.tsx  sitemap.ts  robots.ts
    (site)/
      layout.tsx          Header, <main>, Footer, the search dialog
      page.tsx            home
      learn/[slug]/page.tsx
      topics/page.tsx
      glossary/page.tsx
      about/page.tsx
      dev/stage/page.tsx  (renders only in development)
    (embed)/
      layout.tsx          no header, no footer
      embed/[slug]/page.tsx
  content/
    schema.ts             zod schemas and inferred types
    world.ts              the shared example world (section 6.4)
    groups.ts             collections and groups
    glossary.ts           glossary terms
    index.ts              the list of all topics, in display order
    builders/             tcp.ts dns.ts tls.ts http.ts arp.ts dhcp.ts sizes.ts layers.ts (add more as needed)
    flows/                one file per topic: dns.ts, tcp.ts, ...
    flows/_kitchen-sink.ts  dev-only flow that uses every event and actor kind
    __tests__/content.test.ts  builders.test.ts
  engine/
    types.ts  compile.ts  route.ts  frame.ts  easing.ts  camera.ts  player.ts  registry.ts
    __tests__/compile.test.ts  frame.test.ts  route.test.ts  player.test.ts  layout.test.ts
  stage/
    Stage.tsx             the SVG stage (network view)
    actors/               one component per actor kind + index.ts registry
    layers/               Links.tsx Packets.tsx Markers.tsx Notes.tsx Badges.tsx Screens.tsx
    PacketChip.tsx        the shared chip (stage, sequence, table, inline text)
    SequenceView.tsx
    CaptureTable.tsx
    Inspector.tsx         "What's inside": nested layers of a packet
  components/
    flow/                 FlowPlayer.tsx StepRail.tsx StepPanel.tsx Transport.tsx RichText.tsx GlossaryTerm.tsx Facts.tsx TryIt.tsx Sources.tsx Legend.tsx ShortcutsDialog.tsx
    site/                 Header.tsx Footer.tsx SearchDialog.tsx ThemeToggle.tsx LayerMap.tsx StartHere.tsx TopicCard.tsx
  lib/
    search.ts  url-state.ts  keyboard.ts  rich-text.ts
tests/e2e/
  site.spec.ts  flows.spec.ts
LICENSE                   MIT, "Copyright (c) 2026 How the Internet Works contributors"
LICENSE-CONTENT           short notice: everything in src/content/ is CC BY-SA 4.0, with a link to https://creativecommons.org/licenses/by-sa/4.0/
README.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md  ROADMAP.md  PROGRESS.md
```

`src/site.config.ts` holds every URL the site uses: name `How the Internet Works`, repo `https://github.com/shayandrg/howinternetworks`, edit pattern `https://github.com/shayandrg/howinternetworks/edit/main/src/content/flows/{slug}.ts`, new issue URL `https://github.com/shayandrg/howinternetworks/issues/new`. No other file hardcodes these.

---

## 5. The stage engine

This is the heart of the project. Read this section completely before M2 and M3.

### 5.1 Concepts

- **Scene**: actors (devices and places) and links (cables, radio, tunnels) placed on a world grid 1000 wide and 600 tall.
- **Step**: one titled part of the story, with its text and an ordered list of events.
- **Event**: one thing that happens on the stage: a packet travels, a note appears, the camera moves.
- **Timeline**: every event of every step compiled into absolute start and end times (milliseconds at 1x speed), plus the start and end of each step.
- **Frame**: everything visible at time `t`. `frameAt(timeline, t)` is a pure function. The renderer draws a Frame and nothing else. No component keeps its own animation state.

Why this design (write it into `docs/ARCHITECTURE.md`): any moment can be computed directly, so play, pause, step back, scrub, speed change, deep links, reduced motion and tests all come from one function. Nothing drifts out of sync.

### 5.2 Types

Put these in `src/engine/types.ts`. The zod schemas in `src/content/schema.ts` must produce the same shapes.

```ts
export type ActorKind =
  | "laptop" | "phone" | "desktop" | "router" | "switch" | "access-point" | "modem"
  | "server" | "dns-server" | "web-server" | "mail-server" | "file-server" | "vpn-server"
  | "proxy" | "load-balancer" | "cloud" | "camera" | "tv-box" | "plc" | "person";

export interface Actor {
  id: string;                    // kebab-case, unique in the scene
  kind: ActorKind;
  label: string;                 // "Your laptop"
  sublabel?: string;             // "192.168.1.10"
  at: { x: number; y: number };  // centre of the actor in world units (0..1000, 0..600)
}
// Which actors are visible at t = 0 is decided only by flow.scene.start.visible.
// Everything else appears through a "reveal" event.

export type LinkMedium = "ethernet" | "wifi" | "fiber" | "internet" | "tunnel";

export interface Link {
  id: string;
  from: string;                  // actor id
  to: string;                    // actor id
  medium: LinkMedium;
  hidden?: boolean;              // starts hidden even when both ends are visible (for example a tunnel)
}
// A link is drawn only when it is not hidden AND both of its actors are visible.

export type Tone =
  | "lookup"     // DNS, ARP, discovery
  | "handshake"  // TCP and QUIC setup and teardown
  | "request"
  | "response"
  | "secure"     // TLS, SSH, VPN, keys, anything encrypted
  | "control"    // ICMP, keepalives, bare ACKs, signalling
  | "data"       // bulk payload, media
  | "error";     // loss, reset, unreachable

export interface Field { name: string; value: string; note?: string }

export interface Layer {
  name: string;                  // "Ethernet II", "IPv4", "TCP", "TLS 1.3 record", "HTTP/1.1"
  fields: Field[];
  encrypted?: boolean;           // hidden in the "What others can see" view
  summary?: string;              // one line shown when collapsed
}

export interface Capture {
  time: number;                  // simulated seconds since the topic started, e.g. 0.024
  src: string;                   // address as text
  dst: string;
  protocol: string;              // "DNS", "TCP", "TLSv1.3"
  info: string;                  // "Standard query A www.example.com"
  bytes: number;                 // frame length as a packet capture shows it (no FCS)
}

export type ScreenSpec =
  | { app: "browser"; url: string; secure?: boolean; state: "typing" | "loading" | "page" }
  | { app: "terminal"; lines: string[] }
  | { app: "mail"; state: "compose" | "sent" | "inbox"; subject?: string };

export type StageEvent =
  | { type: "packet"; id: string; from: string; to: string; via?: string[]; tone: Tone; label: string;
      lines?: string[]; locked?: boolean; lost?: boolean; fast?: boolean; layers?: Layer[]; capture?: Capture }
  | { type: "stream"; id: string; from: string; to: string; via?: string[]; tone: Tone; label: string;
      count: number; locked?: boolean; lostIndexes?: number[]; layers?: Layer[]; captures?: Capture[] }
  | { type: "reveal"; actors?: string[]; links?: string[] }
  | { type: "hide"; actors?: string[]; links?: string[] }
  | { type: "focus"; actors: string[] }                         // camera frames these actors
  | { type: "highlight"; actors: string[] }                     // short emphasis on actors
  | { type: "note"; id: string; at: string; text: string; tone?: Tone; persist?: boolean }
  | { type: "badge"; at: string; text: string; tone?: Tone }    // lasting state label, e.g. "Cached for 1 h"
  | { type: "screen"; at: string; screen: ScreenSpec }
  | { type: "wait"; ms: number }
  | { type: "together"; events: StageEvent[] };                 // children run at the same time

export interface Fact { label: string; value: string }

export interface Step {
  id: string;                    // kebab-case, unique in the topic, stable forever (used in URLs and issues)
  title: string;
  simple: string;
  technical: string;
  facts?: Fact[];
  events: StageEvent[];
}
```

### 5.3 Timing rules (at 1x speed)

- Events inside a step run one after another, with 120 ms between them. A `together` event runs its children at the same moment and lasts as long as the longest child.
- `packet`: duration = path length in world units / 0.45, clamped to 600..1600 ms. `fast: true` halves it (used for handshakes and bare ACKs).
- `stream`: `count` chips leave 140 ms apart; each one moves like a packet.
- `reveal` and `hide`: 300 ms fade.
- `focus`: 700 ms camera move.
- `highlight`: 600 ms.
- `note`: the event lasts 1500 ms (250 ms fade in, then reading time) so the next event waits for it. The note stays visible until the step ends (or until the topic ends if `persist`).
- `badge`: the event lasts 1000 ms (250 ms fade in). The badge stays until another badge replaces it on the same actor.
- `screen`: browser `typing` takes 60 ms per character of the URL, `loading` 600 ms, `page` 400 ms; terminal lines appear 300 ms apart; mail states 400 ms.
- `wait`: exactly `ms`.
- Every step ends with a 300 ms tail. Step boundaries are contiguous: step 1 starts at 0, step n+1 starts where step n ends.

### 5.4 Routing

- With `via`, the path is `from -> via[0] -> ... -> to`, and every consecutive pair must be joined by a link.
- Without `via`, find the shortest path over links with breadth-first search.
- No path is a compile error naming the topic, step and event. The content tests catch it.
- The geometry is the polyline through the actor centres. A packet moves along the whole polyline with one easing (`easeInOutCubic`), not per segment.

### 5.5 Frame

```ts
export interface Frame {
  t: number;
  stepIndex: number;
  stepProgress: number;                         // 0..1 inside the current step
  camera: { x: number; y: number; w: number; h: number };   // the SVG viewBox
  actors: Array<{ id: string; opacity: number; highlight: number; pulse: number;
                  badge?: { text: string; tone?: Tone }; screen?: ScreenSpec & { progress: number } }>;
  links: Array<{ id: string; opacity: number }>;
  packets: Array<{ key: string; eventId: string; tone: Tone; label: string; locked: boolean;
                   x: number; y: number; opacity: number; lost: boolean;
                   trail: Array<[number, number]>; trailOpacity: number }>;
  markers: Array<{ key: string; x: number; y: number; kind: "lost" }>;
  notes: Array<{ id: string; at: string; text: string; tone?: Tone; opacity: number; rise: number }>;
  visibleCaptures: number;                      // capture rows whose packet has started
  currentPacketId?: string;                     // the most recent packet that started
}
```

Persistent state (revealed actors, badges, screens, camera target) at time `t` comes from replaying all events that started before `t`. Going backwards must give exactly the same frame as computing it fresh.

### 5.6 Motion details (what makes the stage feel professional)

- **Packet chip**: rounded rectangle, height 22, radius 6, horizontal padding 8. Fill: the tone colour at low opacity over the stage surface. Border: 1.5 px in the tone colour. A 6 px dot of the tone colour before the label. Label in IBM Plex Mono 11 px, in the primary text colour (never the tone colour, so contrast always passes). Optional small lock glyph after the dot when `locked`.
- **Trail**: the part of the path already travelled is drawn as a 2 px line in the tone colour at 40% opacity. After arrival it fades out over 500 ms.
- **Arrival**: one ring grows from the receiving actor (radius +0 to +14, opacity 0.5 to 0, 400 ms). Once, never looping.
- **Loss**: the chip stops at 55% of the path, fades to 40% opacity and disappears over 300 ms. A 12 px red X marker appears where it stopped and stays until the step ends.
- **Camera**: the viewBox moves from the current box to the target over 700 ms with `easeInOutCubic`. The target is the bounding box of the focused actors including their labels, plus 80 units of padding, widened to the stage aspect ratio (5:3). Never zoom closer than a viewBox 600 units wide.
- **Links**: `ethernet` solid 1.5 px; `wifi` dashed 1.5 px; `fiber` two parallel hairlines; `internet` dashed 1 px in the muted colour; `tunnel` a 10 px wide band at 12% opacity under the path it wraps.
- **Notes**: a small callout above the actor with a short leader line. Fade in and rise 8 units.
- **Speed** multiplies the clock: 0.5x, 1x, 1.5x, 2x.
- **Reduced motion** (`prefers-reduced-motion: reduce`): the camera cuts instead of moving, arrival rings are off, and a packet is shown at its source for the first 40% of its time and at its destination for the rest (150 ms crossfade) with its full path drawn as a static line while it is in flight. Pacing stays the same.
- Animate only SVG transforms and opacity. Never animate width, height, layout or filters. No glows, no blur, no drop shadows on the stage.

### 5.7 Player

`src/engine/player.ts` is a small store with no React inside, plus a hook.

- State: `t`, `playing`, `speed` (0.5, 1, 1.5, 2), `mode` ("step" or "continuous"), `stepIndex` (derived from `t`).
- Actions: `play()`, `pause()`, `toggle()`, `next()` (jump to the start of the next step and play it), `prev()` (if more than 300 ms into the current step, jump to its start; otherwise to the start of the previous step), `goTo(stepIndex)`, `seek(t)`, `setSpeed()`, `replay()`.
- In "step" mode (the default) playback stops exactly at the end of the current step. Play or Next continues with the next step. The home page uses "continuous" mode.
- Clock: `requestAnimationFrame`; clamp each frame's delta to 50 ms so a background tab does not jump; pause when `document.hidden`.
- React access through `useSyncExternalStore` with selectors. Only the Stage and the Sequence view subscribe to `t`. The step rail, the step panel and the capture table subscribe to `stepIndex` or `visibleCaptures`, so they do not re-render 60 times a second. Selectors must return primitives or memoized values.

### 5.8 Extending the engine (the registry)

`src/engine/registry.ts` maps each event `type` to `{ duration(event, ctx), apply(frameBuilder, event, progress, ctx) }`. `src/stage/actors/index.ts` maps each `ActorKind` to `{ Component, width, height }`. Every built-in event and actor is registered this way. A future topic that needs something new (radio waves for Wi-Fi, light pulses in fiber, a satellite) adds one registry entry, its schema and its renderer, and touches nothing else. Document the exact steps in `docs/ARCHITECTURE.md` with a short worked example.

### 5.9 The three views

- **Network** (default): the Stage.
- **Sequence**: built from the same timeline. One vertical lane per actor that sends or receives a packet, ordered by the actor's x position. Each packet is an arrow from lane to lane, drawn progressively as `t` advances, with its chip as the label. Lost packets end at 55% with the X marker. Steps are horizontal bands with their titles at the left. The view scrolls to keep the current time visible.
- **What's inside** (the Inspector, a panel, not a tab): the layers of the selected packet as nested envelopes, outermost layer largest, each inner layer inset 12 px. Each layer shows its name and a two-column list of fields (name, value in mono). A switch "What others on the network can see" collapses every `encrypted` layer into one locked block that says "Encrypted" and its size, hiding its fields. The selected packet is the current packet unless the reader clicks a capture row or an inline chip.

### 5.10 Capture table

A real `<table>` with a sticky header: No., Time, Source, Destination, Protocol, Info, Size. Rows appear as their packets start. The current packet's row is highlighted. Clicking a row (or pressing Enter on it) seeks to the moment that packet starts and selects it in the Inspector. Numbers use `tabular-nums` in IBM Plex Mono. The table shows 6 rows and scrolls; on mobile it is collapsed behind a "Show captured packets" button.

---

## 6. Content model

### 6.1 Topic

```ts
export interface TopicMeta {
  slug: string;              // URL id, kebab-case, unique: "dns"
  kind: "flow";              // later: "article", "tool"
  collection: "protocols";   // later: "journeys", "infrastructure", "security", "web", "history"
  group: GroupId;            // section 6.3
  title: string;             // "DNS"
  fullName?: string;         // "Domain Name System"
  tagline: string;           // at most 60 characters: "How names become addresses"
  layer?: { tcpip: "link" | "internet" | "transport" | "application"; osi?: 1 | 2 | 3 | 4 | 5 | 6 | 7; note?: string };
  prerequisites: string[];   // slugs
  related: string[];         // slugs
  tags: string[];
  sources: Array<{ label: string; url: string }>;   // at least one RFC or official spec
  status: "draft" | "reviewed";
  lastVerified: string;      // YYYY-MM-DD
  reviewNotes?: string[];    // required when status is "draft"
}

export interface TryIt {
  title: string;
  explain: string;           // what to look for, without promising exact output
  commands: Array<{ os: "windows" | "macos" | "linux"; cmd: string }>;
}

export interface Flow {
  meta: TopicMeta;
  intro: { simple: string; technical: string };
  facts: Fact[];             // 4 to 6 key facts: ports, transport, defined in, ...
  scene: { actors: Actor[]; links: Link[]; start: { visible: string[]; focus: string[] } };
  legend?: Array<{ tone: Tone; label: string }>;   // default: built from the tones used
  steps: Step[];             // 4 to 8 steps
  outro: { title: string; simple: string; technical: string; facts: Fact[] };
  tryIt?: TryIt[];
}
```

Each topic file exports one `Flow` created with a `defineFlow()` helper that only returns its argument with the right type. Validation happens in the tests, not at runtime. Every zod object schema uses `.strict()`, so a misspelled key fails the tests instead of being silently dropped.

`src/content/index.ts` exports `topics` (every public topic in display order) and `getTopic(slug)`. The kitchen-sink flow is not in `topics`. It must compile and pass the engine tests, but it is exempt from the content rules 4, 8, 9 and 10 of section 9.2.

Glossary entries (`src/content/glossary.ts`):

```ts
export interface GlossaryTerm {
  id: string;        // kebab-case, used in [[id]] and in /glossary#id
  term: string;      // "Resolver"
  short: string;     // at most 160 characters, shown in the popover
  long?: string;     // at most 600 characters, shown on /glossary
  aka?: string[];    // other names: ["recursive resolver", "DNS resolver"]
}
```

Glossary text follows the same writing rules as topics (6.6) and is checked by the originality script.

### 6.2 Inline markup in `simple` and `technical`

- `[[term-id]]` or `[[term-id|shown text]]`: a glossary term. Rendered as a dotted-underlined button that opens a small popover with the term's short definition on hover, focus or tap, and a link to `/glossary#term-id`.
- `{{packet-id}}`: an inline packet chip showing that packet's label and tone. Hovering or focusing it highlights the same packet on the stage and its row in the capture table. The id must be a `packet` or `stream` event in the same step.
- `` `code` ``: a literal value (a port, a command, a header).
- Nothing else. No bold, no italics, no HTML.

### 6.3 The 39 topics, groups and order

Groups (id, label), in this display order: `joining` "Joining a network", `routing` "Finding the way", `delivery` "Delivering data", `names` "Names", `web` "The web", `security` "Security and privacy", `email` "Email", `files` "Files and sharing", `calls` "Calls and video", `machines` "Clocks and machines".

| Wave | Slug | Title | Research file | Group | TCP/IP layer | OSI | Layer note |
|---|---|---|---|---|---|---|---|
| 1 | dns | DNS | 06-dns | names | application | 7 | |
| 1 | tcp | TCP | 03-tcp | delivery | transport | 4 | |
| 1 | http | HTTP | 01-http | web | application | 7 | |
| 1 | udp | UDP | 04-udp | delivery | transport | 4 | |
| 1 | ip | IP | 05-ip | routing | internet | 3 | Covers IPv4, ARP and NAT |
| 1 | dhcp | DHCP | 07-dhcp | joining | application | 7 | Runs over UDP to set up layer 3 |
| 1 | icmp | ICMP | 08-icmp | routing | internet | 3 | |
| 1 | tls | TLS | 14-tls | security | application | (none) | Sits between TCP and the application. Often called layer 6, but it does not map neatly onto OSI |
| 1 | https | HTTPS | 02-https | web | application | 7 | |
| 1 | ssh | SSH | 13-ssh | security | application | 7 | |
| 1 | smtp | SMTP | 09-smtp | email | application | 7 | |
| 1 | imap | IMAP | 11-imap | email | application | 7 | |
| 1 | pop3 | POP3 | 10-pop3 | email | application | 7 | |
| 1 | ftp | FTP | 12-ftp | files | application | 7 | |
| 2 | ethernet | Ethernet | 34-ethernet | joining | link | 2 | Also defines the physical layer |
| 2 | wifi | Wi-Fi | 16-wifi | joining | link | 2 | Also defines the physical layer |
| 2 | wpa3 | WPA3 | 17-wpa3 | joining | link | 2 | |
| 2 | ipv6 | IPv6 | 25-ipv6 | joining | internet | 3 | |
| 2 | quic | QUIC | 24-quic | delivery | transport | 4 | Runs over UDP and includes TLS 1.3 |
| 2 | dns-over-https | DNS over HTTPS | 27-doh | names | application | 7 | |
| 2 | dnssec | DNSSEC | 28-dnssec | names | application | 7 | |
| 2 | ntp | NTP | 26-ntp | machines | application | 7 | |
| 2 | websocket | WebSocket | 15-websocket | web | application | 7 | |
| 2 | http-proxy | HTTP proxy | 19-proxy | web | application | 7 | |
| 2 | reverse-proxy | Reverse proxy | 21-reverse | web | application | 7 | |
| 2 | captive-portal | Captive portal | 18-portal | joining | application | 7 | |
| 2 | socks5 | SOCKS5 | 20-socks | security | application | (none) | Often placed at layer 5 |
| 2 | wireguard | WireGuard | 22-wireguard | security | internet | 3 | Carries IP packets inside UDP |
| 2 | ipsec | IPsec | 23-ipsec | security | internet | 3 | |
| 2 | bgp | BGP | 32-bgp | routing | application | 7 | Runs over TCP but decides routing at layer 3 |
| 2 | radius | RADIUS and 802.1X | 29-radius | joining | application | (none) | RADIUS runs over UDP; the 802.1X login it carries controls layer 2 access |
| 2 | pppoe | PPPoE | 35-pppoe | joining | link | 2 | |
| 2 | smb | SMB | 30-smb | files | application | 7 | |
| 2 | webrtc | WebRTC | 33-webrtc | calls | application | 7 | |
| 2 | sip | SIP | 36-sip | calls | application | 7 | |
| 2 | rtsp | RTSP | 37-rtsp | calls | application | 7 | |
| 2 | rtmp | RTMP | 39-rtmp | calls | application | 7 | |
| 2 | igmp | IGMP | 38-igmp | routing | internet | 3 | |
| 2 | modbus | Modbus TCP | 31-modbus | machines | application | 7 | |

Prerequisites to use (the rest are your choice): tcp needs ip; http needs dns and tcp; tls needs tcp; https needs http and tls; quic needs udp and tls; dns-over-https needs dns and https; dnssec needs dns; email topics need tcp and tls.

### 6.4 The shared world (`src/content/world.ts`)

All topics use the same example world so readers build one mental picture. Export these as constants and use only them. Add a new real-world value only with a comment naming its source.

- Home network `192.168.1.0/24`. Your laptop `192.168.1.10`, home router LAN `192.168.1.1`, router WAN `198.51.100.7`.
- MAC addresses from the documentation range of RFC 7042: laptop `00:00:5e:00:53:01`, router `00:00:5e:00:53:02`, others `:03` onward.
- DNS resolver `8.8.8.8` (real, well known). Root server a.root-servers.net `198.41.0.4`, .com server a.gtld-servers.net `192.5.6.30` (both real). Authoritative server for example.com `198.51.100.53`.
- Web server for www.example.com `203.0.113.10`.
- Mail: Alice's provider `198.51.100.25`, Bob's provider `203.0.113.25`.
- Autonomous system numbers only from 64496 to 64511 (RFC 5398): your ISP 64500, transit 64510, hosting 64511.
- IPv6 only inside `2001:db8::/32` (RFC 3849) plus link-local `fe80::/10`.
- Domains only `example.com`, `example.net`, `example.org` and their subdomains (RFC 2606).
- People: "you", Alice and Bob.
- Ephemeral client ports: start at `52344` and use the values from the research pack where it has them.

The content tests reject any IPv4 address outside: the constants above, RFC 1918 private ranges, RFC 5737 documentation ranges, `100.64.0.0/10`, `169.254.0.0/16`, `224.0.0.0/4`, `0.0.0.0` and `255.255.255.255`.

### 6.5 Builders

`src/content/builders/` holds functions that return correct events, layers and capture rows, so every topic computes sizes the same way. At least: `tcpHandshake`, `tcpClose`, `tcpAck`, `dnsQuery`, `dnsResponse`, `tlsHandshake13`, `httpRequest`, `httpResponse`, `arpRequest`, `arpReply`, `dhcpMessage`. Add more as topics need them.

Size rules (in `sizes.ts`): Ethernet II header 14 bytes, IPv4 header 20, IPv6 header 40, UDP header 8, TCP header 20 plus options, a frame is padded to at least 60 bytes (capture length without FCS), MSS 1460 for a 1500-byte MTU over IPv4.

Required builder tests with known answers (all verified):
- DNS query for `www.example.com`, type A, over IPv4/UDP: 75 bytes.
- The response with one A record using a name pointer: 91 bytes.
- TCP SYN with 12 bytes of options (MSS, NOP, window scale, NOP, NOP, SACK permitted): 66 bytes.
- A bare TCP ACK: 54 bytes of headers, padded to 60.
- A 12,500-byte HTTP body splits into 9 TCP segments at MSS 1460.

### 6.6 Writing rules (copy these into `docs/CONTENT-GUIDE.md`)

- `simple`: one or two sentences, at most 220 characters, everyday words. Name the actor: "Your laptop asks the resolver", not "A query is sent". Every acronym is a glossary link on its first use in the step. An analogy only when it is accurate and short.
- `technical`: at most 700 characters. Precise: message names, flags, ports, sizes, timers, the RFC's own terms.
- Step title: sentence case, at most 32 characters, starting with a verb when possible: "Ask the resolver".
- `tagline`: at most 60 characters, says what the protocol does for the reader.
- One idea per step. If a step needs more than three events or more than two new terms, split it.
- Time-sensitive numbers (how many networks exist, how many sites use something) need "about" plus a year, or they go.
- Historical claims (an outage, a date) need a source in `sources`.
- Never: the em dash character, exclamation marks, emoji, "simply", "just", "easy", "magic", "seamless", "powerful", "Press replay", "In this lesson", ALL CAPS words other than protocol names, flags and message names (SYN, ACK, GET, EHLO).
- Write in your own words. Read the research sheet, close it, then write.

### 6.7 Try-it commands

Use only these unless you have confirmed another one. Never promise exact output.

| Purpose | Windows | macOS | Linux |
|---|---|---|---|
| Look up a name | `nslookup www.example.com` or `Resolve-DnsName www.example.com` | `dig www.example.com` | `dig www.example.com` |
| Ping | `ping -n 4 example.com` | `ping -c 4 example.com` | `ping -c 4 example.com` |
| Trace the route | `tracert example.com` | `traceroute example.com` | `traceroute example.com` or `tracepath example.com` |
| Fetch a page and see headers | `curl.exe -v http://example.com` (type `curl.exe`: in Windows PowerShell 5.1, `curl` is an alias of `Invoke-WebRequest`) | `curl -v http://example.com` | `curl -v http://example.com` |
| See a TLS handshake | `openssl s_client -connect example.com:443 -servername example.com` (in Git Bash) | same | same |
| Your addresses | `ipconfig /all` | `ifconfig` | `ip addr` |
| ARP / neighbour table | `arp -a` | `arp -a` | `ip neigh` |
| Routing table | `route print` | `netstat -rn` | `ip route` |
| Open connections | `netstat -ano` | `netstat -an` | `ss -tunap` |
| SSH with details | `ssh -v user@host` | same | same |

---

## 7. Design direction

Follow this direction everywhere. Write the reason for every major visual decision into `docs/DECISIONS.md` in one line each.

- **Product**: a free, open atlas that shows people what their devices send across the internet, one step at a time.
- **Character**: exact, patient, curious.
- **World**: a network engineer's bench: patch cables, labelled ports, printed RFCs, a packet capture on screen.
- **Moments** (the only places with rich colour and detail): the stage, where devices are clean illustrated objects and packets travel as coloured chips; and the "What's inside" envelope view, where a packet opens into its nested layers.
- **Signature**: the packet chip. The same chip appears on the stage, in the sequence view, in the capture table and inline in the step text, so words always connect to moving data. Use it nowhere else (not for tags, not for buttons).
- **Dials**: ENERGY 2, RHYTHM 2, MOTION 2. The stage moves; the chrome stays still.

### 7.1 Tokens

Neutral ramp "ink". Ship light and dark themes with a toggle; the default follows the system. Set the theme before paint with a tiny inline script in `<head>` that reads `localStorage` inside `try/catch`, and put `suppressHydrationWarning` on `<html>`.

| Role | Light | Dark |
|---|---|---|
| Page background | `#f5f7fa` | `#0b0d14` |
| Card / panel | `#ffffff` | `#11141c` |
| Stage surface | `#ffffff` | `#0f121a` |
| Raised (active row, input) | `#eceff4` | `#1a1e28` |
| Hairline | primary text at 8% | primary text at 8% |
| Primary text | `#111827` | `#eef0f5` |
| Secondary text | `#4b5565` | `#a3a9b8` |
| Muted text (meta only) | `#6b7487` | `#7a8296` |
| Accent (selection, primary action, focus ring) | `#2456d6` | `#7aa2ff` |

On dark, the primary button is `#eef0f5` with `#0b0d14` text, and the accent lives in selection and focus. Semantic colours: positive `#16a34a` / `#4cc38a`, negative `#dc2626` / `#e5484d`.

Tone colours (stage moments only):

| Tone | Light | Dark | Default legend label |
|---|---|---|---|
| lookup | `#2f6fde` | `#6ea0ff` | Lookup |
| handshake | `#1f9d6a` | `#4cc38a` | Handshake |
| request | `#c27c0e` | `#f0b450` | Request |
| response | `#7c4fd6` | `#a98bf5` | Response |
| secure | `#0f8a8a` | `#3fc6c0` | Encrypted |
| control | `#5b6474` | `#9aa3b2` | Control |
| data | `#1d8fc4` | `#5cc0ec` | Data |
| error | `#d0393e` | `#e5484d` | Lost or refused |

Use logical CSS properties (`margin-inline-start`, `padding-inline`, `inset-inline-end`, Tailwind `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) instead of left and right, so a right-to-left translation later needs no layout rewrite. The stage SVG is the one exception: it never mirrors.

Spacing on a 4 px grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96). Radius: tags and keycaps 4 to 6, buttons and inputs 8, cards 12 to 16, panels 16. Inner radius = outer radius minus padding, never below 4. Depth on dark comes from surface steps and hairlines, never shadows. On light, at most `0 1px 2px rgba(0,0,0,0.05)`.

Type scale: meta 12/16, captions 13 to 14/20, body 15/22, step text in Simple mode 17/26, page title 32/1.15, home headline 56 to 64 desktop and 36 to 40 mobile at weight 500 with -0.02em tracking. Weights 400 and 500, 600 at most for rare emphasis. Sentence case everywhere. No uppercase tracked labels. Numbers use `tabular-nums`.

Chrome motion: one easing `cubic-bezier(0.22, 1, 0.36, 1)`; hovers and toggles 120 to 180 ms; menus and popovers 160 to 220 ms; panels 300 ms. Transition only colour, background, border, opacity and transform, named explicitly (never `transition-all`). No hover scaling on cards. No looping animation in the chrome.

Banned outright: gradients on surfaces, gradient text, glows, coloured shadows, glassmorphism, background grids or dot patterns (on the stage too), emoji, sparkle or robot icons, "New" or "Beta" badges, fake statistics, testimonials, an FAQ, and the CTAs "Get started", "Learn more", "Try now", "Explore", "Discover".

### 7.2 Device artwork

Draw each actor kind as our own flat SVG illustration, about 64 to 88 units wide: 1.5 to 2 px outlines in the secondary text colour, two neutral fills from the ramp, and at most one small detail in a tone colour (for example the router's port LEDs in `handshake` green, not glowing). Recognisable at a glance, no perspective tricks, no isometric 3D. Label under the icon in 13 px primary text; sublabel (address) under it in 12 px IBM Plex Mono muted. Actors must not overlap each other or each other's labels (a test enforces this, see 9.2).

### 7.3 Copy (use exactly)

- Site name: `How the Internet Works`
- Home headline: `What happens when you press Enter`
- Home subhead: `Follow every message your device sends, one step at a time. Plain words first, every byte one click away. Free and open source.`
- Primary action: `Follow a page load` (links to `/learn/http`). Secondary: `See all topics` (links to `/topics`).
- Section titles on the home page: `Start here`, `Every topic, by layer`, `How this site works`.
- Header navigation: `Topics`, `Glossary`, `About`, and a GitHub icon link with `aria-label="Source code on GitHub"`. Nothing else.
- Footer: `Code under MIT. Content under CC BY-SA 4.0. Inspired by Protocol Explorer by Dilum Sanjaya.` plus links to GitHub and `/about`.
- Empty search: `No topic matches “{query}”. Try a protocol name like DNS or TCP.`

---

## 8. Pages and features

### 8.1 Topic page `/learn/[slug]`

Desktop (1100 px and wider), top to bottom:

1. Header (56 px): site name, search button with a `Ctrl K` keycap (`⌘ K` on Mac, detected after mount), theme toggle, navigation.
2. Title row: title, full name, layer tag (for example `Application layer` with the OSI number when there is one; the layer note in a tooltip), tagline.
3. Main row, three columns: step rail (240 px, numbered steps, current one highlighted, done ones marked), stage (fluid, 5:3, with the view switch `Network | Sequence` above it and the transport bar under it), step panel (360 px: step title, Simple text in 17 px, Technical text when that mode is on, step facts, then the Inspector).
4. Capture table (full width, collapsible).
5. Below the player: intro (Simple and Technical), key facts, outro (shown after the last step finishes, and always present lower on the page), Try it yourself, Sources, Related topics, and two links: `Edit this topic on GitHub` and `Report an error in this step` (opens a new GitHub issue with the `report-an-error` template and the topic slug and step id in the title; no personal data in the URL).

Tablet (768 to 1099 px): the step rail becomes a step dropdown above the stage; the step panel moves under the stage.

Mobile (under 768 px): the stage is full width at 4:3 and sticks to the top while the step card scrolls under it; the transport bar has 44 px buttons; the step card has large `Back` and `Next` buttons; the step list opens as a bottom sheet; the capture table is collapsed. No horizontal scrolling anywhere.

Transport bar: Back, Play/Pause, Next, Replay, speed menu (0.5x, 1x, 1.5x, 2x), a mode switch `Simple | Technical`, and a scrubber with a tick per step. The scrubber is a keyboard-operable slider with `aria-valuetext="Step 3 of 6: Ask the resolver"`.

Keyboard (ignored while typing in an input): `Space` play or pause, `←` / `→` previous or next step, `Home` / `End` first or last step, `1` to `9` jump to a step, `M` switch Simple/Technical, `V` switch Network/Sequence, `?` open the shortcuts dialog, `Esc` close any dialog or popover.

URL state: `/learn/dns/?step=3&mode=technical&view=sequence`. Read it on mount, update it with `history.replaceState` on every change (no navigation, no history spam). Step numbers in the URL are 1-based.

Accessibility: an `aria-live="polite"` region announces the step title and its Simple text when the step changes. The stage SVG has `role="img"` and an `aria-label` with the current step title; the text panel is the accessible equivalent of the animation. All controls are native `<button>`s or links with accessible names; icon-only buttons have `aria-label`. Focus ring: 2 px accent outline with 2 px offset, never removed. Text contrast at least 4.5:1 in both themes. `cursor: pointer` on every enabled control, `not-allowed` on disabled ones. Nothing moves for more than 5 seconds without a pause control.

### 8.2 Home `/`

1. Hero, split layout: text on the left (headline, subhead, the two actions), a live compact player on the right running the `https` topic in continuous mode, starting once when it scrolls into view, with a Pause button while it plays and a Replay button when it ends. It never loops by itself. Under reduced motion it shows the final frame of step 1 and a Play button instead.
2. `Start here`: a learning path drawn as one cable line with stations: IP, DNS, TCP, HTTP, TLS, HTTPS. Each station links to its topic and shows its tagline.
3. `Every topic, by layer`: the layer map. Four horizontal bands (Application, Transport, Internet, Link), each holding the topics of that TCP/IP layer as links. The topic count comes from the data, never typed by hand.
4. `How this site works`: three short paragraphs: where the facts come from (RFCs and specs, listed on every page), how to report an error, how to contribute. Real text, no icons in a row of cards.

### 8.3 Other pages

- `/topics`: every topic grouped by group, with a filter by layer and a search box. Each entry shows title, full name, tagline and layer.
- `/glossary`: all terms A to Z, each with an anchor id, its short definition, an optional longer one, and links to topics that use it (computed).
- `/about`: mission, how content is verified, licenses, the credit sentence from section 1, how to contribute.
- `/embed/[slug]`: stage, transport bar, current step's Simple text, and a link `Open the full topic`. No header, no footer, `robots: noindex`. Usable inside an `<iframe>`.
- `/dev/stage`: the kitchen-sink flow with the full player, for testing every event and actor kind. Returns `notFound()` when `process.env.NODE_ENV === "production"`. Excluded from the sitemap.
- `not-found.tsx`: a short message and the search button.
- Metadata: title template `%s · How the Internet Works`; each topic's description = its tagline plus its intro's Simple text; canonical URLs; `sitemap.ts` lists home, topics, glossary, about and every topic; `robots.ts` allows all.

### 8.4 Search

`Ctrl K`, `⌘ K` or `/` opens a dialog. The index is built at build time from topics (title, full name, tagline, tags, step titles) and glossary terms. Matching: lowercase, every query word must prefix-match some word of the entry; rank title matches first. Arrow keys move, Enter opens, Esc closes, focus is trapped inside while open and returns to the trigger after closing.

### 8.5 States

Every view that shows data has its empty and error handling: unknown slug gives the not-found page; search with no results shows the empty message from 7.3; a topic with no captures hides the capture table instead of showing an empty one; a packet with no `layers` shows "No layer details for this message yet" in the Inspector.

---

## 9. Quality gates

### 9.1 Scripts (exact names in `package.json`)

- `dev`, `build`
- `start`: `serve out -l 3000`
- `lint`: the generated lint script
- `typecheck`: `tsc --noEmit`
- `test`: `vitest run`
- `e2e`: `playwright test`
- `originality`: `tsx scripts/check-originality.ts`
- `check`: `npm run lint && npm run typecheck && npm run test && npm run build`

### 9.2 Content and engine tests must fail when

1. Any topic fails its zod schema.
2. Slugs repeat, or actor, link, step or event ids repeat inside a topic.
3. A link or event names an unknown actor; a packet has no route; a `{{id}}` names no packet of the same step; a `[[term]]` names no glossary term; a prerequisite, related slug or group is unknown.
4. Limits are broken: `simple` over 220 characters, `technical` over 700, step title over 32, tagline over 60, fewer than 4 or more than 8 steps, fewer than 4 or more than 6 intro facts.
5. Any text contains the em dash character, `!`, emoji (`/\p{Extended_Pictographic}/u`), "Press replay", "simply", "seamless" or "magic" (case-insensitive).
6. Capture times decrease inside a topic, or `bytes` is not a positive integer.
7. An IPv4 address falls outside the allowed set of section 6.4.
8. A topic has no source, a source URL is not `https`, or no source is from an allowed spec domain (`www.rfc-editor.org`, `datatracker.ietf.org`, `www.iana.org`, `standards.ieee.org`, `www.w3.org`, `html.spec.whatwg.org`, `websockets.spec.whatwg.org`, `fetch.spec.whatwg.org`, `www.wireguard.com`, `www.modbus.org`, `www.wi-fi.org`). Add a domain only with a line in `docs/DECISIONS.md`.
9. Text mentions `RFC nnnn` and that RFC is not in the topic's sources.
10. `status: "draft"` without `reviewNotes`, or a `lastVerified` that is not a valid `YYYY-MM-DD` date.
11. A topic contains a function or a non-plain object anywhere (walk the object tree).
12. A topic does not compile with the engine, lasts longer than 120 s at 1x, or has a step shorter than 1.5 s or longer than 20 s.
13. Two actors' boxes (icon plus label plus sublabel, label width estimated as characters x 7.5 units) overlap, or an actor sits closer than 40 units to the edge of the world.
14. A packet's route passes through an actor or link that is not visible when the packet starts.

Engine tests (at least these cases):
1. Steps are contiguous, start at 0, and follow the timing rules of 5.3.
2. `frameAt(timeline, 0)` shows only the start-visible actors and no packets.
3. Halfway through a packet, its position lies on its path between source and destination; at its end it equals the destination.
4. `frameAt` is pure: same `t`, deep-equal frames; seeking backwards equals computing fresh.
5. A lost packet stops at 55% and leaves a marker until its step ends.
6. `together` starts children at the same time and lasts as long as the longest.
7. Routing finds a path through the router; a disconnected pair throws an error naming the event.
8. At the end of a step with a `focus` event, the camera equals the computed target box.
9. `visibleCaptures` never decreases as `t` grows.
10. The player in step mode stops exactly at the end of a step; `next`, `prev`, `goTo`, `replay` and speed behave as in 5.7.

### 9.3 Originality check

`scripts/check-originality.ts` reads every `.md` file in `live-lessons/` and `extracted-repo-14/lessons.ts` from the research folder (default `H:\apps\howinternetworks-research`, override with the env var `RESEARCH_DIR`). It lowercases, strips punctuation and builds every 8-word sequence, ignoring sequences made only of numbers, addresses, ports and protocol names. It does the same for every text field of every topic and the glossary. Any shared sequence fails the check and prints the topic, the field and the phrase. If the research folder does not exist (for example in CI), it prints `originality check skipped: research folder not found` and exits 0. Run it before every content commit.

### 9.4 End-to-end tests

Run against the static build served by `serve` (Playwright `webServer`: `npm run build && npm run start`).

- Home loads with no console errors; the hero player renders; the search dialog finds `dns` and opens it; the theme toggle switches and survives a reload.
- For every topic: open `/learn/<slug>/`; no console errors; press `→` until the last step and check its title is visible; press `Space`; switch to Sequence and back; switch to Technical; click the first capture row (if there is a table) and check the Inspector shows at least one layer; open `?step=2` directly and check step 2 is active.
- At 375x812: no horizontal overflow on home and on every topic (`document.documentElement.scrollWidth <= window.innerWidth`).
- `/embed/http/` renders the stage without the header.
- Save a screenshot of every topic at its last step in light and dark to `test-results/screens/` for human review.

### 9.5 CI

`.github/workflows/ci.yml` on push and pull request: checkout, setup-node with `node-version: lts/*` and npm cache, `npm ci`, lint, typecheck, test, build, `npx playwright install --with-deps chromium`, `npm run e2e`, upload `test-results/` as an artifact when it fails.

---

## 10. Repository documents

- `README.md`: one paragraph on what the site is; how to run it (`npm install`, `npm run dev`); the checks; the folder structure in short; how to add a topic (link to `docs/CONTENT-GUIDE.md`); licenses; the credit sentence.
- `CONTRIBUTING.md`: setup, the checks to run, the content rules in short, the PR checklist (sources listed, originality passes, every step played in both modes and both views).
- `CODE_OF_CONDUCT.md`: adopt the Contributor Covenant 2.1 by link (https://www.contributor-covenant.org/version/2/1/code_of_conduct/) and say that reports go to the maintainers through GitHub. Do not type the covenant from memory.
- `.github/ISSUE_TEMPLATE/report-an-error.yml`: fields topic, step, what is wrong, what is correct, source (required).
- `.github/ISSUE_TEMPLATE/propose-a-topic.yml`: fields topic, why it matters, sources.
- `.github/pull_request_template.md`: the PR checklist.
- `ROADMAP.md`: wave 2 topics not yet done; future collections and features from section 12.
- `docs/ARCHITECTURE.md`: sections 5.1 to 5.9 in your own words, plus the worked example of adding an event type.
- `docs/CONTENT-GUIDE.md`: sections 6.1, 6.2, 6.4 to 6.7 and the per-topic procedure from M7.

---

## 11. Milestones

### M0. Bootstrap
Read sections 0, 3, 4, 10.
1. Check `node -v` is at least 20.9 and `git status` works.
2. In `H:\apps\howinternetworks` run `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`. If `--yes` is rejected as an unknown option, run the same command without it. If it asks questions, choose: TypeScript yes, ESLint yes, Tailwind yes, `src/` yes, App Router yes, import alias `@/*`, everything else default. Then move the generated `src/app/page.tsx` into `src/app/(site)/page.tsx` as section 4 requires.
3. Install: `zod lucide-react` and dev dependencies `vitest @vitejs/plugin-react jsdom @testing-library/react @playwright/test tsx serve`. Add `vitest.config.ts` with the `@` path alias.
4. Configure `next.config.ts` (section 3.1), the fonts, an empty theme in `globals.css`, and the scripts of 9.1.
5. Create every document and folder of section 4 (stubs are fine for ARCHITECTURE and CONTENT-GUIDE), copy this file to `docs/SPEC.md`, add `out/`, `test-results/`, `playwright-report/` to `.gitignore`.
6. Gate: `npm run lint`, `npm run typecheck`, `npm run build` pass and `out/index.html` exists.
7. Commit `chore: scaffold project`.

### M1. Content model, world, glossary, builders, first topic
Read sections 5.2, 6, and the DNS research sheet with its findings.
1. `schema.ts`, `world.ts`, `groups.ts`, `glossary.ts` (start with the terms DNS needs), `index.ts`, builders and their tests.
2. Write `flows/dns.ts` completely (procedure in M7).
3. Write `content.test.ts` with every rule of 9.2 that does not need the engine. Write `scripts/check-originality.ts`.
4. Gate: `npm run test`, `npm run typecheck`, `npm run originality` pass.
5. Commit `feat(content): schema, world, glossary, builders and DNS topic`.

### M2. Engine
Read section 5.
1. `compile.ts`, `route.ts`, `easing.ts`, `camera.ts`, `frame.ts`, `registry.ts`, `player.ts`.
2. All engine tests of 9.2, plus the content rules that need the engine (12, 13).
3. Gate: `npm run test`, `npm run typecheck` pass.
4. Commit `feat(engine): deterministic timeline, frames and player`.

### M3. Stage and device artwork
Read sections 5.6, 5.9, 7.1, 7.2.
1. Stage, layers, packet chip, every actor kind, sequence view, capture table, inspector.
2. `flows/_kitchen-sink.ts` using every event type and actor kind; `/dev/stage` page.
3. Open `/dev/stage` in `npm run dev`, play it through at every speed and with reduced motion on (emulate it in your browser tool or devtools), in both themes. If you have a screenshot tool, take screenshots and look at them; fix overlapping labels, clipped chips and camera jumps.
4. Gate: `npm run check` passes; no console errors on `/dev/stage`.
5. Commit `feat(stage): renderer, device artwork, sequence view, capture table, inspector`.

### M4. Topic page
Read section 8.1.
1. `FlowPlayer` and everything in `components/flow/`, keyboard, URL state, live region, responsive layouts, theme toggle, glossary popovers, inline chips, Report an error and Edit links.
2. `/learn/[slug]` working for DNS.
3. Write the e2e tests of 9.4 that apply so far and run them.
4. Gate: `npm run check` and `npm run e2e` pass.
5. Commit `feat(site): topic page`.

### M5. The rest of the site
Read sections 7.3, 8.2 to 8.5.
1. Home, topics, glossary, about, embed, not-found, search, sitemap, robots, metadata.
2. Complete the e2e tests of 9.4.
3. Gate: `npm run check` and `npm run e2e` pass.
4. Commit `feat(site): home, topics, glossary, about, embed and search`.

### M6. Documents and CI
Read section 10.
1. Write the documents properly, add CI.
2. Gate: `npm run check` passes.
3. Commit `docs: architecture, content guide, contributing, roadmap, CI`.

### M7. Content wave 1
Topics in this order (DNS is done): tcp, http, udp, ip, dhcp, icmp, tls, https, ssh, smtp, imap, pop3, ftp.

Per topic, every time:
1. Read its research sheet, its part of `extracted-repo-14/lessons.ts`, and its section of `VERIFICATION-findings.md`.
2. List the facts you will use in a scratch note outside the repo. Next to each, write the RFC or spec section that confirms it. Open the RFC on `www.rfc-editor.org` if you have web access. Apply every ERROR and MISLEADING fix.
3. Design the scene from `world.ts`: positions on the 1000x600 grid, at least 160 units between actor centres, labels clear of each other.
4. Write 4 to 8 steps with the builders. Write `simple` and `technical` in your own words without looking at the research text.
5. Add the glossary terms you need, try-it commands from 6.7, sources, prerequisites, related topics.
6. Run `npm run test` and `npm run originality`; fix every failure by rewriting, not by weakening a test.
7. Run `npm run dev`, open `/learn/<slug>/`, play every step in both modes and both views, check the stage for overlaps, check the console.
8. `status: "reviewed"` only if every fact was confirmed against a source; otherwise `"draft"` with `reviewNotes`.
9. Commit `content: add <Title> topic`. Update `PROGRESS.md`.

Gate after the last topic: `npm run check`, `npm run e2e`, `npm run originality` pass. Commit `content: wave 1 complete`.

### M8. Content wave 2
Same procedure, in this order: ethernet, wifi, wpa3, ipv6, quic, dns-over-https, dnssec, ntp, websocket, http-proxy, reverse-proxy, captive-portal, socks5, wireguard, ipsec, bgp, radius, pppoe, smb, webrtc, sip, rtsp, rtmp, igmp, modbus.

New visuals (radio links, many receivers for multicast) go through the registry (5.8) with tests, never as special cases inside a topic. Gate after the last topic as in M7. Commit `content: wave 2 complete`.

### M9. Final check and report
1. Run `npm run check`, `npm run e2e`, `npm run originality`.
2. Go through this list and fix anything that is not true:
   - Every interactive element does something real; every link goes somewhere that exists.
   - Keyboard alone can use every page; focus is always visible; Esc closes every dialog and popover.
   - Both themes look right on every page; text contrast is at least 4.5:1.
   - No horizontal scrolling at 375 px; every touch target is at least 44 px.
   - Reduced motion is respected; nothing loops in the chrome.
   - No em dash, exclamation mark, emoji, fake number, testimonial, gradient, glow or glass effect anywhere.
   - Every topic lists sources; every draft has review notes.
3. Write the final report at the top of `PROGRESS.md`: topics reviewed, topics in draft with their open questions, anything you could not check (for example, screenshots you could not look at), and known issues.
4. Commit `chore: release candidate 0.1`.

---

## 12. Roadmap (put this into ROADMAP.md, do not build it now)

Collections after protocols:
- **Journeys**: what happens when you open a website (DHCP, ARP, DNS, TCP, TLS, HTTP and rendering in one story); sending an email from Alice to Bob; a video call; streaming a film through a CDN.
- **Infrastructure**: undersea cables, internet exchange points, CDNs, data centres, the last mile (fibre, cable, DSL, 5G, satellite), how Wi-Fi radio works, anycast and root servers.
- **Addressing**: IP addresses and subnets (with an interactive subnet calculator), NAT, ports, MAC addresses.
- **Security**: public-key cryptography, certificates and the chain of trust, what the padlock means, VPNs, Tor, DDoS, firewalls.
- **The web**: cookies and sessions, caching, CORS, HTTP/2 and HTTP/3 compared, how a browser renders a page.
- **History**: ARPANET, the switch to TCP/IP in 1983, the web in 1989 to 1991.

Features:
- Compare mode: two topics side by side on one timeline (HTTP vs HTTPS, TCP vs UDP, HTTP/1.1 vs HTTP/3).
- Byte view: a real hex dump with field highlighting next to the envelope view.
- Translations, starting with a right-to-left language. The layout already uses logical CSS properties and stable ids for every text.
- Quick check: two or three questions at the end of a topic.
- Open Graph images per topic.
- Progress marks for visited topics, stored only in the browser.
