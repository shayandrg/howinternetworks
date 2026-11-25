import { fillCard, fillRaised, strokeSecondary } from "./shared";

export function PersonIcon() {
  return (
    <g>
      <circle
        cx={0}
        cy={-14}
        r={11}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <path
        d="M-20 22 C-20 6 -12 0 0 0 C12 0 20 6 20 22 Z"
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </g>
  );
}
