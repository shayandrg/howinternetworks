import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function DesktopIcon() {
  return (
    <g>
      <rect
        x={-30}
        y={-25}
        width={60}
        height={38}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect
        x={-24}
        y={-20}
        width={48}
        height={28}
        rx={2}
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.2}
      />
      <rect
        x={-6}
        y={13}
        width={12}
        height={8}
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.5}
      />
      <line
        x1={-18}
        y1={22}
        x2={18}
        y2={22}
        stroke={strokeSecondary}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={21} cy={10} r={1.8} fill={toneData} />
    </g>
  );
}
