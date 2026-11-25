import { fillCard, fillRaised, strokeSecondary, toneRequest } from "./shared";

export function MailServerIcon() {
  return (
    <g>
      <rect
        x={-26}
        y={-24}
        width={52}
        height={48}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect
        x={-18}
        y={-14}
        width={36}
        height={24}
        rx={2}
        fill={fillRaised}
        stroke={strokeSecondary}
        strokeWidth={1.3}
      />
      <path
        d="M-18 -14 L0 -1 L18 -14"
        fill="none"
        stroke={toneRequest}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <line x1={-12} y1={17} x2={12} y2={17} stroke={strokeSecondary} strokeWidth={1.4} />
    </g>
  );
}
