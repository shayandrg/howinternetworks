import type { Metadata } from "next";
import { topics } from "@/content";
import { TopicsClient } from "./TopicsClient";

export const metadata: Metadata = {
  title: "Topics",
  description:
    "Browse all interactive internet protocol topics grouped by role and TCP/IP layer.",
  alternates: { canonical: "/topics/" },
};

export default function TopicsPage() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8">
      <h1 className="text-[32px] font-medium leading-[1.15] tracking-tight text-[var(--color-primary)]">
        Topics
      </h1>
      <p className="mt-2 text-[15px] leading-[22px] text-[var(--color-secondary)]">
        Every interactive flow currently available ({topics.length}{" "}
        {topics.length === 1 ? "topic" : "topics"}).
      </p>
      <TopicsClient topics={topics} />
    </div>
  );
}
