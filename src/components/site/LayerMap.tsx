import Link from "next/link";
import { topics } from "@/content";

const LAYERS = [
  {
    id: "application",
    name: "Application",
    desc: "Web, mail, names, and network setup protocols",
  },
  {
    id: "transport",
    name: "Transport",
    desc: "Ports, streams, datagrams, and reliability",
  },
  {
    id: "internet",
    name: "Internet",
    desc: "Addressing, forwarding across networks, and tunnels",
  },
  {
    id: "link",
    name: "Link",
    desc: "Frames over cables, Wi-Fi radio, and local access",
  },
] as const;

export function LayerMap() {
  return (
    <section aria-labelledby="layer-map-heading" className="py-10">
      <h2
        id="layer-map-heading"
        className="text-[22px] font-medium text-[var(--color-primary)]"
      >
        Every topic, by layer
      </h2>

      <div className="mt-6 space-y-3">
        {LAYERS.map((layer) => {
          const layerTopics = topics.filter(
            (t) => t.meta.layer?.tcpip === layer.id,
          );
          return (
            <div
              key={layer.id}
              className="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-medium text-[var(--color-primary)]">
                    {layer.name}
                  </h3>
                  <p className="text-[13px] text-[var(--color-secondary)]">
                    {layer.desc}
                  </p>
                </div>
                <span className="font-mono text-[12px] tabular-nums text-[var(--color-muted)]">
                  {layerTopics.length}{" "}
                  {layerTopics.length === 1 ? "topic" : "topics"}
                </span>
              </div>

              {layerTopics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {layerTopics.map((t) => (
                    <Link
                      key={t.meta.slug}
                      href={`/learn/${t.meta.slug}/`}
                      className="rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2.5 py-1 text-[13px] font-medium text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-raised)]"
                    >
                      {t.meta.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
