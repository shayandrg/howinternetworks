"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { searchEntries } from "@/lib/search";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = searchEntries(query);
  const safeIndex =
    results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  function openEntry(href: string) {
    onClose();
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex((i) => (i + 1) % results.length);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      }
      return;
    }
    if (e.key === "Enter" && results[safeIndex]) {
      e.preventDefault();
      openEntry(results[safeIndex].href);
      return;
    }
    if (e.key === "Tab" && dialogRef.current) {
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        "input, button, a[href]",
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search topics and glossary"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-16"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg overflow-hidden rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)]"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-4 py-3">
          <Search
            size={18}
            strokeWidth={1.5}
            className="shrink-0 text-[var(--color-muted)]"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search protocols or terms"
            aria-label="Search protocols or terms"
            className="w-full bg-transparent text-[15px] text-[var(--color-primary)] placeholder:text-[var(--color-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-[var(--color-secondary)] hover:bg-[var(--color-raised)]"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--color-secondary)]">
              No topic matches “{query}”. Try a protocol name like DNS or TCP.
            </p>
          ) : (
            <ul role="listbox" className="space-y-1">
              {results.map((entry, idx) => {
                const active = idx === safeIndex;
                return (
                  <li key={`${entry.kind}-${entry.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => openEntry(entry.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-[8px] px-3 py-2 text-start transition-colors duration-150 ${
                        active
                          ? "bg-[var(--color-raised)]"
                          : "hover:bg-[var(--color-raised)]/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--color-primary)]">
                          {entry.title}
                        </div>
                        <div className="truncate text-[12px] text-[var(--color-secondary)]">
                          {entry.subtitle}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-[4px] border border-[var(--color-hairline)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">
                        {entry.kind === "topic" ? "Topic" : "Glossary"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
