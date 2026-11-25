"use client";

import type { Tone } from "@/engine/types";
import { parseRichText } from "@/lib/rich-text";
import { PacketChip } from "@/stage/PacketChip";
import { GlossaryTerm } from "./GlossaryTerm";

export interface PacketChipMeta {
  id: string;
  label: string;
  tone: Tone;
  locked?: boolean;
}

interface RichTextProps {
  text: string;
  packetsById?: Map<string, PacketChipMeta>;
  hoveredPacketId?: string;
  onHoverPacket?: (id: string | undefined) => void;
  onSelectPacket?: (id: string) => void;
}

export function RichText({
  text,
  packetsById,
  hoveredPacketId,
  onHoverPacket,
  onSelectPacket,
}: RichTextProps) {
  const segments = parseRichText(text);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === "code") {
          return (
            <code
              key={i}
              className="rounded-[4px] bg-[var(--color-raised)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--color-primary)]"
            >
              {seg.text}
            </code>
          );
        }
        if (seg.type === "glossary") {
          return <GlossaryTerm key={i} id={seg.id} label={seg.label} />;
        }
        const meta = packetsById?.get(seg.id);
        if (!meta) {
          return (
            <code
              key={i}
              className="rounded-[4px] bg-[var(--color-raised)] px-1 py-0.5 font-mono text-[0.85em]"
            >
              {seg.id}
            </code>
          );
        }
        return (
          <span key={i} className="mx-0.5 inline-block align-middle">
            <PacketChip
              tone={meta.tone}
              label={meta.label}
              locked={meta.locked}
              active={hoveredPacketId === meta.id}
              onMouseEnter={() => onHoverPacket?.(meta.id)}
              onMouseLeave={() => onHoverPacket?.(undefined)}
              onFocus={() => onHoverPacket?.(meta.id)}
              onBlur={() => onHoverPacket?.(undefined)}
              onClick={() => onSelectPacket?.(meta.id)}
            />
          </span>
        );
      })}
    </>
  );
}
