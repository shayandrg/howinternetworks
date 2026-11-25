import type { Actor, Frame } from "@/engine/types";
import { TONE_VARS } from "../PacketChip";

interface BadgesLayerProps {
  actors: Actor[];
  frameActors: Frame["actors"];
}

export function BadgesLayer({ actors, frameActors }: BadgesLayerProps) {
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  return (
    <g aria-hidden="true">
      {frameActors.map((fa) => {
        if (!fa.badge || fa.opacity <= 0) return null;
        const actor = actorMap.get(fa.id);
        if (!actor) return null;

        const w = Math.max(64, fa.badge.text.length * 6.5 + 16);
        const h = 20;
        const cx = Math.max(
          w / 2 + 8,
          Math.min(1000 - w / 2 - 8, actor.at.x),
        );
        const topY = actor.at.y + (actor.sublabel ? 72 : 56);
        const color = fa.badge.tone
          ? TONE_VARS[fa.badge.tone]
          : "var(--color-secondary)";

        return (
          <g key={`badge-${fa.id}`} opacity={fa.opacity}>
            <rect
              x={cx - w / 2}
              y={topY}
              width={w}
              height={h}
              rx={5}
              fill="var(--color-card)"
            />
            <rect
              x={cx - w / 2}
              y={topY}
              width={w}
              height={h}
              rx={5}
              fill={color}
              fillOpacity={0.1}
              stroke={color}
              strokeWidth={1.2}
            />
            <text
              x={cx}
              y={topY + 13.5}
              textAnchor="middle"
              fontSize={10.5}
              fontFamily="var(--font-mono), monospace"
              fontWeight={500}
              fill="var(--color-primary)"
            >
              {fa.badge.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}
