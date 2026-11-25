import Link from "next/link";
import type { Flow } from "@/content/schema";

const LAYER_LABELS: Record<
  "link" | "internet" | "transport" | "application",
  string
> = {
  link: "Link",
  internet: "Internet",
  transport: "Transport",
  application: "Application",
};

export function TopicCard({ topic }: { topic: Flow }) {
  const layer = topic.meta.layer;
  return (
    <Link
      href={`/learn/${topic.meta.slug}/`}
      className="flex flex-col justify-between rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 transition-colors duration-150 hover:bg-[var(--color-raised)]"
    >
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[16px] font-medium text-[var(--color-primary)]">
            {topic.meta.title}
          </h3>
          {layer && (
            <span className="shrink-0 rounded-[4px] border border-[var(--color-hairline)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">
              {LAYER_LABELS[layer.tcpip]}
            </span>
          )}
        </div>
        {topic.meta.fullName && (
          <div className="mt-0.5 text-[12px] text-[var(--color-muted)]">
            {topic.meta.fullName}
          </div>
        )}
        <p className="mt-2 text-[14px] leading-5 text-[var(--color-secondary)]">
          {topic.meta.tagline}
        </p>
      </div>
    </Link>
  );
}
