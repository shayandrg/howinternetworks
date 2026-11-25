<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Moon, Sun } from "lucide-vue-next";

type Theme = "light" | "dark";

const theme = ref<Theme>("light");
const mounted = ref(false);

onMounted(() => {
  theme.value =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  mounted.value = true;
});

function toggle() {
  const next: Theme = theme.value === "dark" ? "light" : "dark";
  theme.value = next;
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // ignore storage errors
  }
}
</script>

<template>
  <button
    type="button"
    :aria-label="
      mounted
        ? theme === 'dark'
          ? 'Switch to light theme'
          : 'Switch to dark theme'
        : 'Toggle theme'
    "
    class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-secondary)] transition-colors duration-150 hover:bg-[var(--color-raised)] hover:text-[var(--color-primary)]"
    @click="toggle"
  >
    <Sun v-if="mounted && theme === 'dark'" :size="18" :stroke-width="1.5" />
    <Moon v-else :size="18" :stroke-width="1.5" />
  </button>
</template>
