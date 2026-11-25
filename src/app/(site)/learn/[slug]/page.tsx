import { topics } from "@/content";

export const dynamicParams = false;

export function generateStaticParams() {
  if (topics.length === 0) {
    return [{ slug: "_placeholder" }];
  }
  return topics.map((t: { meta: { slug: string } }) => ({
    slug: t.meta.slug,
  }));
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <div>Topic: {slug}</div>;
}
