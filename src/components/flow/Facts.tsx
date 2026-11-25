import type { Fact } from "@/engine/types";

export function Facts({
  facts,
  title,
}: {
  facts: Fact[];
  title?: string;
}) {
  if (facts.length === 0) return null;

  return (
    <div>
      {title && (
        <h3 className="mb-2 text-[14px] font-medium text-[var(--color-primary)]">
          {title}
        </h3>
      )}
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 py-2"
          >
            <dt className="text-[12px] text-[var(--color-muted)]">
              {fact.label}
            </dt>
            <dd className="mt-0.5 text-[14px] font-medium text-[var(--color-primary)]">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
