import type { Tone } from "@/engine/types";

export const TONE_VARS: Record<Tone, string> = {
  lookup: "var(--color-tone-lookup)",
  handshake: "var(--color-tone-handshake)",
  request: "var(--color-tone-request)",
  response: "var(--color-tone-response)",
  secure: "var(--color-tone-secure)",
  control: "var(--color-tone-control)",
  data: "var(--color-tone-data)",
  error: "var(--color-tone-error)",
};

export const TONE_LABELS: Record<Tone, string> = {
  lookup: "Lookup",
  handshake: "Handshake",
  request: "Request",
  response: "Response",
  secure: "Encrypted",
  control: "Control",
  data: "Data",
  error: "Lost or refused",
};

export function measureChipWidth(label: string, locked?: boolean): number {
  return Math.max(48, 16 + 6 + 5 + (locked ? 13 : 0) + label.length * 6.7);
}

interface SvgPacketChipProps {
  x: number;
  y: number;
  tone: Tone;
  label: string;
  locked?: boolean;
  opacity?: number;
  highlighted?: boolean;
  onClick?: () => void;
}

export function SvgPacketChip({
  x,
  y,
  tone,
  label,
  locked,
  opacity = 1,
  highlighted = false,
  onClick,
}: SvgPacketChipProps) {
  const color = TONE_VARS[tone];
  const w = measureChipWidth(label, locked);
  const h = 22;
  const left = -w / 2;
  const top = -h / 2;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={opacity}
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {highlighted && (
        <rect
          x={left - 3}
          y={top - 3}
          width={w + 6}
          height={h + 6}
          rx={8}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
        />
      )}
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={6}
        fill="var(--color-stage)"
      />
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={6}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={1.5}
      />
      <circle cx={left + 11} cy={0} r={3} fill={color} />
      {locked && (
        <g transform={`translate(${left + 19}, -5)`}>
          <rect
            x={0}
            y={4}
            width={8}
            height={6}
            rx={1}
            fill="none"
            stroke={color}
            strokeWidth={1.2}
          />
          <path
            d="M2 4 V2.5 A2 2 0 0 1 6 2.5 V4"
            fill="none"
            stroke={color}
            strokeWidth={1.2}
          />
        </g>
      )}
      <text
        x={left + 18 + (locked ? 12 : 0)}
        y={3.5}
        fontSize={11}
        fontFamily="var(--font-mono), monospace"
        fontWeight={500}
        fill="var(--color-primary)"
      >
        {label}
      </text>
    </g>
  );
}

interface PacketChipProps {
  tone: Tone;
  label: string;
  locked?: boolean;
  active?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: () => void;
}

export function PacketChip({
  tone,
  label,
  locked,
  active,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: PacketChipProps) {
  const color = TONE_VARS[tone];
  const interactive = Boolean(
    onClick || onMouseEnter || onFocus,
  );

  const content = (
    <>
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {locked && (
        <svg
          aria-hidden="true"
          width="10"
          height="11"
          viewBox="0 0 10 11"
          className="shrink-0"
        >
          <rect
            x="1"
            y="4.5"
            width="8"
            height="5.5"
            rx="1"
            fill="none"
            stroke={color}
            strokeWidth="1.3"
          />
          <path
            d="M3 4.5 V3 A2 2 0 0 1 7 3 V4.5"
            fill="none"
            stroke={color}
            strokeWidth="1.3"
          />
        </svg>
      )}
      <span className="font-mono text-[11px] font-medium leading-none text-[var(--color-primary)]">
        {label}
      </span>
    </>
  );

  const style = {
    borderColor: color,
    backgroundColor: `color-mix(in srgb, ${color} 12%, var(--color-stage))`,
    outline: active ? "2px solid var(--color-accent)" : undefined,
    outlineOffset: active ? "2px" : undefined,
  };

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        style={style}
        className="inline-flex h-[22px] cursor-pointer items-center gap-1.5 rounded-[6px] border-[1.5px] px-2 align-middle transition-colors duration-150"
      >
        {content}
      </button>
    );
  }

  return (
    <span
      style={style}
      className="inline-flex h-[22px] items-center gap-1.5 rounded-[6px] border-[1.5px] px-2 align-middle"
    >
      {content}
    </span>
  );
}
