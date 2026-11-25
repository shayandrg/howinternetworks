"use client";

import { useEffect, useRef, useState } from "react";
import { shouldIgnoreKeyEvent } from "@/lib/keyboard";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { SearchDialog } from "./SearchDialog";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (shouldIgnoreKeyEvent(e.target)) return;
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleClose() {
    setSearchOpen(false);
    requestAnimationFrame(() => searchBtnRef.current?.focus());
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        searchButtonRef={searchBtnRef}
      />
      <main className="flex-1">{children}</main>
      <Footer />
      <SearchDialog open={searchOpen} onClose={handleClose} />
    </div>
  );
}
