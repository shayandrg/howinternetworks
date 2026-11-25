"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { siteConfig } from "@/site.config";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onOpenSearch: () => void;
  searchButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function Header({ onOpenSearch, searchButtonRef }: HeaderProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const mac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(mac);
  }, []);

  return (
    <header className="border-b border-[var(--color-hairline)] bg-[var(--color-card)]">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-primary)]"
        >
          {siteConfig.name}
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            ref={searchButtonRef}
            type="button"
            onClick={onOpenSearch}
            aria-label="Search topics and glossary"
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2.5 text-[13px] text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)]"
          >
            <Search size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-muted)] sm:inline">
              {isMac ? "\u2318 K" : "Ctrl K"}
            </kbd>
          </button>

          <nav aria-label="Primary" className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/topics/"
              className="text-[14px] text-[var(--color-secondary)] transition-colors duration-150 hover:text-[var(--color-primary)]"
            >
              Topics
            </Link>
            <Link
              href="/glossary/"
              className="text-[14px] text-[var(--color-secondary)] transition-colors duration-150 hover:text-[var(--color-primary)]"
            >
              Glossary
            </Link>
            <Link
              href="/about/"
              className="hidden text-[14px] text-[var(--color-secondary)] transition-colors duration-150 hover:text-[var(--color-primary)] sm:inline"
            >
              About
            </Link>
          </nav>

          <ThemeToggle />

          <a
            href={siteConfig.repo}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source code on GitHub"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)]"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
