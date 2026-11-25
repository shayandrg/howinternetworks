import type { Frame } from "@/engine/types";
import { SvgPacketChip, TONE_VARS } from "../PacketChip";

interface PacketsLayerProps {
  packets: Frame["packets"];
  hoveredPacketId?: string;
  selectedPacketId?: string;
  onSelectPacket?: (eventId: string) => void;
}

export function PacketsLayer({
  packets,
  hoveredPacketId,
  selectedPacketId,
  onSelectPacket,
}: PacketsLayerProps) {
  return (
    <g>
      {packets.map((pkt) => {
        const color = TONE_VARS[pkt.tone];
        const pointsStr = pkt.trail.map((pt) => `${pt[0]},${pt[1]}`).join(" ");
        return (
          <g key={`trail-${pkt.key}`}>
            {pkt.trail.length >= 2 && pkt.trailOpacity > 0 && (
              <polyline
                points={pointsStr}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeOpacity={0.4 * pkt.trailOpacity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}
      {packets.map((pkt) => {
        if (pkt.opacity <= 0) return null;
        const highlighted =
          hoveredPacketId === pkt.eventId || selectedPacketId === pkt.eventId;
        return (
          <SvgPacketChip
            key={`chip-${pkt.key}`}
            x={pkt.x}
            y={pkt.y}
            tone={pkt.tone}
            label={pkt.label}
            locked={pkt.locked}
            opacity={pkt.opacity}
            highlighted={highlighted}
            onClick={
              onSelectPacket ? () => onSelectPacket(pkt.eventId) : undefined
            }
          />
        );
      })}
    </g>
  );
}
