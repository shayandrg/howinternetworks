"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore storage errors
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        mounted
          ? theme === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Toggle theme"
      }
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)]"
    >
      {mounted && theme === "dark" ? (
        <Sun size={18} strokeWidth={1.5} />
      ) : (
        <Moon size={18} strokeWidth={1.5} />
      )}
    </button>
  );
}
