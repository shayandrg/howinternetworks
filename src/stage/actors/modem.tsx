import { fillCard, fillRaised, strokeSecondary, toneHandshake } from "./shared";

export function ModemIcon() {
  return (
    <g>
      <rect
        x={-26}
        y={-18}
        width={52}
        height={34}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-20} y={-11} width={40} height={20} rx={2} fill={fillRaised} />
      <line x1={-14} y1={-4} x2={-4} y2={-4} stroke={strokeSecondary} strokeWidth={1.5} />
      <line x1={-14} y1={2} x2={-4} y2={2} stroke={strokeSecondary} strokeWidth={1.5} />
      <circle cx={8} cy={-4} r={2} fill={toneHandshake} />
      <circle cx={14} cy={-4} r={2} fill={toneHandshake} />
      <circle cx={8} cy={3} r={2} fill={strokeSecondary} />
    </g>
  );
}
