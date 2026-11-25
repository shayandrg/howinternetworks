<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { X } from "lucide-vue-next";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const SHORTCUTS = [
  { keys: "Space", desc: "Play or pause" },
  { keys: "\u2190 / \u2192", desc: "Previous or next step" },
  { keys: "Home / End", desc: "First or last step" },
  { keys: "1 \u2013 9", desc: "Jump to step" },
  { keys: "M", desc: "Switch Simple / Technical" },
  { keys: "V", desc: "Switch Network / Sequence" },
  { keys: "Ctrl K / /", desc: "Search topics and glossary" },
  { keys: "?", desc: "Toggle this shortcuts help" },
  { keys: "Esc", desc: "Close dialog or popover" },
];

const closeRef = ref<HTMLButtonElement | null>(null);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      closeRef.value?.focus();
    }
  },
);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  }
}
</script>

<template>
  <div
    v-if="open"
    role="dialog"
    aria-modal="true"
    aria-label="Keyboard shortcuts"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
    @click.self="emit('close')"
    @keydown="onKeyDown"
  >
    <div class="w-full max-w-md rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-5">
      <div class="flex items-center justify-between">
        <h2 class="text-[16px] font-medium text-[var(--color-primary)]">
          Keyboard shortcuts
        </h2>
        <button
          ref="closeRef"
          type="button"
          aria-label="Close shortcuts"
          class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-[var(--color-secondary)] hover:bg-[var(--color-raised)]"
          @click="emit('close')"
        >
          <X :size="16" :stroke-width="1.5" />
        </button>
      </div>

      <dl class="mt-4 space-y-2.5">
        <div
          v-for="s in SHORTCUTS"
          :key="s.keys"
          class="flex items-center justify-between gap-4 text-[13px]"
        >
          <dt class="text-[var(--color-secondary)]">{{ s.desc }}</dt>
          <dd>
            <kbd class="rounded-[4px] border border-[var(--color-hairline)] bg-[var(--color-raised)] px-2 py-0.5 font-mono text-[12px] text-[var(--color-primary)]">
              {{ s.keys }}
            </kbd>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
