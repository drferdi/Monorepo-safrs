import { configDefaults, defineConfig } from "vitest/config";

// The site has its own node --test suite, and .runtime holds backups with stale copies of the tests.
export default defineConfig({ test: { exclude: [...configDefaults.exclude, ".runtime/**", "apps/site/**"] } });
