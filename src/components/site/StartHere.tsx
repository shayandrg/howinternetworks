import Link from "next/link";
import { getTopic } from "@/content";

const STATIONS = [
  { slug: "ip", title: "IP", fallback: "Addresses and routing between networks" },
  { slug: "dns", title: "DNS", fallback: "How domain names turn into IP addresses" },
  { slug: "tcp", title: "TCP", fallback: "Reliable, ordered byte delivery" },
  { slug: "http", title: "HTTP", fallback: "Requests and responses for web pages" },
  { slug: "tls", title: "TLS", fallback: "Encryption and identity on the wire" },
  { slug: "https", title: "HTTPS", fallback: "HTTP protected inside a TLS tunnel" },
] as const;

export function StartHere() {
  return (
    <section aria-labelledby="start-here-heading" className="py-10">
      <h2
        id="start-here-heading"
        className="text-[22px] font-medium text-[var(--color-primary)]"
      >
        Start here
      </h2>

      <div className="relative mt-6">
        {/* Horizontal cable line on desktop */}
        <div
          aria-hidden="true"
          className="absolute inset-x-6 top-4 hidden h-0.5 bg-[var(--color-hairline)] lg:block"
        />

        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {STATIONS.map((station, idx) => {
            const topic = getTopic(station.slug);
            const tagline = topic?.meta.tagline ?? station.fallback;
            const href = topic ? `/learn/${station.slug}/` : "/topics/";
            return (
              <li key={station.slug} className="relative">
                <Link
                  href={href}
                  className="flex h-full flex-col rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 transition-colors duration-150 hover:bg-[var(--color-raised)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-card)] font-mono text-[11px] font-medium tabular-nums text-[var(--color-accent)]">
                      {idx + 1}
                    </span>
                    <span className="text-[15px] font-medium text-[var(--color-primary)]">
                      {topic?.meta.title ?? station.title}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-[18px] text-[var(--color-secondary)]">
                    {tagline}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
