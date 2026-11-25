import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://howinternetworks.com";
  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/topics/`, lastModified: new Date() },
    { url: `${base}/glossary/`, lastModified: new Date() },
    { url: `${base}/about/`, lastModified: new Date() },
  ];
}
