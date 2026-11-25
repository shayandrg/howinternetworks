import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { getTopic, topics } from "@/content";
import { stripMarkup } from "@/lib/rich-text";
import { FlowPlayer } from "@/components/flow/FlowPlayer";

export const dynamicParams = false;

export function generateStaticParams() {
  return topics.map((t) => ({ slug: t.meta.slug }));
}

const LAYER_LABELS: Record<
  "link" | "internet" | "transport" | "application",
  string
> = {
  link: "Link layer",
  internet: "Internet layer",
  transport: "Transport layer",
  application: "Application layer",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return {};

  const desc = `${topic.meta.tagline}. ${stripMarkup(topic.intro.simple)}`;
  return {
    title: topic.meta.title,
    description: desc,
    alternates: {
      canonical: `/learn/${topic.meta.slug}/`,
    },
  };
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) {
    notFound();
  }

  const relatedTopics = topic.meta.related
    .map((relSlug) => getTopic(relSlug))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({
      slug: t.meta.slug,
      title: t.meta.title,
      tagline: t.meta.tagline,
    }));

  const layer = topic.meta.layer;

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-[32px] font-medium leading-[1.15] tracking-tight text-[var(--color-primary)]">
            {topic.meta.title}
          </h1>
          {topic.meta.fullName && (
            <span className="text-[16px] text-[var(--color-secondary)]">
              {topic.meta.fullName}
            </span>
          )}
          {layer && (
            <span
              title={layer.note}
              className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-2 py-0.5 text-[12px] text-[var(--color-secondary)]"
            >
              <span>
                {LAYER_LABELS[layer.tcpip]}
                {layer.osi ? ` \u00b7 OSI ${layer.osi}` : ""}
              </span>
              {layer.note && <Info size={13} strokeWidth={1.5} />}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[15px] leading-[22px] text-[var(--color-secondary)]">
          {topic.meta.tagline}
        </p>
      </div>

      <FlowPlayer flow={topic} relatedTopics={relatedTopics} />
    </div>
  );
}
