import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // e2e milik Playwright; menjalankannya di Vitest hanya menghasilkan
    // kegagalan palsu.
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
  },
});
