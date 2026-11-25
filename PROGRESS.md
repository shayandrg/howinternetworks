# Progress

## Current status

M4 Topic page passed (`npm run check` + `npm run e2e`, 4/4 Playwright tests passed with 0 console errors). Starting M5: Rest of the site.

## Milestones

| Milestone | Status |
|-----------|--------|
| M0 Bootstrap | done |
| M1 Content model, world, glossary, builders, DNS | done |
| M2 Engine | done |
| M3 Stage and device artwork | done |
| M4 Topic page | done |
| M5 Rest of the site | in progress |
| M6 Documents and CI | not started |
| M7 Content wave 1 | not started |
| M8 Content wave 2 | not started |
| M9 Final check | not started |

## Gate results

- M0: `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (exit 0), `npm run build` (exit 0, `out/index.html` present).
- M1: `npm run test` (8/8 passed), `npm run typecheck` (exit 0), `npm run originality` (1 topic, 16 glossary terms, 0 violations).
- M2: `npm run test` (22/22 passed), `npm run typecheck` (exit 0).
- M3: `npm run check` (lint, typecheck, 23/23 tests, static build), headless Chrome check on `/dev/stage/` (light, dark, sequence view, reduced motion, 0 console errors).
- M4: `npm run check` and `npm run e2e` (4/4 Playwright tests passed, 0 console errors, 375x812 mobile overflow check passed).
