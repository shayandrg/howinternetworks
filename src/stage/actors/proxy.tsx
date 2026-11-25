import { fillCard, fillRaised, strokeSecondary, toneLookup } from "./shared";

export function ProxyIcon() {
  return (
    <g>
      <rect
        x={-26}
        y={-22}
        width={52}
        height={44}
        rx={5}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-20} y={-16} width={40} height={32} rx={2} fill={fillRaised} />
      <line x1={0} y1={-13} x2={0} y2={13} stroke={strokeSecondary} strokeWidth={1.5} strokeDasharray="3 3" />
      <path d="M-13 -4 H-4 M-7 -7 L-4 -4 L-7 -1" fill="none" stroke={toneLookup} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4 H13 M10 1 L13 4 L10 7" fill="none" stroke={toneLookup} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
