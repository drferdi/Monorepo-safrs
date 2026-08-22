import { readFile } from "node:fs/promises";

const composePath = new URL(
  "../infra/compose/docker-compose.yml",
  import.meta.url,
);
const compose = await readFile(composePath, "utf8");
for (const required of [
  "internal: true",
  "service_healthy",
  'expose: ["8787"]',
  'expose: ["8788"]',
]) {
  if (!compose.includes(required))
    throw new Error(`Compose contract missing: ${required}`);
}

const { createIdempotentExecutor } = await import(
  "../apps/worker/src/execution-contract.ts"
);
const { createFakeProviderRuntime } = await import(
  "../apps/worker/src/fake-provider.ts"
);
const execute = createIdempotentExecutor(createFakeProviderRuntime());
const input = {
  requestId: "compose-journey-1",
  workspaceId: "workspace-disposable",
  userId: "user-disposable",
  botId: "bot-disposable",
  prompt: "ping",
  provider: "fake",
  model: "fake-model",
};
const [first, second] = await Promise.all([execute(input), execute(input)]);
if (first.output !== "[fake:fake-model] ping" || second !== first) {
  throw new Error("Fake-provider idempotency journey failed");
}
console.log("fake-provider journey: passed");
