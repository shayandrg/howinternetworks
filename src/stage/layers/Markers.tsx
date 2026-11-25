import type { Frame } from "@/engine/types";

interface MarkersLayerProps {
  markers: Frame["markers"];
}

export function MarkersLayer({ markers }: MarkersLayerProps) {
  return (
    <g aria-hidden="true">
      {markers.map((m) => (
        <g key={m.key} transform={`translate(${m.x}, ${m.y})`}>
          <circle
            cx={0}
            cy={0}
            r={9}
            fill="var(--color-stage)"
            stroke="var(--color-tone-error)"
            strokeWidth={1.5}
          />
          <line
            x1={-5}
            y1={-5}
            x2={5}
            y2={5}
            stroke="var(--color-tone-error)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <line
            x1={5}
            y1={-5}
            x2={-5}
            y2={5}
            stroke="var(--color-tone-error)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}
