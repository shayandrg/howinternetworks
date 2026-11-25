import { fillCard, fillRaised, strokeSecondary, toneLookup } from "./shared";

export function DnsServerIcon() {
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
      <rect x={-19} y={-20} width={38} height={24} rx={2} fill={fillRaised} />
      <circle cx={-6} cy={-9} r={6} fill="none" stroke={toneLookup} strokeWidth={1.6} />
      <line x1={-1.5} y1={-4.5} x2={4} y2={1} stroke={toneLookup} strokeWidth={1.6} strokeLinecap="round" />
      <line x1={-14} y1={12} x2={14} y2={12} stroke={strokeSecondary} strokeWidth={1.4} />
      <line x1={-14} y1={18} x2={6} y2={18} stroke={strokeSecondary} strokeWidth={1.4} />
    </g>
  );
}
