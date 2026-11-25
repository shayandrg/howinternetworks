import type { Actor, Frame } from "@/engine/types";
import { TONE_VARS } from "../PacketChip";

interface NotesLayerProps {
  notes: Frame["notes"];
  actorMap: Map<string, Actor>;
}

export function NotesLayer({ notes, actorMap }: NotesLayerProps) {
  return (
    <g aria-hidden="true">
      {notes.map((note) => {
        const actor = actorMap.get(note.at);
        if (!actor || note.opacity <= 0) return null;

        const w = Math.max(88, note.text.length * 6.8 + 20);
        const h = 24;
        const boxCenterX = Math.max(
          w / 2 + 12,
          Math.min(1000 - w / 2 - 12, actor.at.x),
        );
        const boxBottomY = actor.at.y - 48 - note.rise;
        const boxTopY = boxBottomY - h;
        const border = note.tone
          ? TONE_VARS[note.tone]
          : "var(--color-secondary)";

        return (
          <g key={note.id} opacity={note.opacity}>
            <line
              x1={actor.at.x}
              y1={actor.at.y - 34}
              x2={boxCenterX}
              y2={boxBottomY}
              stroke={border}
              strokeWidth={1.2}
            />
            <rect
              x={boxCenterX - w / 2}
              y={boxTopY}
              width={w}
              height={h}
              rx={6}
              fill="var(--color-card)"
              stroke={border}
              strokeWidth={1.5}
            />
            <text
              x={boxCenterX}
              y={boxTopY + 15.5}
              textAnchor="middle"
              fontSize={11}
              fontFamily="var(--font-sans), sans-serif"
              fontWeight={500}
              fill="var(--color-primary)"
            >
              {note.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}
