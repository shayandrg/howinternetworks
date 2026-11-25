import { ExternalLink } from "lucide-react";

export function Sources({
  sources,
}: {
  sources: Array<{ label: string; url: string }>;
}) {
  return (
    <section aria-labelledby="sources-heading">
      <h2
        id="sources-heading"
        className="text-[18px] font-medium text-[var(--color-primary)]"
      >
        Sources
      </h2>
      <ul className="mt-2.5 space-y-1.5">
        {sources.map((src) => (
          <li key={src.url}>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[14px] text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              <span>{src.label}</span>
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
