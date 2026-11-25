"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "Space", desc: "Play or pause" },
  { keys: "\u2190 / \u2192", desc: "Previous or next step" },
  { keys: "Home / End", desc: "First or last step" },
  { keys: "1 \u2013 9", desc: "Jump to step" },
  { keys: "M", desc: "Switch Simple / Technical" },
  { keys: "V", desc: "Switch Network / Sequence" },
  { keys: "Ctrl K / /", desc: "Search topics and glossary" },
  { keys: "?", desc: "Toggle this shortcuts help" },
  { keys: "Esc", desc: "Close dialog or popover" },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => closeRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-[var(--color-primary)]">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-[var(--color-secondary)] hover:bg-[var(--color-raised)]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <dl className="mt-4 space-y-2.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.keys}
              className="flex items-center justify-between gap-4 text-[13px]"
            >
              <dt className="text-[var(--color-secondary)]">{s.desc}</dt>
              <dd>
                <kbd className="rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-raised)] px-2 py-0.5 font-mono text-[12px] text-[var(--color-primary)]">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
