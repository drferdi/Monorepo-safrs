import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { telemetryMiddleware } from "./hono-middleware.js";

describe("telemetryMiddleware", () => {
  it("passes the request through and records the status", async () => {
    const app = new Hono<{ Variables: { correlationId: string } }>()
      .use("*", async (c, next) => {
        c.set("correlationId", "corr-123");
        await next();
      })
      .use("*", telemetryMiddleware())
      .get("/health", (c) => c.text("ok"));

    const response = await app.request("/health");
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("ok");
  });

  it("works without a prior correlation id variable", async () => {
    const app = new Hono()
      .use("*", telemetryMiddleware())
      .get("/health", (c) => c.json({ status: "ok" }));

    const response = await app.request("/health");
    expect(response.status).toBe(200);
  });

  it("records the status code on error spans", async () => {
    const app = new Hono()
      .use("*", telemetryMiddleware())
      .get("/boom", () => {
        throw new Error("boom");
      })
      .onError((_, c) => c.json({ error: "x" }, 500));

    const response = await app.request("/boom");
    expect(response.status).toBe(500);
  });
});
