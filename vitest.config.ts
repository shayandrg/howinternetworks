import path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "~": path.resolve(import.meta.dirname, "app"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "app/**/*.test.ts"],
  },
});
