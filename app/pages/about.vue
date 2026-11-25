<script setup lang="ts">
import { siteConfig } from "@/site.config";

useHead({
  title: "About",
  link: [{ rel: "canonical", href: "/about/" }],
});
useSeoMeta({
  description:
    "Mission, verification standards, open licenses, and how to contribute to How the Internet Works.",
});
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 px-4 py-8">
    <div>
      <h1 class="text-[32px] font-medium leading-[1.15] tracking-tight text-[var(--color-primary)]">
        About How the Internet Works
      </h1>
      <p class="mt-3 text-[16px] leading-[25px] text-[var(--color-secondary)]">
        How the Internet Works is a free, open-source interactive atlas of
        computer networking. Readers step through real exchanges one message
        at a time, starting with plain language and opening any packet to
        inspect its layers and bytes.
      </p>
    </div>

    <section class="space-y-2">
      <h2 class="text-[20px] font-medium text-[var(--color-primary)]">
        How content is verified
      </h2>
      <p class="text-[15px] leading-[22px] text-[var(--color-secondary)]">
        Every port number, protocol flag, message name, timer, and frame size
        is checked against the RFC or technical specification cited on that
        topic page. Topics whose claims are fully verified are marked
        reviewed; topics with open questions remain marked draft with review
        notes listed directly on the page.
      </p>
    </section>

    <section class="space-y-2">
      <h2 class="text-[20px] font-medium text-[var(--color-primary)]">
        Licenses
      </h2>
      <p class="text-[15px] leading-[22px] text-[var(--color-secondary)]">
        All software source code is licensed under the MIT License. All
        educational content under
        <code class="rounded bg-[var(--color-raised)] px-1.5 py-0.5 font-mono text-[13px]">
          src/content/
        </code>
        is licensed under CC BY-SA 4.0.
      </p>
    </section>

    <section class="space-y-2">
      <h2 class="text-[20px] font-medium text-[var(--color-primary)]">
        Contribute
      </h2>
      <p class="text-[15px] leading-[22px] text-[var(--color-secondary)]">
        Contributions, corrections, and new topics are welcome on
        <a
          :href="siteConfig.repo"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[var(--color-accent)] hover:underline"
        >
          GitHub
        </a>. Every topic lives in a single typed file validated by automated
        schema, routing, layout, and originality checks.
      </p>
    </section>
  </div>
</template>
