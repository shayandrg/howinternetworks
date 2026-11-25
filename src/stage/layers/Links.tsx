import type { Actor, Frame, Link } from "@/engine/types";

interface LinksLayerProps {
  links: Link[];
  frameLinks: Frame["links"];
  actorMap: Map<string, Actor>;
}

export function LinksLayer({
  links,
  frameLinks,
  actorMap,
}: LinksLayerProps) {
  const opMap = new Map(frameLinks.map((l) => [l.id, l.opacity]));

  return (
    <g aria-hidden="true">
      {links.map((link) => {
        const opacity = opMap.get(link.id) ?? 0;
        if (opacity <= 0) return null;
        const a = actorMap.get(link.from);
        const b = actorMap.get(link.to);
        if (!a || !b) return null;

        const x1 = a.at.x;
        const y1 = a.at.y;
        const x2 = b.at.x;
        const y2 = b.at.y;

        if (link.medium === "fiber") {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = (-dy / len) * 2;
          const ny = (dx / len) * 2;
          return (
            <g key={link.id} opacity={opacity}>
              <line
                x1={x1 + nx}
                y1={y1 + ny}
                x2={x2 + nx}
                y2={y2 + ny}
                stroke="var(--color-tone-data)"
                strokeWidth={1}
              />
              <line
                x1={x1 - nx}
                y1={y1 - ny}
                x2={x2 - nx}
                y2={y2 - ny}
                stroke="var(--color-tone-data)"
                strokeWidth={1}
              />
            </g>
          );
        }

        if (link.medium === "tunnel") {
          return (
            <g key={link.id} opacity={opacity}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-tone-secure)"
                strokeOpacity={0.12}
                strokeWidth={10}
                strokeLinecap="round"
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-tone-secure)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            </g>
          );
        }

        if (link.medium === "wifi") {
          return (
            <line
              key={link.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              opacity={opacity}
              stroke="var(--color-secondary)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          );
        }

        if (link.medium === "internet") {
          return (
            <line
              key={link.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              opacity={opacity}
              stroke="var(--color-muted)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        }

        // ethernet
        return (
          <line
            key={link.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            opacity={opacity}
            stroke="var(--color-secondary)"
            strokeWidth={1.5}
          />
        );
      })}
    </g>
  );
}
