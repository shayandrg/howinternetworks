<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { shouldIgnoreKeyEvent } from "@/lib/keyboard";
import SearchDialog from "~/components/site/SearchDialog.vue";
import SiteFooter from "~/components/site/SiteFooter.vue";
import SiteHeader from "~/components/site/SiteHeader.vue";

const searchOpen = ref(false);
const headerRef = ref<InstanceType<typeof SiteHeader> | null>(null);

let onKeyDown: ((e: KeyboardEvent) => void) | null = null;

onMounted(() => {
  onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchOpen.value = !searchOpen.value;
      return;
    }
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (shouldIgnoreKeyEvent(e.target)) return;
      e.preventDefault();
      searchOpen.value = true;
    }
  };
  window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
  if (onKeyDown) {
    window.removeEventListener("keydown", onKeyDown);
  }
});

function handleClose() {
  searchOpen.value = false;
  requestAnimationFrame(() => headerRef.value?.focusSearchButton());
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <SiteHeader ref="headerRef" @open-search="searchOpen = true" />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
    <SearchDialog :open="searchOpen" @close="handleClose" />
  </div>
</template>
