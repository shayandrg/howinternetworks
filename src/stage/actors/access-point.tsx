import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function AccessPointIcon() {
  return (
    <g>
      <path
        d="M-16 -14 A 22 22 0 0 1 16 -14"
        fill="none"
        stroke={strokeSecondary}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <path
        d="M-24 -20 A 32 32 0 0 1 24 -20"
        fill="none"
        stroke={strokeSecondary}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <rect
        x={-26}
        y={-4}
        width={52}
        height={22}
        rx={11}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-16} y={2} width={32} height={10} rx={5} fill={fillRaised} />
      <circle cx={0} cy={7} r={2.5} fill={toneData} />
    </g>
  );
}
