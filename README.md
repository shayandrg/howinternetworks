# How the Internet Works

A free, open-source, interactive atlas of how the internet works. Watch data move between devices one step at a time, read a plain-language caption for each step, and open any message to see what is inside it.

Inspired by Protocol Explorer by Dilum Sanjaya. No code or text was copied.

## Run locally

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build and Cloudflare Workers deployment

This site is statically generated with Nuxt (`nuxt generate`) into `.output/public` and configured for Cloudflare Workers Static Assets via [wrangler.jsonc](wrangler.jsonc):

- **Build command**: `npm run build` (`nuxt generate`)
- **Deploy command**: `npx wrangler deploy` (or `npm run deploy`)

## Checks

```
npm run lint        # ESLint (@nuxt/eslint)
npm run typecheck   # nuxt prepare + vue-tsc (nuxt typecheck)
npm run test        # Vitest unit & content tests
npm run build       # Static generation to .output/public/
npm run originality # Text originality against research pack
npm run e2e         # Playwright end-to-end (builds first)
npm run check       # lint + typecheck + test + build
```

## Folder structure

```
app/             Nuxt application (layouts, pages, Vue stage/flow/site components, CSS)
server/          Nitro routes prerendered at build time (sitemap.xml, robots.txt)
src/
  content/       Topics, glossary, builders (CC BY-SA 4.0)
  engine/        Deterministic timeline, frames, routing and player store
  stage/         Framework-free SVG actor specs and chip tokens
  lib/           Utilities (rich-text parser, search index, URL state, keyboard)
docs/            Architecture, content guide, decisions
scripts/         Build-time scripts
tests/e2e/       Playwright specs
```

## Add a topic

See [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md).

## Licenses

- Code: [MIT](LICENSE)
- Content (everything in `src/content/`): [CC BY-SA 4.0](LICENSE-CONTENT)
