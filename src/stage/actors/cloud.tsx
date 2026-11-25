import { fillCard, fillRaised, strokeSecondary } from "./shared";

export function CloudIcon() {
  return (
    <g>
      <path
        d="M-22 14 H22 A 12 12 0 0 0 24 -9 A 16 16 0 0 0 -7 -16 A 14 14 0 0 0 -24 -4 A 10 10 0 0 0 -22 14 Z"
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <path
        d="M-15 8 H16 A 7 7 0 0 0 17 -5 A 10 10 0 0 0 -4 -9 A 8 8 0 0 0 -15 8 Z"
        fill={fillRaised}
      />
    </g>
  );
}
