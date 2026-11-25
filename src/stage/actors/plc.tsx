import { fillCard, fillRaised, strokeSecondary, toneHandshake } from "./shared";

export function PlcIcon() {
  return (
    <g>
      <rect
        x={-28}
        y={-22}
        width={56}
        height={44}
        rx={3}
        fill={fillCard}
        stroke={strokeSecondary}
        strokeWidth={1.75}
      />
      <rect x={-22} y={-16} width={44} height={14} rx={2} fill={fillRaised} stroke={strokeSecondary} strokeWidth={1.2} />
      <circle cx={-15} cy={-9} r={2} fill={toneHandshake} />
      <circle cx={-8} cy={-9} r={2} fill={toneHandshake} />
      <line x1={0} y1={-9} x2={16} y2={-9} stroke={strokeSecondary} strokeWidth={1.4} />
      {[-18, -9, 0, 9, 18].map((x) => (
        <rect
          key={x}
          x={x - 2.5}
          y={5}
          width={5}
          height={10}
          rx={1}
          fill={fillRaised}
          stroke={strokeSecondary}
          strokeWidth={1.2}
        />
      ))}
    </g>
  );
}
