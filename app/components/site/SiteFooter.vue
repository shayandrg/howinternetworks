<script setup lang="ts">
import { siteConfig } from "@/site.config";
</script>

<template>
  <footer class="mt-16 border-t border-[var(--color-hairline)] bg-[var(--color-card)]">
    <div class="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-6 text-[13px] text-[var(--color-secondary)] sm:flex-row sm:items-center sm:justify-between">
      <p>
        Code under MIT. Content under CC BY-SA 4.0. Inspired by Protocol
        Explorer by Dilum Sanjaya.
      </p>
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/about/"
          class="underline-offset-4 hover:text-[var(--color-primary)] hover:underline"
        >
          About
        </NuxtLink>
        <a
          :href="siteConfig.repo"
          target="_blank"
          rel="noopener noreferrer"
          class="underline-offset-4 hover:text-[var(--color-primary)] hover:underline"
        >
          GitHub
        </a>
      </div>
    </div>
  </footer>
</template>
