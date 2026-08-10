import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/contracts/**/*.test.ts", "tests/integration/**/*.test.ts"],
    name: "repository-contracts",
  },
});
