import { fillCard, fillRaised, strokeSecondary, toneData } from "./shared";

export function LoadBalancerIcon() {
  return (
    <g>
      <rect
        x={-28}
        y={-22}
        width={56}
        height={44}
        rx={5}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-22} y={-16} width={44} height={32} rx={2} fill={fillRaised} />
      <line x1={-16} y1={0} x2={-2} y2={0} stroke={toneData} strokeWidth={1.75} />
      <path d="M-2 0 L14 -9 M-2 0 L14 0 M-2 0 L14 9" fill="none" stroke={toneData} strokeWidth={1.5} />
      <circle cx={15} cy={-9} r={2} fill={toneData} />
      <circle cx={15} cy={0} r={2} fill={toneData} />
      <circle cx={15} cy={9} r={2} fill={toneData} />
    </g>
  );
}
