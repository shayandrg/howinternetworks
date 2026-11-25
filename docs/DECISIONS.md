# Decisions

This file records choices this spec did not make.

| Date | Decision | Reason |
|------|----------|--------|
| 2026-11-25 | Use `--webpack` in `dev` and `build` scripts with `@tailwindcss/postcss` and `postcss.config.mjs` | Native `@next/swc-win32-x64-msvc` fails to load on this Windows environment (`not a valid Win32 application`), whereas Webpack builds cleanly with `@next/swc-wasm-nodejs` and Tailwind CSS v4 PostCSS. |
| 2026-11-25 | Upgrade `@types/node` to `^26` (matching Node 24+) | `vitest@5` declares `peerOptional @types/node@"^22.0.0 || >=24.0.0"`, conflicting with `create-next-app`'s default `^20`. |
| 2026-11-25 | Return `[{ slug: "_placeholder" }]` from `generateStaticParams` when `topics` is empty | Next.js `output: "export"` errors if `generateStaticParams` returns `[]` during M0 before any topics exist; removed naturally once `dns` is added in M1. |
