import { defineEventHandler, setHeader } from "h3";
import { topics } from "@/content";

const BASE_URL = "https://howinternetworks.org";

export default defineEventHandler((event) => {
  setHeader(event, "content-type", "application/xml; charset=utf-8");

  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/topics/`,
    `${BASE_URL}/glossary/`,
    `${BASE_URL}/about/`,
    ...topics.map((t) => `${BASE_URL}/learn/${t.meta.slug}/`),
  ];

  const entries = urls
    .map((loc) => `  <url><loc>${loc}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
});
