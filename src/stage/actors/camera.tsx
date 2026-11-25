import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function CameraIcon() {
  return (
    <g>
      <rect
        x={-26}
        y={-16}
        width={38}
        height={26}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <path
        d="M12 -8 L26 -14 V8 L12 2 Z"
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <circle cx={-7} cy={-3} r={7} fill={fillRaised} stroke={strokeSecondary} strokeWidth={1.4} />
      <circle cx={-7} cy={-3} r={2.5} fill={toneData} />
      <line x1={-8} y1={10} x2={-16} y2={20} stroke={strokeSecondary} strokeWidth={1.75} strokeLinecap="round" />
    </g>
  );
}
