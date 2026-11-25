<script setup lang="ts">
import { getTopic, topics } from "@/content";
import HeroPlayer from "~/components/site/HeroPlayer.vue";
import LayerMap from "~/components/site/LayerMap.vue";
import StartHere from "~/components/site/StartHere.vue";

useHead({
  titleTemplate: "%s",
  title: "How the Internet Works — Interactive Protocol & Packet Flows",
});
useSeoMeta({
  description:
    "Follow every message your device sends, one step at a time. Plain words first, every byte one click away.",
});

const heroFlow = getTopic("https") ?? topics[0];
</script>

<template>
  <div class="mx-auto max-w-[1320px] px-4 py-10 sm:py-14">
    <!-- Hero -->
    <section class="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div>
        <h1 class="text-[36px] font-medium leading-[1.08] tracking-[-0.02em] text-[var(--color-primary)] sm:text-[56px]">
          What happens when you press Enter
        </h1>
        <p class="mt-4 max-w-xl text-[16px] leading-[25px] text-[var(--color-secondary)] sm:text-[18px] sm:leading-[28px]">
          Follow every message your device sends, one step at a time. Plain
          words first, every byte one click away. Free and open source.
        </p>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <NuxtLink
            to="/learn/http/"
            class="inline-flex min-h-[44px] items-center rounded-[8px] bg-[var(--color-btn-primary-bg)] px-5 text-[15px] font-medium text-[var(--color-btn-primary-fg)] transition-opacity duration-150 hover:opacity-90"
          >
            Follow a page load
          </NuxtLink>
          <NuxtLink
            to="/topics/"
            class="inline-flex min-h-[44px] items-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-5 text-[15px] font-medium text-[var(--color-primary)] transition-colors duration-150 hover:bg-[var(--color-raised)]"
          >
            See all topics
          </NuxtLink>
        </div>
      </div>

      <HeroPlayer v-if="heroFlow" :flow="heroFlow" />
    </section>

    <StartHere />
    <LayerMap />

    <!-- How this site works -->
    <section aria-labelledby="how-works-heading" class="py-10">
      <h2
        id="how-works-heading"
        class="text-[22px] font-medium text-[var(--color-primary)]"
      >
        How this site works
      </h2>
      <div class="mt-4 grid gap-6 md:grid-cols-3">
        <p class="text-[15px] leading-[22px] text-[var(--color-secondary)]">
          Every port number, header field, flag, and frame size is checked
          against the governing RFC or technical specification. Each topic
          lists its primary sources at the bottom of the page so you can read
          the standards directly.
        </p>
        <p class="text-[15px] leading-[22px] text-[var(--color-secondary)]">
          If you spot an error or an unclear step, use the
          <span class="text-[var(--color-primary)]">
            Report an error in this step
          </span>
          link below any player. It opens a pre-filled GitHub issue naming
          the exact topic and step so maintainers can verify and fix it.
        </p>
        <p class="text-[15px] leading-[22px] text-[var(--color-secondary)]">
          The codebase is MIT-licensed and the educational content is licensed
          under CC BY-SA 4.0. Every topic lives in a single typed file, and
          contributors can add new protocols, journeys, or translations
          through GitHub pull requests.
        </p>
      </div>
    </section>
  </div>
</template>
