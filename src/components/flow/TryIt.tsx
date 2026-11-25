"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { TryIt as TryItSpec } from "@/content/schema";

const OS_LABELS: Record<"windows" | "macos" | "linux", string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

export function TryIt({ items }: { items?: TryItSpec[] }) {
  const [os, setOs] = useState<"windows" | "macos" | "linux">("windows");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  function copyCmd(cmd: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cmd).catch(() => {});
    }
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1500);
  }

  return (
    <section aria-labelledby="try-it-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="try-it-heading"
          className="text-[18px] font-medium text-[var(--color-primary)]"
        >
          Try it yourself
        </h2>
        <div
          role="group"
          aria-label="Operating system"
          className="inline-flex rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-0.5"
        >
          {(["windows", "macos", "linux"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setOs(k)}
              aria-pressed={os === k}
              className={`cursor-pointer rounded-[6px] px-2.5 py-1 text-[12px] transition-colors duration-150 ${
                os === k
                  ? "bg-[var(--color-raised)] font-medium text-[var(--color-primary)]"
                  : "text-[var(--color-secondary)]"
              }`}
            >
              {OS_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {items.map((item) => {
        const match =
          item.commands.find((c) => c.os === os) ?? item.commands[0];
        return (
          <div
            key={item.title}
            className="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4"
          >
            <h3 className="text-[15px] font-medium text-[var(--color-primary)]">
              {item.title}
            </h3>
            <p className="mt-1 text-[14px] leading-5 text-[var(--color-secondary)]">
              {item.explain}
            </p>
            {match && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-raised)] px-3 py-2">
                <code className="overflow-x-auto font-mono text-[13px] text-[var(--color-primary)]">
                  {match.cmd}
                </code>
                <button
                  type="button"
                  onClick={() => copyCmd(match.cmd)}
                  aria-label="Copy command"
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[var(--color-secondary)] hover:bg-[var(--color-card)] hover:text-[var(--color-primary)]"
                >
                  {copiedCmd === match.cmd ? (
                    <Check size={15} strokeWidth={1.5} />
                  ) : (
                    <Copy size={15} strokeWidth={1.5} />
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
