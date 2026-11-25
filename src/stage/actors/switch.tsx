import { fillCard, fillRaised, strokeSecondary, toneHandshake } from "./shared";

export function SwitchIcon() {
  return (
    <g>
      <rect
        x={-34}
        y={-14}
        width={68}
        height={28}
        rx={4}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-28} y={-7} width={56} height={14} rx={2} fill={fillRaised} />
      {[-22, -13, -4, 5, 14].map((x) => (
        <rect
          key={x}
          x={x}
          y={-3}
          width={6}
          height={6}
          rx={1}
          fill="none"
          stroke={strokeSecondary}
          strokeWidth={1.2}
        />
      ))}
      <circle cx={23} cy={0} r={2} fill={toneHandshake} />
    </g>
  );
}
