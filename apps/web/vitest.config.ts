import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        ".astro/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 30,
        branches: 30,
      },
    },
  },
});
