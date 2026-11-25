import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopic, topics } from "@/content";
import { EmbedPlayer } from "./EmbedPlayer";

export const dynamicParams = false;

export function generateStaticParams() {
  return topics.map((t) => ({ slug: t.meta.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return {};
  return {
    title: `${topic.meta.title} (Embed)`,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) {
    notFound();
  }
  return <EmbedPlayer flow={topic} />;
}
