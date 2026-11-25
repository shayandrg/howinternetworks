import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt({
  features: {
    stylistic: false,
  },
}).append({
  ignores: [
    ".nuxt/**",
    ".output/**",
    "dist/**",
    "playwright-report/**",
    "test-results/**",
  ],
  rules: {
    "vue/no-v-html": "off",
  },
});
