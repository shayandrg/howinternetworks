import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function ServerIcon() {
  return (
    <g>
      <rect
        x={-24}
        y={-26}
        width={48}
        height={52}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      {[-18, -2, 14].map((y) => (
        <g key={y}>
          <rect
            x={-19}
            y={y}
            width={38}
            height={11}
            rx={2}
            fill={fillRaised}
            stroke={strokeSecondary}
            strokeWidth={1.2}
          />
          <line x1={-14} y1={y + 5.5} x2={4} y2={y + 5.5} stroke={strokeSecondary} strokeWidth={1.4} />
          <circle cx={13} cy={y + 5.5} r={1.8} fill={toneData} />
        </g>
      ))}
    </g>
  );
}
