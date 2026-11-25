import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function LaptopIcon() {
  return (
    <g>
      <rect
        x={-28}
        y={-22}
        width={56}
        height={36}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect
        x={-22}
        y={-17}
        width={44}
        height={26}
        rx={2}
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.2}
      />
      <path
        d="M-34 16 H34 L30 23 H-30 Z"
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <circle cx={0} cy={-4} r={2.2} fill={toneData} />
    </g>
  );
}
