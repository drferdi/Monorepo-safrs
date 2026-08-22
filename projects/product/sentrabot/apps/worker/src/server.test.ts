import { describe, expect, it } from "vitest";
import { createWorkerControlApp } from "./index.js";

describe("worker server contract", () => {
  it("keeps health public and control authenticated", async () => {
    const app = createWorkerControlApp(() => ({
      WORKER_CONTROL_TOKEN: "token",
    }));
    const health = await app.request("http://localhost/health");
    expect(health.status).toBe(200);
    const unauthorized = await app.request(
      "http://localhost/control/computer",
      { method: "POST" },
    );
    expect(unauthorized.status).toBe(401);
  });
});
