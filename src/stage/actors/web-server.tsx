import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function WebServerIcon() {
  return (
    <g>
      <rect
        x={-26}
        y={-26}
        width={52}
        height={52}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-20} y={-20} width={40} height={30} rx={2} fill={fillRaised} />
      <circle cx={0} cy={-5} r={10} fill="none" stroke={toneData} strokeWidth={1.4} />
      <ellipse cx={0} cy={-5} rx={4.5} ry={10} fill="none" stroke={toneData} strokeWidth={1.2} />
      <line x1={-10} y1={-5} x2={10} y2={-5} stroke={toneData} strokeWidth={1.2} />
      <line x1={-14} y1={18} x2={14} y2={18} stroke={strokeSecondary} strokeWidth={1.5} />
    </g>
  );
}
