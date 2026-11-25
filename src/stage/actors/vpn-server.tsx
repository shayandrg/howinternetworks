import { fillCard, fillRaised, strokeSecondary, toneSecure } from "./shared";

export function VpnServerIcon() {
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
      <rect x={-18} y={-20} width={36} height={40} rx={2} fill={fillRaised} />
      <path
        d="M-6 -4 V-9 A 6 6 0 0 1 6 -9 V-4"
        fill="none"
        stroke={toneSecure}
        strokeWidth={1.75}
      />
      <rect
        x={-9}
        y={-4}
        width={18}
        height={14}
        rx={2}
        fill={fillCard}
        stroke={toneSecure}
        strokeWidth={1.6}
      />
      <circle cx={0} cy={3} r={2} fill={toneSecure} />
    </g>
  );
}
