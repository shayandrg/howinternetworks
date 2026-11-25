"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { glossaryMap } from "@/content/glossary";

interface GlossaryTermProps {
  id: string;
  label?: string;
}

export function GlossaryTerm({ id, label }: GlossaryTermProps) {
  const entry = glossaryMap[id];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!entry) {
    return <span>{label ?? id}</span>;
  }

  const shown = label ?? entry.term;

  return (
    <span
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (
            wrapRef.current &&
            !wrapRef.current.contains(e.relatedTarget as Node | null)
          ) {
            setOpen(false);
          }
        }}
        className="cursor-pointer border-b border-dotted border-[var(--color-secondary)] text-inherit hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        {shown}
      </button>

      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute start-0 top-full z-30 mt-1.5 block w-64 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3 text-start text-[13px] leading-[19px] text-[var(--color-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <span className="block font-medium text-[var(--color-primary)]">
            {entry.term}
          </span>
          <span className="mt-1 block text-[var(--color-secondary)]">
            {entry.short}
          </span>
          <Link
            href={`/glossary/#${entry.id}`}
            className="mt-2 inline-block text-[12px] font-medium text-[var(--color-accent)] hover:underline"
          >
            In glossary
          </Link>
        </span>
      )}
    </span>
  );
}
