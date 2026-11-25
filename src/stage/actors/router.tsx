import { fillCard, fillRaised, strokeSecondary, toneHandshake } from "./shared";

export function RouterIcon() {
  return (
    <g>
      <line x1={-18} y1={-10} x2={-18} y2={-26} stroke={strokeSecondary} strokeWidth={2} strokeLinecap="round" />
      <line x1={18} y1={-10} x2={18} y2={-26} stroke={strokeSecondary} strokeWidth={2} strokeLinecap="round" />
      <circle cx={-18} cy={-27} r={2} fill={strokeSecondary} />
      <circle cx={18} cy={-27} r={2} fill={strokeSecondary} />
      <rect
        x={-32}
        y={-10}
        width={64}
        height={28}
        rx={5}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect
        x={-26}
        y={-2}
        width={52}
        height={12}
        rx={2}
        fill={fillRaised}
      />
      <circle cx={-18} cy={4} r={2.2} fill={toneHandshake} />
      <circle cx={-10} cy={4} r={2.2} fill={toneHandshake} />
      <circle cx={-2} cy={4} r={2.2} fill={toneHandshake} />
      <rect x={8} y={1} width={6} height={6} rx={1} fill="none" stroke={strokeSecondary} strokeWidth={1.2} />
      <rect x={17} y={1} width={6} height={6} rx={1} fill="none" stroke={strokeSecondary} strokeWidth={1.2} />
    </g>
  );
}
