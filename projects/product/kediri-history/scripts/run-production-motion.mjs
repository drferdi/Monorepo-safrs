import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://kediri:kediri@127.0.0.1:54330/kediri_history_motion",
  PAYLOAD_SECRET: "production-motion-local-not-a-secret-0001",
  NEXT_PUBLIC_SITE_URL: "https://kediri.sentrahai.com",
};

for (const args of [
  ["scripts/pnpm.mjs", "--filter", "@kediri/web", "build"],
  ["scripts/check-production-journey.mjs"],
  ["scripts/pnpm.mjs", "--filter", "@kediri/web", "e2e:production:built"],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
