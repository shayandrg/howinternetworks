<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Search, X } from "lucide-vue-next";
import { searchEntries } from "@/lib/search";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const query = ref("");
const activeIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);
const dialogRef = ref<HTMLDivElement | null>(null);

const results = computed(() => searchEntries(query.value));
const safeIndex = computed(() =>
  results.value.length === 0
    ? 0
    : Math.min(activeIndex.value, results.value.length - 1),
);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      query.value = "";
      activeIndex.value = 0;
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

function openEntry(href: string) {
  emit("close");
  router.push(href);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (results.value.length > 0) {
      activeIndex.value = (activeIndex.value + 1) % results.value.length;
    }
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (results.value.length > 0) {
      activeIndex.value =
        (activeIndex.value - 1 + results.value.length) % results.value.length;
    }
    return;
  }
  if (e.key === "Enter") {
    const selected = results.value[safeIndex.value];
    if (selected) {
      e.preventDefault();
      openEntry(selected.href);
    }
    return;
  }
  if (e.key === "Tab" && dialogRef.value) {
    const focusables = dialogRef.value.querySelectorAll<HTMLElement>(
      "input, button, a[href]",
    );
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
</script>

<template>
  <div
    v-if="open"
    role="dialog"
    aria-modal="true"
    aria-label="Search topics and glossary"
    class="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-16"
    @click.self="emit('close')"
    @keydown="handleKeyDown"
  >
    <div
      ref="dialogRef"
      class="w-full max-w-lg overflow-hidden rounded-[16px] border border-[var(--color-hairline)] bg-[var(--color-card)]"
    >
      <div class="flex items-center gap-2 border-b border-[var(--color-hairline)] px-4 py-3">
        <Search
          :size="18"
          :stroke-width="1.5"
          class="shrink-0 text-[var(--color-muted)]"
        />
        <input
          ref="inputRef"
          v-model="query"
          type="search"
          placeholder="Search protocols or terms"
          aria-label="Search protocols or terms"
          class="w-full bg-transparent text-[15px] text-[var(--color-primary)] placeholder:text-[var(--color-muted)] focus:outline-none"
          @input="activeIndex = 0"
        >
        <button
          type="button"
          aria-label="Close search"
          class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-[var(--color-secondary)] hover:bg-[var(--color-raised)]"
          @click="emit('close')"
        >
          <X :size="16" :stroke-width="1.5" />
        </button>
      </div>

      <div class="max-h-80 overflow-y-auto p-2">
        <p
          v-if="results.length === 0"
          class="px-3 py-6 text-center text-sm text-[var(--color-secondary)]"
        >
          No topic matches “{{ query }}”. Try a protocol name like DNS or TCP.
        </p>
        <ul v-else role="listbox" class="space-y-1">
          <li
            v-for="(entry, idx) in results"
            :key="`${entry.kind}-${entry.id}`"
          >
            <button
              type="button"
              role="option"
              :aria-selected="idx === safeIndex"
              :class="`flex w-full cursor-pointer items-start justify-between gap-3 rounded-[8px] px-3 py-2 text-start transition-colors duration-150 ${
                idx === safeIndex
                  ? 'bg-[var(--color-raised)]'
                  : 'hover:bg-[var(--color-raised)]/60'
              }`"
              @click="openEntry(entry.href)"
              @mouseenter="activeIndex = idx"
            >
              <div class="min-w-0">
                <div class="text-[14px] font-medium text-[var(--color-primary)]">
                  {{ entry.title }}
                </div>
                <div class="truncate text-[12px] text-[var(--color-secondary)]">
                  {{ entry.subtitle }}
                </div>
              </div>
              <span class="shrink-0 rounded-[4px] border border-[var(--color-hairline)] px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">
                {{ entry.kind === "topic" ? "Topic" : "Glossary" }}
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
