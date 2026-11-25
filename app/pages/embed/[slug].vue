<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getTopic } from "@/content";
import { compileFlow } from "@/engine/compile";
import { frameAt } from "@/engine/frame";
import { createPlayer } from "@/engine/player";
import RichText from "~/components/flow/RichText.vue";
import ShortcutsDialog from "~/components/flow/ShortcutsDialog.vue";
import TransportBar from "~/components/flow/TransportBar.vue";
import StageCanvas from "~/components/stage/StageCanvas.vue";
import { usePlayerSelector } from "~/composables/usePlayer";

definePageMeta({
  layout: "embed",
});

const route = useRoute();
const slug = String(route.params.slug ?? "");
const flow = getTopic(slug);

if (!flow) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}

useHead({
  title: `${flow.meta.title} (Embed)`,
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const timeline = compileFlow(flow);
const player = createPlayer(timeline, { mode: "step" });

const t = usePlayerSelector(player, (s) => s.t);
const playing = usePlayerSelector(player, (s) => s.playing);
const speed = usePlayerSelector(player, (s) => s.speed);
const stepIndex = usePlayerSelector(player, (s) => s.stepIndex);

const reducedMotion = ref(false);
const shortcutsOpen = ref(false);

let removeMq: (() => void) | null = null;

onMounted(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = mq.matches;
  const onChange = () => {
    reducedMotion.value = mq.matches;
  };
  mq.addEventListener("change", onChange);
  removeMq = () => mq.removeEventListener("change", onChange);
});

onUnmounted(() => {
  removeMq?.();
  player.destroy();
});

const frame = computed(() =>
  frameAt(timeline, t.value, { reducedMotion: reducedMotion.value }),
);
const step = computed(() => (flow.steps[stepIndex.value] ?? flow.steps[0])!);
</script>

<template>
  <div class="mx-auto max-w-4xl p-3">
    <div class="mb-2 flex items-center justify-between gap-2">
      <span class="text-[14px] font-medium text-[var(--color-primary)]">
        {{ flow.meta.title }}: {{ step.title }}
      </span>
      <NuxtLink
        :to="`/learn/${flow.meta.slug}/`"
        target="_blank"
        rel="noopener noreferrer"
        class="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
      >
        Open the full topic
      </NuxtLink>
    </div>

    <StageCanvas
      :actors="flow.scene.actors"
      :links="flow.scene.links"
      :frame="frame"
      :step-title="step.title"
    />

    <TransportBar
      :timeline="timeline"
      :t="t"
      :playing="playing"
      :speed="speed"
      :step-index="stepIndex"
      mode="simple"
      @prev="player.prev()"
      @toggle-play="player.toggle()"
      @next="player.next()"
      @replay="player.replay()"
      @seek="(nextT) => player.seek(nextT)"
      @set-speed="(s) => player.setSpeed(s)"
      @set-mode="() => {}"
      @open-shortcuts="shortcutsOpen = true"
    />

    <p class="mt-3 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3 text-[15px] leading-[22px] text-[var(--color-primary)]">
      <RichText :text="step.simple" />
    </p>

    <ShortcutsDialog :open="shortcutsOpen" @close="shortcutsOpen = false" />
  </div>
</template>
