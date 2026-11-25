<script setup lang="ts">
import { Info } from "lucide-vue-next";
import { useRoute } from "vue-router";
import { getTopic } from "@/content";
import { stripMarkup } from "@/lib/rich-text";
import FlowPlayer from "~/components/flow/FlowPlayer.vue";

const LAYER_LABELS: Record<
  "link" | "internet" | "transport" | "application",
  string
> = {
  link: "Link layer",
  internet: "Internet layer",
  transport: "Transport layer",
  application: "Application layer",
};

const route = useRoute();
const slug = String(route.params.slug ?? "");
const topic = getTopic(slug);

if (!topic) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}

const relatedTopics = topic.meta.related
  .map((relSlug) => getTopic(relSlug))
  .filter((t): t is NonNullable<typeof t> => Boolean(t))
  .map((t) => ({
    slug: t.meta.slug,
    title: t.meta.title,
    tagline: t.meta.tagline,
  }));

const layer = topic.meta.layer;
const desc = `${topic.meta.tagline}. ${stripMarkup(topic.intro.simple)}`;

useHead({
  title: topic.meta.title,
  link: [{ rel: "canonical", href: `/learn/${topic.meta.slug}/` }],
});
useSeoMeta({
  description: desc,
});
</script>

<template>
  <div class="mx-auto max-w-[1320px] px-4 py-6">
    <div class="mb-6">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 class="text-[32px] font-medium leading-[1.15] tracking-tight text-[var(--color-primary)]">
          {{ topic.meta.title }}
        </h1>
        <span
          v-if="topic.meta.fullName"
          class="text-[16px] text-[var(--color-secondary)]"
        >
          {{ topic.meta.fullName }}
        </span>
        <span
          v-if="layer"
          :title="layer.note"
          class="inline-flex items-center gap-1 rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-2 py-0.5 text-[12px] text-[var(--color-secondary)]"
        >
          <span>
            {{ LAYER_LABELS[layer.tcpip] }}
            {{ layer.osi ? ` \u00b7 OSI ${layer.osi}` : "" }}
          </span>
          <Info v-if="layer.note" :size="13" :stroke-width="1.5" />
        </span>
      </div>
      <p class="mt-1.5 text-[15px] leading-[22px] text-[var(--color-secondary)]">
        {{ topic.meta.tagline }}
      </p>
    </div>

    <FlowPlayer :flow="topic" :related-topics="relatedTopics" />
  </div>
</template>
