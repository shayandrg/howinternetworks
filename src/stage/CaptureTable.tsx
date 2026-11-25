"use client";

import { useState } from "react";
import type { CompiledCapture } from "@/engine/compile";

interface CaptureTableProps {
  captures: CompiledCapture[];
  visibleCaptures: number;
  activePacketId?: string;
  onSelectCapture: (capture: CompiledCapture) => void;
}

export function CaptureTable({
  captures,
  visibleCaptures,
  activePacketId,
  onSelectCapture,
}: CaptureTableProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (captures.length === 0) {
    return null;
  }

  const visibleRows = captures.slice(0, visibleCaptures);

  return (
    <section aria-label="Packet capture" className="mt-4">
      <div className="mb-2 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="min-h-[44px] cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-4 text-sm font-medium text-[var(--color-primary)]"
        >
          {mobileOpen
            ? "Hide captured packets"
            : `Show captured packets (${visibleRows.length})`}
        </button>
      </div>

      <div
        className={`${mobileOpen ? "block" : "hidden"} md:block overflow-hidden rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)]`}
      >
        <div className="max-h-[252px] overflow-auto">
          <table className="w-full border-collapse text-start text-[13px] leading-5">
            <thead className="sticky top-0 z-10 border-b border-[var(--color-hairline)] bg-[var(--color-raised)] text-[var(--color-secondary)]">
              <tr>
                <th className="px-3 py-2 text-start font-medium">No.</th>
                <th className="px-3 py-2 text-start font-medium">Time</th>
                <th className="px-3 py-2 text-start font-medium">Source</th>
                <th className="px-3 py-2 text-start font-medium">Destination</th>
                <th className="px-3 py-2 text-start font-medium">Protocol</th>
                <th className="px-3 py-2 text-start font-medium">Info</th>
                <th className="px-3 py-2 text-end font-medium">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-[var(--color-muted)]"
                  >
                    Play the first step to capture packets.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const isActive = activePacketId === row.eventId;
                  return (
                    <tr
                      key={row.packetKey}
                      tabIndex={0}
                      onClick={() => onSelectCapture(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectCapture(row);
                        }
                      }}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isActive
                          ? "bg-[var(--color-raised)]"
                          : "hover:bg-[var(--color-raised)]/60"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono tabular-nums text-[var(--color-muted)]">
                        {row.index + 1}
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums text-[var(--color-secondary)]">
                        {row.capture.time.toFixed(3)} s
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--color-primary)]">
                        {row.capture.src}
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--color-primary)]">
                        {row.capture.dst}
                      </td>
                      <td className="px-3 py-2 font-mono font-medium text-[var(--color-primary)]">
                        {row.capture.protocol}
                      </td>
                      <td className="px-3 py-2 text-[var(--color-secondary)]">
                        {row.capture.info}
                      </td>
                      <td className="px-3 py-2 text-end font-mono tabular-nums text-[var(--color-secondary)]">
                        {row.capture.bytes} B
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
