# Progress

## Current status

All 39 topics (Wave 1 + Wave 2), Nuxt 4 static site migration (`nuxt generate` -> `.output/public`), and Cloudflare Workers Static Assets configuration (`wrangler.jsonc`) are complete and verified.

## Milestones

| Milestone | Status |
|-----------|--------|
| M0 Bootstrap | done |
| M1 Content model, world, glossary, builders, DNS | done |
| M2 Engine | done |
| M3 Stage and device artwork | done |
| M4 Topic page | done |
| M5 Rest of the site | done |
| M6 Documents and CI | done |
| M7 Content wave 1 | done |
| M8 Content wave 2 | done |
| Nuxt 4 static + Cloudflare Workers migration | done |
| M9 Final check | done |

## Gate results

- `npm run originality`: passed (`39 topic(s), 98 glossary terms checked against 24708 research 8-grams`).
- `npm run lint` (`eslint .`): passed (0 errors, 0 warnings).
- `npm run typecheck` (`nuxt prepare && nuxt typecheck`): passed (exit 0).
- `npm run test` (`vitest run`): 7/7 test files, 23/23 tests passed.
- `npm run build` (`nuxt generate`): passed, 171 prerendered routes written to `.output/public/`.
- `npx wrangler deploy --dry-run`: passed (`328 files from the assets directory .output/public`).
- `npm run e2e` (`playwright test`): 121/121 passed across all 39 topics (playback, Sequence view, Technical mode, packet capture/inspector, `?step=2` deep link, `375x812` mobile overflow check, zero console/page errors) and `/`, `/topics/`, `/glossary/`, `/about/`, `/embed/http/`.

## Draft topics and follow-up notes

- `rtmp` (`src/content/flows/rtmp.ts`) remains `status: "draft"` with `reviewNotes` explaining why: Adobe's historical RTMP specification URL (`rtmp_specification_1.0.pdf`) is no longer hosted on an allowlisted primary domain (`www.adobe.com` is outside `ALLOWED_SPEC_DOMAINS`), while IANA's service registry for port `1935` is cited cleanly.
- Cloudflare Workers GitHub dashboard settings for deploy: set **Build command** to `npm run build` (`nuxt generate`) and **Deploy command** to `npx wrangler deploy`.
