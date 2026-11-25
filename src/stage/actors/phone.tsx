import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function PhoneIcon() {
  return (
    <g>
      <rect
        x={-16}
        y={-28}
        width={32}
        height={56}
        rx={5}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect
        x={-12}
        y={-21}
        width={24}
        height={40}
        rx={2}
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.2}
      />
      <line
        x1={-5}
        y1={-24.5}
        x2={5}
        y2={-24.5}
        stroke={strokeSecondary}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={0} cy={23} r={2} fill={toneData} />
    </g>
  );
}
