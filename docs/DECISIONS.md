# Decisions

This file records choices this spec did not make.

| Date | Decision | Reason |
|------|----------|--------|
| 2026-11-25 | Use `--webpack` in `dev` and `build` scripts with `@tailwindcss/postcss` and `postcss.config.mjs` | Native `@next/swc-win32-x64-msvc` fails to load on this Windows environment (`not a valid Win32 application`), whereas Webpack builds cleanly with `@next/swc-wasm-nodejs` and Tailwind CSS v4 PostCSS. |
| 2026-11-25 | Upgrade `@types/node` to `^26` (matching Node 24+) | `vitest@5` declares `peerOptional @types/node@"^22.0.0 || >=24.0.0"`, conflicting with `create-next-app`'s default `^20`. |
| 2026-11-25 | Return `[{ slug: "_placeholder" }]` from `generateStaticParams` when `topics` is empty | Next.js `output: "export"` errors if `generateStaticParams` returns `[]` during M0 before any topics exist; removed naturally once `dns` is added in M1. |
| 2026-11-25 | Run `scripts/fix-export-segments.ts` after `next build` | Next.js 16.4.6 `export` on Windows writes nested `__next.<seg>/.../__PAGE__.txt` directories due to backslashes in `path.relative`, while the client requests dot-joined filenames; flattening them fixes static serving on Windows and is a no-op on Linux. |
| 2026-11-26 | Allow `learn.microsoft.com` in `ALLOWED_SPEC_DOMAINS` | Authoritative Microsoft Open Specifications (`[MS-SMB2]`) for SMB 2/3 live under `https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-smb2`. |
| 2026-11-26 | Migrate frontend to Nuxt 4 static generation (`nuxt generate` -> `.output/public`) and configure `wrangler.jsonc` for Cloudflare Workers Static Assets | User requested Nuxt, static generation (`nitro.preset: "static"` with `autoSubfolderIndex: true`), and GitHub-connected Cloudflare Workers deployment without an SSR Worker entrypoint (`assets.directory: ".output/public"`, `not_found_handling: "404-page"`). |
| 2026-11-26 | Replace Node `Buffer.byteLength` in `src/content/builders/` with Web `TextEncoder` (`utf8ByteLength`) | Static client bundle in Nuxt/Vite runs in the browser without Node `Buffer` globals; `TextEncoder` computes identical UTF-8 byte lengths across Node, browser, and Cloudflare environments. |
| 2026-11-26 | Bundle `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` and inline SVG favicon | Keeps `IBM Plex Sans` and `IBM Plex Mono` self-hosted in `.output/public/_nuxt/` without external network dependencies during static build or page load, and avoids `/favicon.ico` 404 console errors. |
