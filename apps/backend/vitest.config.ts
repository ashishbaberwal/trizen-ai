import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Suites share one remote Postgres; run them sequentially to avoid
    // concurrent seeding of the same workspace rows.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
