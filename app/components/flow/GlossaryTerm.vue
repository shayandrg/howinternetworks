<script setup lang="ts">
import { computed, onUnmounted, ref, useId, watch } from "vue";
import { glossaryMap } from "@/content/glossary";

const props = defineProps<{
  id: string;
  label?: string;
}>();

const entry = computed(() => glossaryMap[props.id]);
const shown = computed(() => props.label ?? entry.value?.term ?? props.id);
const open = ref(false);
const wrapRef = ref<HTMLSpanElement | null>(null);
const popoverId = useId();

let cleanupListeners: (() => void) | null = null;

watch(open, (isOpen) => {
  cleanupListeners?.();
  cleanupListeners = null;
  if (!isOpen || typeof window === "undefined") return;

  const onDocMouseDown = (e: MouseEvent) => {
    if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
      open.value = false;
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      open.value = false;
    }
  };

  document.addEventListener("mousedown", onDocMouseDown);
  window.addEventListener("keydown", onKey);
  cleanupListeners = () => {
    document.removeEventListener("mousedown", onDocMouseDown);
    window.removeEventListener("keydown", onKey);
  };
});

onUnmounted(() => {
  cleanupListeners?.();
});

function onBlur(e: FocusEvent) {
  if (wrapRef.value && !wrapRef.value.contains(e.relatedTarget as Node | null)) {
    open.value = false;
  }
}
</script>

<template>
  <span v-if="!entry">{{ shown }}</span>
  <span
    v-else
    ref="wrapRef"
    class="relative inline-block"
    @mouseenter="open = true"
    @mouseleave="open = false"
  >
    <button
      type="button"
      :aria-expanded="open"
      :aria-describedby="open ? popoverId : undefined"
      class="cursor-pointer border-b border-dotted border-[var(--color-secondary)] text-inherit hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      @click="open = !open"
      @focus="open = true"
      @blur="onBlur"
    >
      {{ shown }}
    </button>

    <span
      v-if="open"
      :id="popoverId"
      role="tooltip"
      class="absolute start-0 top-full z-30 mt-1.5 block w-64 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-3 text-start text-[13px] leading-[19px] text-[var(--color-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
    >
      <span class="block font-medium text-[var(--color-primary)]">
        {{ entry.term }}
      </span>
      <span class="mt-1 block text-[var(--color-secondary)]">
        {{ entry.short }}
      </span>
      <NuxtLink
        :to="`/glossary/#${entry.id}`"
        class="mt-2 inline-block text-[12px] font-medium text-[var(--color-accent)] hover:underline"
      >
        In glossary
      </NuxtLink>
    </span>
  </span>
</template>
