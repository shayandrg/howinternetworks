import type { MetadataRoute } from "next";
import { topics } from "@/content";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://howinternetworks.com";
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/` },
    { url: `${base}/topics/` },
    { url: `${base}/glossary/` },
    { url: `${base}/about/` },
  ];
  const topicPages: MetadataRoute.Sitemap = topics.map((t) => ({
    url: `${base}/learn/${t.meta.slug}/`,
  }));
  return [...staticPages, ...topicPages];
}
