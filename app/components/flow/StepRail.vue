<script setup lang="ts">
import { ref } from "vue";
import { Check, ChevronDown, List, X } from "lucide-vue-next";
import type { Step } from "@/engine/types";

defineProps<{
  steps: Step[];
  stepIndex: number;
  finished: boolean;
}>();

const emit = defineEmits<{
  selectStep: [index: number];
}>();

const sheetOpen = ref(false);

function onSelectChange(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value);
  emit("selectStep", value);
}
</script>

<template>
  <!-- Desktop rail (>= 1100px) -->
  <nav
    aria-label="Steps"
    class="hidden w-[240px] shrink-0 desktop:block"
  >
    <ol class="space-y-1">
      <li v-for="(step, idx) in steps" :key="step.id">
        <button
          type="button"
          :aria-current="idx === stepIndex ? 'step' : undefined"
          :class="`flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2 text-start text-[14px] leading-5 transition-colors duration-150 ${
            idx === stepIndex
              ? 'bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
              : 'text-[var(--color-secondary)] hover:bg-[var(--color-raised)]/60 hover:text-[var(--color-primary)]'
          }`"
          @click="emit('selectStep', idx)"
        >
          <span
            :class="`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] tabular-nums ${
              idx === stepIndex
                ? 'bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)]'
                : idx < stepIndex || finished
                  ? 'bg-[var(--color-positive)]/15 text-[var(--color-positive)]'
                  : 'border border-[var(--color-hairline)] text-[var(--color-muted)]'
            }`"
          >
            <Check
              v-if="(idx < stepIndex || finished) && idx !== stepIndex"
              :size="12"
              :stroke-width="2"
            />
            <template v-else>{{ idx + 1 }}</template>
          </span>
          <span class="truncate">{{ step.title }}</span>
        </button>
      </li>
    </ol>
  </nav>

  <!-- Tablet dropdown (768px .. 1099px) -->
  <div class="mb-3 hidden w-full md:block desktop:hidden">
    <label class="relative block">
      <span class="sr-only">Choose step</span>
      <select
        :value="stepIndex"
        aria-label="Choose step"
        class="h-10 w-full cursor-pointer appearance-none rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] pe-9 ps-3 text-[14px] font-medium text-[var(--color-primary)]"
        @change="onSelectChange"
      >
        <option v-for="(step, idx) in steps" :key="step.id" :value="idx">
          Step {{ idx + 1 }} of {{ steps.length }}: {{ step.title }}
        </option>
      </select>
      <ChevronDown
        :size="16"
        :stroke-width="1.5"
        class="pointer-events-none absolute end-3 top-3 text-[var(--color-secondary)]"
      />
    </label>
  </div>

  <!-- Mobile bottom sheet trigger (< 768px) -->
  <div class="mb-2 md:hidden">
    <button
      type="button"
      class="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-3 text-[14px] font-medium text-[var(--color-primary)]"
      @click="sheetOpen = true"
    >
      <span class="flex items-center gap-2 truncate">
        <List :size="16" :stroke-width="1.5" />
        <span class="truncate">
          Step {{ stepIndex + 1 }} of {{ steps.length }}: {{ steps[stepIndex]?.title }}
        </span>
      </span>
      <ChevronDown :size="16" :stroke-width="1.5" />
    </button>
  </div>

  <div
    v-if="sheetOpen"
    role="dialog"
    aria-modal="true"
    aria-label="All steps"
    class="fixed inset-0 z-50 flex items-end bg-black/45 md:hidden"
    @click.self="sheetOpen = false"
  >
    <div class="w-full rounded-t-[16px] border-t border-[var(--color-hairline)] bg-[var(--color-card)] p-4">
      <div class="mb-3 flex items-center justify-between">
        <span class="text-[15px] font-medium text-[var(--color-primary)]">
          Steps
        </span>
        <button
          type="button"
          aria-label="Close steps"
          class="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[8px] text-[var(--color-secondary)]"
          @click="sheetOpen = false"
        >
          <X :size="18" :stroke-width="1.5" />
        </button>
      </div>
      <ol class="max-h-[60vh] space-y-1 overflow-y-auto">
        <li v-for="(step, idx) in steps" :key="step.id">
          <button
            type="button"
            :class="`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-[8px] px-3 text-start text-[14px] ${
              idx === stepIndex
                ? 'bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
                : 'text-[var(--color-secondary)]'
            }`"
            @click="
              emit('selectStep', idx);
              sheetOpen = false;
            "
          >
            <span class="font-mono text-[12px] tabular-nums text-[var(--color-muted)]">
              {{ idx + 1 }}
            </span>
            <span>{{ step.title }}</span>
          </button>
        </li>
      </ol>
    </div>
  </div>
</template>
