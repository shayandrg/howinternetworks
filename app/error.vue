<script setup lang="ts">
import { ref } from "vue";
import { Search } from "lucide-vue-next";
import SearchDialog from "~/components/site/SearchDialog.vue";

defineProps<{
  error?: { statusCode?: number; statusMessage?: string };
}>();

const searchOpen = ref(false);
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 class="text-[28px] font-medium text-[var(--color-primary)]">
      Page not found
    </h1>
    <p class="max-w-md text-[15px] leading-[22px] text-[var(--color-secondary)]">
      That page does not exist. Search for a protocol or return to the topic
      list.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        class="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[8px] bg-[var(--color-btn-primary-bg)] px-4 text-[14px] font-medium text-[var(--color-btn-primary-fg)]"
        @click="searchOpen = true"
      >
        <Search :size="16" :stroke-width="1.5" />
        <span>Search topics</span>
      </button>
      <NuxtLink
        to="/"
        class="inline-flex min-h-[44px] items-center rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-card)] px-4 text-[14px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-raised)]"
      >
        Go home
      </NuxtLink>
    </div>
    <SearchDialog :open="searchOpen" @close="searchOpen = false" />
  </div>
</template>
