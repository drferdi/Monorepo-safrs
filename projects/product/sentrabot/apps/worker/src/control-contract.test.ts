import { describe, expect, it } from "vitest";
import {
  hasValidWorkerToken,
  workerControlRequestSchema,
} from "./control-contract.js";

describe("worker control contract", () => {
  it("accepts an identity-bound computer request", () => {
    expect(
      workerControlRequestSchema.safeParse({
        actor: { workspaceId: "ws_1", userId: "user_1", botId: "bot_1" },
        requestId: "req_1",
        operation: { operation: "status" },
      }).success,
    ).toBe(true);
  });

  it("rejects credential-shaped payloads from the contract", () => {
    expect(
      workerControlRequestSchema.safeParse({
        actor: { workspaceId: "ws_1", userId: "user_1", botId: "bot_1" },
        requestId: "req_1",
        operation: { operation: "status" },
        providerApiKey: "secret",
      }).success,
    ).toBe(false);
  });

  it("requires an exact bearer token", () => {
    const request = new Request("http://localhost/control", {
      headers: { authorization: "Bearer internal-token" },
    });

    expect(hasValidWorkerToken(request, "internal-token")).toBe(true);
    expect(hasValidWorkerToken(request, "other-token")).toBe(false);
  });
});
