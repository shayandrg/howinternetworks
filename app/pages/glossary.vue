<script setup lang="ts">
import { topics } from "@/content";
import { glossaryTerms } from "@/content/glossary";

useHead({
  title: "Glossary",
  link: [{ rel: "canonical", href: "/glossary/" }],
});
useSeoMeta({
  description:
    "Plain-language definitions of networking terms, protocols, and packet fields.",
});

function findTopicsUsingTerm(termId: string) {
  const needle = `[[${termId}`;
  return topics.filter((t) => {
    const blobs = [
      t.intro.simple,
      t.intro.technical,
      ...t.steps.flatMap((s) => [s.simple, s.technical]),
    ];
    return blobs.some(
      (b) => b.includes(`${needle}]]`) || b.includes(`${needle}|`),
    );
  });
}

const entries = [...glossaryTerms]
  .sort((a, b) => a.term.localeCompare(b.term))
  .map((term) => ({
    ...term,
    usedIn: findTopicsUsingTerm(term.id),
  }));
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <h1 class="text-[32px] font-medium leading-[1.15] tracking-tight text-[var(--color-primary)]">
      Glossary
    </h1>
    <p class="mt-2 text-[15px] leading-[22px] text-[var(--color-secondary)]">
      Every term linked from topic explanations, ordered A to Z.
    </p>

    <dl class="mt-8 divide-y divide-[var(--color-hairline)] rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)]">
      <div
        v-for="term in entries"
        :id="term.id"
        :key="term.id"
        class="scroll-mt-8 p-5"
      >
        <dt class="flex flex-wrap items-baseline gap-2">
          <span class="text-[18px] font-medium text-[var(--color-primary)]">
            {{ term.term }}
          </span>
          <span
            v-if="term.aka && term.aka.length > 0"
            class="text-[13px] text-[var(--color-muted)]"
          >
            Also: {{ term.aka.join(", ") }}
          </span>
        </dt>
        <dd class="mt-1.5 space-y-2 text-[15px] leading-[22px] text-[var(--color-secondary)]">
          <p class="text-[var(--color-primary)]">{{ term.short }}</p>
          <p v-if="term.long">{{ term.long }}</p>
          <div
            v-if="term.usedIn.length > 0"
            class="flex flex-wrap items-center gap-2 pt-1 text-[13px]"
          >
            <span class="text-[var(--color-muted)]">Used in:</span>
            <NuxtLink
              v-for="t in term.usedIn"
              :key="t.meta.slug"
              :to="`/learn/${t.meta.slug}/`"
              class="rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-page-bg)] px-2 py-0.5 text-[12px] font-medium text-[var(--color-accent)] hover:underline"
            >
              {{ t.meta.title }}
            </NuxtLink>
          </div>
        </dd>
      </div>
    </dl>
  </div>
</template>
