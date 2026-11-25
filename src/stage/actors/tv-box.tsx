import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function TvBoxIcon() {
  return (
    <g>
      <rect
        x={-30}
        y={-24}
        width={60}
        height={38}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-24} y={-18} width={48} height={26} rx={2} fill={fillRaised} />
      <polygon points="-4,-11 -4,1 7,-5" fill={toneData} />
      <rect
        x={-20}
        y={16}
        width={40}
        height={8}
        rx={2}
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.5}
      />
    </g>
  );
}
