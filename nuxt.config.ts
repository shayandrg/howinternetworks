import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

const flowSlugs = fs
  .readdirSync(path.resolve("src/content/flows"))
  .filter((name) => name.endsWith(".ts") && !name.startsWith("_"))
  .map((name) => name.replace(/\.ts$/, ""));

export default defineNuxtConfig({
  compatibilityDate: "2026-11-25",
  ssr: true,
  alias: {
    "@": fileURLToPath(new URL("./src", import.meta.url)),
  },
  css: [
    "@fontsource/ibm-plex-sans/400.css",
    "@fontsource/ibm-plex-sans/500.css",
    "@fontsource/ibm-plex-sans/600.css",
    "@fontsource/ibm-plex-mono/400.css",
    "@fontsource/ibm-plex-mono/500.css",
    "~/assets/css/main.css",
  ],
  modules: ["@nuxt/eslint"],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      titleTemplate: "%s · How the Internet Works",
      title: "How the Internet Works: Interactive Protocol & Packet Flows",
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232456d6' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18'/%3E%3C/svg%3E",
        },
      ],
      script: [
        {
          innerHTML:
            "try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}",
          tagPosition: "head",
        },
      ],
    },
  },
  nitro: {
    preset: "static",
    cloudflare: {
      deployConfig: false,
    },
    prerender: {
      crawlLinks: true,
      autoSubfolderIndex: true,
      failOnError: true,
      ignore: ["/dev/stage", "/dev/stage/"],
      routes: [
        "/",
        "/topics/",
        "/glossary/",
        "/about/",
        "/sitemap.xml",
        "/robots.txt",
        ...flowSlugs.map((slug) => `/learn/${slug}/`),
        ...flowSlugs.map((slug) => `/embed/${slug}/`),
      ],
    },
  },
});
