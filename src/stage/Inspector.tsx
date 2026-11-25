"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import type { Layer, Tone } from "@/engine/types";
import { PacketChip } from "./PacketChip";

export interface InspectedPacket {
  id: string;
  label: string;
  tone: Tone;
  locked?: boolean;
  bytes?: number;
  layers?: Layer[];
}

interface InspectorProps {
  packet?: InspectedPacket;
}

function renderNestedLayers(
  layers: Layer[],
  index: number,
  othersView: boolean,
  bytes?: number,
) {
  if (index >= layers.length) return null;
  const layer = layers[index];
  const isCollapsedEncrypted = othersView && Boolean(layer.encrypted);

  return (
    <div
      key={`${layer.name}-${index}`}
      className="mt-2 rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-2.5 ps-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-[13px] font-medium text-[var(--color-primary)]">
          {isCollapsedEncrypted ? "Encrypted" : layer.name}
        </span>
        {isCollapsedEncrypted ? (
          <span className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--color-tone-secure)]">
            <Lock size={14} strokeWidth={1.5} />
            {bytes ? `${bytes} B` : layer.summary ?? "Protected"}
          </span>
        ) : (
          layer.summary && (
            <span className="truncate font-mono text-[11px] text-[var(--color-muted)]">
              {layer.summary}
            </span>
          )
        )}
      </div>

      {!isCollapsedEncrypted && (
        <dl className="mt-2 space-y-1">
          {layer.fields.map((field, fi) => (
            <div
              key={`${field.name}-${fi}`}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 text-[12px] leading-4"
            >
              <dt className="text-[var(--color-secondary)]">{field.name}</dt>
              <dd className="break-all font-mono text-[var(--color-primary)]">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!isCollapsedEncrypted && renderNestedLayers(layers, index + 1, othersView, bytes)}
    </div>
  );
}

export function Inspector({ packet }: InspectorProps) {
  const [othersView, setOthersView] = useState(false);

  return (
    <section
      aria-label="Packet inspector"
      className="mt-4 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-medium text-[var(--color-primary)]">
          {"What's inside"}
        </h3>
        {packet && (
          <PacketChip
            tone={packet.tone}
            label={packet.label}
            locked={packet.locked}
          />
        )}
      </div>

      <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-secondary)]">
        <input
          type="checkbox"
          checked={othersView}
          onChange={(e) => setOthersView(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
        />
        <span>What others on the network can see</span>
      </label>

      {!packet ? (
        <p className="mt-3 text-[13px] text-[var(--color-muted)]">
          Play a step or select a captured packet to inspect its layers.
        </p>
      ) : !packet.layers || packet.layers.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--color-muted)]">
          No layer details for this message yet.
        </p>
      ) : (
        <div className="mt-2">
          {renderNestedLayers(packet.layers, 0, othersView, packet.bytes)}
        </div>
      )}
    </section>
  );
}
