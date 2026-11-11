import type { InferRequestType, InferResponseType } from "hono/client";
import { describe, expect, expectTypeOf, it } from "vitest";
import { app, createApp } from "./app.js";
import { createApiClient } from "./client.js";
import type { ApiError } from "./error.js";

describe("Hono API", () => {
  it("returns typed health state", async () => {
    const response = await app.request("/api/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("lists demos with ISO timestamps", async () => {
    const api = createApp({
      getStore: async () => ({
        demo: {
          create: async () => {
            throw new Error("not used");
          },
          findMany: async () => [
            {
              createdAt: new Date("2026-08-10T00:00:00.000Z"),
              id: "5c2d5001-3f71-4c61-bef8-e8f55cc20cea",
              name: "Atlas",
            },
          ],
        },
      }),
    });

    const response = await api.request("/api/demos");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        createdAt: "2026-08-10T00:00:00.000Z",
        id: "5c2d5001-3f71-4c61-bef8-e8f55cc20cea",
        name: "Atlas",
      },
    ]);
  });

  it("creates a demo", async () => {
    const api = createApp({
      getStore: async () => ({
        demo: {
          create: async ({ data }) => ({
            createdAt: new Date("2026-08-10T00:00:00.000Z"),
            id: "5c2d5001-3f71-4c61-bef8-e8f55cc20cea",
            name: data.name,
          }),
          findMany: async () => [],
        },
      }),
    });

    const response = await api.request("/api/demos", {
      body: JSON.stringify({ name: " Atlas " }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      createdAt: "2026-08-10T00:00:00.000Z",
      id: "5c2d5001-3f71-4c61-bef8-e8f55cc20cea",
      name: "Atlas",
    });
  });

  it("returns a standard validation error", async () => {
    const response = await app.request("/api/demos", {
      body: JSON.stringify({ name: "" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: { name: expect.any(Array) },
    });
  });

  it("redacts unexpected errors", async () => {
    const api = createApp({
      getStore: async () => {
        throw new Error("DATABASE_URL=postgres://secret.example/internal");
      },
    });

    const response = await api.request("/api/demos");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ code: "INTERNAL_ERROR" });
    expect(JSON.stringify(body)).not.toContain("secret.example");
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
  });

  it("returns the thrown-error correlation ID in its response header", async () => {
    const api = createApp({
      getStore: async () => {
        throw new Error("unexpected persistence failure");
      },
    });

    const response = await api.request("/api/demos");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("x-correlation-id")).toBe(body.correlationId);
  });

  it("includes a correlation ID in error responses and headers", async () => {
    const response = await app.request("/api/demos", {
      body: JSON.stringify({ name: "" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = await response.json();

    expect(response.headers.get("x-correlation-id")).toBe(body.correlationId);
    expect(body.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("preserves typed RPC input and output", () => {
    const client = createApiClient("http://localhost:3000");

    expectTypeOf<
      InferRequestType<typeof client.api.demos.$post>
    >().toEqualTypeOf<{
      json: { name: string };
    }>();
    expectTypeOf<
      InferResponseType<typeof client.api.demos.$post, 201>
    >().toEqualTypeOf<{
      createdAt: string;
      id: string;
      name: string;
    }>();
    expectTypeOf<
      InferResponseType<typeof client.api.demos.$get, 500>
    >().toEqualTypeOf<ApiError>();
    expectTypeOf<
      InferResponseType<typeof client.api.demos.$get, 200>
    >().toEqualTypeOf<
      Array<{
        createdAt: string;
        id: string;
        name: string;
      }>
    >();
    expectTypeOf<
      InferResponseType<typeof client.api.demos.$post, 400>
    >().toEqualTypeOf<ApiError>();
    expectTypeOf<
      InferResponseType<typeof client.api.demos.$post, 500>
    >().toEqualTypeOf<ApiError>();
    expectTypeOf<
      InferResponseType<typeof client.api.health.$get, 200>
    >().toEqualTypeOf<{
      status: "ok";
    }>();
    expectTypeOf<
      InferResponseType<typeof client.api.health.$get, 500>
    >().toEqualTypeOf<ApiError>();
  });
});
