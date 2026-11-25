<script setup lang="ts">
import { ref } from "vue";
import { Check, Copy } from "lucide-vue-next";
import type { TryIt as TryItSpec } from "@/content/schema";

defineProps<{
  items?: TryItSpec[];
}>();

const OS_KEYS = ["windows", "macos", "linux"] as const;
const OS_LABELS: Record<(typeof OS_KEYS)[number], string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

const os = ref<(typeof OS_KEYS)[number]>("windows");
const copiedCmd = ref<string | null>(null);

function copyCmd(cmd: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(cmd).catch(() => {});
  }
  copiedCmd.value = cmd;
  setTimeout(() => {
    copiedCmd.value = null;
  }, 1500);
}

function commandFor(item: TryItSpec) {
  return item.commands.find((c) => c.os === os.value) ?? item.commands[0];
}
</script>

<template>
  <section
    v-if="items && items.length > 0"
    aria-labelledby="try-it-heading"
    class="space-y-3"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2
        id="try-it-heading"
        class="text-[18px] font-medium text-[var(--color-primary)]"
      >
        Try it yourself
      </h2>
      <div
        role="group"
        aria-label="Operating system"
        class="inline-flex rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-0.5"
      >
        <button
          v-for="k in OS_KEYS"
          :key="k"
          type="button"
          :aria-pressed="os === k"
          :class="`cursor-pointer rounded-[6px] px-2.5 py-1 text-[12px] transition-colors duration-150 ${
            os === k
              ? 'bg-[var(--color-raised)] font-medium text-[var(--color-primary)]'
              : 'text-[var(--color-secondary)]'
          }`"
          @click="os = k"
        >
          {{ OS_LABELS[k] }}
        </button>
      </div>
    </div>

    <div
      v-for="item in items"
      :key="item.title"
      class="rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-card)] p-4"
    >
      <h3 class="text-[15px] font-medium text-[var(--color-primary)]">
        {{ item.title }}
      </h3>
      <p class="mt-1 text-[14px] leading-5 text-[var(--color-secondary)]">
        {{ item.explain }}
      </p>
      <div
        v-if="commandFor(item)"
        class="mt-3 flex items-center justify-between gap-2 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-raised)] px-3 py-2"
      >
        <code class="min-w-0 flex-1 overflow-x-auto font-mono text-[13px] text-[var(--color-primary)]">
          {{ commandFor(item)!.cmd }}
        </code>
        <button
          type="button"
          aria-label="Copy command"
          class="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-[var(--color-secondary)] hover:bg-[var(--color-card)] hover:text-[var(--color-primary)]"
          @click="copyCmd(commandFor(item)!.cmd)"
        >
          <Check v-if="copiedCmd === commandFor(item)!.cmd" :size="15" :stroke-width="1.5" />
          <Copy v-else :size="15" :stroke-width="1.5" />
        </button>
      </div>
    </div>
  </section>
</template>
