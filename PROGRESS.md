# Progress

## Current status

M1 Content model, world, glossary, builders, and DNS topic passed. Starting M2: Engine.

## Milestones

| Milestone | Status |
|-----------|--------|
| M0 Bootstrap | done |
| M1 Content model, world, glossary, builders, DNS | done |
| M2 Engine | in progress |
| M3 Stage and device artwork | not started |
| M4 Topic page | not started |
| M5 Rest of the site | not started |
| M6 Documents and CI | not started |
| M7 Content wave 1 | not started |
| M8 Content wave 2 | not started |
| M9 Final check | not started |

## Gate results

- M0: `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (exit 0), `npm run build` (exit 0, `out/index.html` present).
- M1: `npm run test` (8/8 passed), `npm run typecheck` (exit 0), `npm run originality` (1 topic, 16 glossary terms, 0 violations).
