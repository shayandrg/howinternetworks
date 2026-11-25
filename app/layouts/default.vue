<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { shouldIgnoreKeyEvent } from "@/lib/keyboard";
import SearchDialog from "~/components/site/SearchDialog.vue";
import SiteFooter from "~/components/site/SiteFooter.vue";
import SiteHeader from "~/components/site/SiteHeader.vue";
import TopicsSidebar from "~/components/site/TopicsSidebar.vue";

const searchOpen = ref(false);
const mobileSidebarOpen = ref(false);
const desktopSidebarCollapsed = ref(false);
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

function handleToggleSidebar() {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) {
    desktopSidebarCollapsed.value = !desktopSidebarCollapsed.value;
  } else {
    mobileSidebarOpen.value = !mobileSidebarOpen.value;
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <SiteHeader
      ref="headerRef"
      :sidebar-open="!desktopSidebarCollapsed || mobileSidebarOpen"
      @open-search="searchOpen = true"
      @toggle-sidebar="handleToggleSidebar"
    />
    <div class="flex flex-1">
      <TopicsSidebar
        :open-mobile="mobileSidebarOpen"
        :collapsed-desktop="desktopSidebarCollapsed"
        @close-mobile="mobileSidebarOpen = false"
      />
      <div class="flex min-w-0 flex-1 flex-col">
        <main class="flex-1">
          <slot />
        </main>
        <SiteFooter />
      </div>
    </div>
    <SearchDialog :open="searchOpen" @close="handleClose" />
  </div>
</template>
