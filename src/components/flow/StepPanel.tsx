"use client";

import type { Step } from "@/engine/types";
import type { TextMode } from "@/lib/url-state";
import { Inspector, type InspectedPacket } from "@/stage/Inspector";
import { RichText, type PacketChipMeta } from "./RichText";

interface StepPanelProps {
  step: Step;
  stepIndex: number;
  totalSteps: number;
  mode: TextMode;
  packetsById: Map<string, PacketChipMeta>;
  hoveredPacketId?: string;
  onHoverPacket: (id: string | undefined) => void;
  onSelectPacket: (id: string) => void;
  inspectedPacket?: InspectedPacket;
  onPrev: () => void;
  onNext: () => void;
}

export function StepPanel({
  step,
  stepIndex,
  totalSteps,
  mode,
  packetsById,
  hoveredPacketId,
  onHoverPacket,
  onSelectPacket,
  inspectedPacket,
  onPrev,
  onNext,
}: StepPanelProps) {
  return (
    <aside
      aria-label="Current step"
      className="w-full shrink-0 rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4 desktop:w-[360px]"
    >
      <div className="text-[12px] font-medium text-[var(--color-muted)] tabular-nums">
        Step {stepIndex + 1} of {totalSteps}
      </div>
      <h2 className="mt-0.5 text-[20px] font-medium leading-tight text-[var(--color-primary)]">
        {step.title}
      </h2>

      <p className="mt-3 text-[17px] leading-[26px] text-[var(--color-primary)]">
        <RichText
          text={step.simple}
          packetsById={packetsById}
          hoveredPacketId={hoveredPacketId}
          onHoverPacket={onHoverPacket}
          onSelectPacket={onSelectPacket}
        />
      </p>

      {mode === "technical" && (
        <div className="mt-3 rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] p-3">
          <div className="mb-1 text-[12px] font-medium text-[var(--color-muted)]">
            Technical detail
          </div>
          <p className="text-[14px] leading-[21px] text-[var(--color-secondary)]">
            <RichText
              text={step.technical}
              packetsById={packetsById}
              hoveredPacketId={hoveredPacketId}
              onHoverPacket={onHoverPacket}
              onSelectPacket={onSelectPacket}
            />
          </p>
        </div>
      )}

      {step.facts && step.facts.length > 0 && (
        <dl className="mt-3 space-y-1.5 border-t border-[var(--color-hairline)] pt-3">
          {step.facts.map((fact) => (
            <div
              key={fact.label}
              className="flex items-baseline justify-between gap-3 text-[13px]"
            >
              <dt className="text-[var(--color-muted)]">{fact.label}</dt>
              <dd className="text-end font-mono text-[12px] text-[var(--color-primary)]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Mobile Back / Next controls */}
      <div className="mt-4 flex gap-2 md:hidden">
        <button
          type="button"
          onClick={onPrev}
          disabled={stepIndex === 0}
          className="min-h-[44px] flex-1 cursor-pointer rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] text-[14px] font-medium text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={stepIndex >= totalSteps - 1}
          className="min-h-[44px] flex-1 cursor-pointer rounded-[8px] bg-[var(--color-btn-primary-bg)] text-[14px] font-medium text-[var(--color-btn-primary-fg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <Inspector packet={inspectedPacket} />
    </aside>
  );
}
