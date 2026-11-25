import Link from "next/link";
import { siteConfig } from "@/site.config";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-hairline)] bg-[var(--color-card)]">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-6 text-[13px] text-[var(--color-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Code under MIT. Content under CC BY-SA 4.0. Inspired by Protocol
          Explorer by Dilum Sanjaya.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/about/"
            className="underline-offset-4 hover:text-[var(--color-primary)] hover:underline"
          >
            About
          </Link>
          <a
            href={siteConfig.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-[var(--color-primary)] hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
