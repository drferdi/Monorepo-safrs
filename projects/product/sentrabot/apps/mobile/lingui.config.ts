import { defineConfig } from "@lingui/conf";

// Mirrors apps/web/lingui.config.ts: English source strings, Indonesian as the
// product default, catalogs kept next to the app so Metro can bundle them.
export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "id"],
  catalogs: [
    {
      path: "<rootDir>/locales/{locale}/messages",
      include: ["app", "components", "lib"],
      exclude: ["**/*.test.*", "**/locales/**"],
    },
  ],
  format: "po",
  compileNamespace: "es",
});
