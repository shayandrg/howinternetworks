import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function FileServerIcon() {
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
      <path
        d="M-17 -14 H-3 L0 -10 H17 V14 H-17 Z"
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <line x1={-10} y1={0} x2={10} y2={0} stroke={toneData} strokeWidth={1.5} />
      <line x1={-10} y1={6} x2={5} y2={6} stroke={strokeSecondary} strokeWidth={1.4} />
    </g>
  );
}
