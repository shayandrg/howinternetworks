"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { SearchDialog } from "@/components/site/SearchDialog";

export default function NotFound() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-[28px] font-medium text-[var(--color-primary)]">
        Page not found
      </h1>
      <p className="max-w-md text-[15px] leading-[22px] text-[var(--color-secondary)]">
        That page does not exist. Search for a protocol or return to the topic
        list.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] bg-[var(--color-btn-primary-bg)] px-4 text-[14px] font-medium text-[var(--color-btn-primary-fg)]"
        >
          <Search size={16} strokeWidth={1.5} />
          <span>Search topics</span>
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-4 text-[14px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-raised)]"
        >
          Go home
        </Link>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
