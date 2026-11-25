import type { Metadata } from "next";
import Link from "next/link";
import { glossaryTerms } from "@/content/glossary";
import { topics } from "@/content";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Plain-language definitions of networking terms, protocols, and packet fields.",
  alternates: { canonical: "/glossary/" },
};

function findTopicsUsingTerm(termId: string) {
  const needle = `[[${termId}`;
  return topics.filter((t) => {
    const blobs = [
      t.intro.simple,
      t.intro.technical,
      ...t.steps.flatMap((s) => [s.simple, s.technical]),
    ];
    return blobs.some(
      (b) => b.includes(`${needle}]]`) || b.includes(`${needle}|`),
    );
  });
}

export default function GlossaryPage() {
  const sorted = [...glossaryTerms].sort((a, b) =>
    a.term.localeCompare(b.term),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-[32px] font-medium leading-[1.15] tracking-tight text-[var(--color-primary)]">
        Glossary
      </h1>
      <p className="mt-2 text-[15px] leading-[22px] text-[var(--color-secondary)]">
        Every term linked from topic explanations, ordered A to Z.
      </p>

      <dl className="mt-8 divide-y divide-[var(--color-hairline)] rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)]">
        {sorted.map((term) => {
          const usedIn = findTopicsUsingTerm(term.id);
          return (
            <div key={term.id} id={term.id} className="scroll-mt-8 p-5">
              <dt className="flex flex-wrap items-baseline gap-2">
                <span className="text-[18px] font-medium text-[var(--color-primary)]">
                  {term.term}
                </span>
                {term.aka && term.aka.length > 0 && (
                  <span className="text-[13px] text-[var(--color-muted)]">
                    Also: {term.aka.join(", ")}
                  </span>
                )}
              </dt>
              <dd className="mt-1.5 space-y-2 text-[15px] leading-[22px] text-[var(--color-secondary)]">
                <p className="text-[var(--color-primary)]">{term.short}</p>
                {term.long && <p>{term.long}</p>}
                {usedIn.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[13px]">
                    <span className="text-[var(--color-muted)]">Used in:</span>
                    {usedIn.map((t) => (
                      <Link
                        key={t.meta.slug}
                        href={`/learn/${t.meta.slug}/`}
                        className="rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-accent)] hover:underline"
                      >
                        {t.meta.title}
                      </Link>
                    ))}
                  </div>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
