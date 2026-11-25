# How the Internet Works

A free, open-source, interactive atlas of how the internet works. Watch data move between devices one step at a time, read a plain-language caption for each step, and open any message to see what is inside it.

Inspired by Protocol Explorer by Dilum Sanjaya. No code or text was copied.

## Run locally

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```
npm run lint        # ESLint
npm run typecheck   # TypeScript strict
npm run test        # Vitest unit tests
npm run build       # Static export to out/
npm run originality # Text originality against research pack
npm run e2e         # Playwright end-to-end (builds first)
npm run check       # lint + typecheck + test + build
```

## Folder structure

```
src/
  app/           Next.js App Router pages
  content/       Topics, glossary, builders (CC BY-SA 4.0)
  engine/        Deterministic timeline, frames and player
  stage/         SVG renderer, actors, layers
  components/    Flow player, site chrome
  lib/           Utilities
docs/            Architecture, content guide, decisions
scripts/         Build-time scripts
tests/e2e/       Playwright specs
```

## Add a topic

See [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md).

## Licenses

- Code: [MIT](LICENSE)
- Content (everything in `src/content/`): [CC BY-SA 4.0](LICENSE-CONTENT)
