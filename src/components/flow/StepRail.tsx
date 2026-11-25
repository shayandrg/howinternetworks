"use client";

import { useState } from "react";
import { Check, ChevronDown, List, X } from "lucide-react";
import type { Step } from "@/engine/types";

interface StepRailProps {
  steps: Step[];
  stepIndex: number;
  finished: boolean;
  onSelectStep: (index: number) => void;
}

export function StepRail({
  steps,
  stepIndex,
  finished,
  onSelectStep,
}: StepRailProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Desktop rail (>= 1100px) */}
      <nav
        aria-label="Steps"
        className="hidden w-[240px] shrink-0 desktop:block"
      >
        <ol className="space-y-1">
          {steps.map((step, idx) => {
            const isCurrent = idx === stepIndex;
            const isDone = idx < stepIndex || finished;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onSelectStep(idx)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-start text-[14px] leading-5 transition-colors duration-150 ${
                    isCurrent
                      ? "bg-[var(--color-raised)] font-medium text-[var(--color-primary)]"
                      : "text-[var(--color-secondary)] hover:bg-[var(--color-raised)]/60 hover:text-[var(--color-primary)]"
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ${
                      isCurrent
                        ? "bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)]"
                        : isDone
                          ? "bg-[var(--color-positive)]/15 text-[var(--color-positive)]"
                          : "border border-[var(--color-hairline)] text-[var(--color-muted)]"
                    }`}
                  >
                    {isDone && !isCurrent ? (
                      <Check size={12} strokeWidth={2} />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className="truncate">{step.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Tablet dropdown (768px .. 1099px) */}
      <div className="mb-3 hidden w-full md:block desktop:hidden">
        <label className="relative block">
          <span className="sr-only">Choose step</span>
          <select
            value={stepIndex}
            onChange={(e) => onSelectStep(Number(e.target.value))}
            aria-label="Choose step"
            className="h-10 w-full cursor-pointer appearance-none rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] pe-9 ps-3 text-[14px] font-medium text-[var(--color-primary)]"
          >
            {steps.map((step, idx) => (
              <option key={step.id} value={idx}>
                Step {idx + 1} of {steps.length}: {step.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute end-3 top-3 text-[var(--color-secondary)]"
          />
        </label>
      </div>

      {/* Mobile bottom sheet trigger (< 768px) */}
      <div className="mb-2 md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 text-[14px] font-medium text-[var(--color-primary)]"
        >
          <span className="flex items-center gap-2 truncate">
            <List size={16} strokeWidth={1.5} />
            <span className="truncate">
              Step {stepIndex + 1} of {steps.length}: {steps[stepIndex]?.title}
            </span>
          </span>
          <ChevronDown size={16} strokeWidth={1.5} />
        </button>
      </div>

      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All steps"
          className="fixed inset-0 z-50 flex items-end bg-black/45 md:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div className="w-full rounded-t-[16px] border-t border-[var(--color-hairline)] bg-[var(--color-card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-medium text-[var(--color-primary)]">
                Steps
              </span>
              <button
                type="button"
                aria-label="Close steps"
                onClick={() => setSheetOpen(false)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[8px] text-[var(--color-secondary)]"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <ol className="max-h-[60vh] space-y-1 overflow-y-auto">
              {steps.map((step, idx) => {
                const isCurrent = idx === stepIndex;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectStep(idx);
                        setSheetOpen(false);
                      }}
                      className={`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 text-start text-[14px] ${
                        isCurrent
                          ? "bg-[var(--color-raised)] font-medium text-[var(--color-primary)]"
                          : "text-[var(--color-secondary)]"
                      }`}
                    >
                      <span className="font-mono text-[12px] tabular-nums text-[var(--color-muted)]">
                        {idx + 1}
                      </span>
                      <span>{step.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
