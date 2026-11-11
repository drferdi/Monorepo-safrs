import { createApp } from "@safrs/api";
import type { ApiClient } from "@safrs/api/client";
import { createApiClient } from "@safrs/api/client";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

vi.mock("@safrs/database", () => {
  throw new Error("Database must not enter the browser client bundle.");
});

import {
  createBrowserApiClient,
  getBrowserApiBaseUrl,
  submitDemo,
} from "./api-client.js";

type CreateDemoRequest = (
  name: string,
) => ReturnType<ApiClient["api"]["demos"]["$post"]>;

expectTypeOf<
  Parameters<typeof submitDemo>[0]
>().toEqualTypeOf<CreateDemoRequest>();

function createDemoApp({ failsToSave = false } = {}) {
  return createApp({
    getStore: async () => ({
      demo: {
        create: async ({ data }) => {
          if (failsToSave) {
            throw new Error("Database tidak tersedia.");
          }

          return {
            createdAt: new Date("2026-08-10T00:00:00.000Z"),
            id: "5df8e0c3-d0e3-450c-b717-532838596e55",
            name: data.name,
          };
        },
        findMany: async () => [],
      },
    }),
  });
}

function createDemoClient({ failsToSave = false } = {}) {
  const app = createDemoApp({ failsToSave });

  return createApiClient("http://api.test", {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      app.request(input instanceof Request ? input : String(input), init),
  });
}

describe("submitDemo", () => {
  it("mengembalikan nama contoh dari respons API berhasil", async () => {
    const client = createDemoClient();
    const result = await submitDemo(
      (name) => client.api.demos.$post({ json: { name } }),
      "Atlas",
    );

    expect(result).toEqual({ name: "Atlas", status: "success" });
  });

  it("menampilkan pesan validasi dari respons 400", async () => {
    const client = createDemoClient();
    const result = await submitDemo(
      (name) => client.api.demos.$post({ json: { name } }),
      "",
    );

    expect(result).toEqual({
      message: "Permintaan tidak valid.",
      status: "error",
    });
  });

  it("menampilkan pesan API saat respons 500", async () => {
    const client = createDemoClient({ failsToSave: true });
    const result = await submitDemo(
      (name) => client.api.demos.$post({ json: { name } }),
      "Atlas",
    );

    expect(result).toEqual({
      message: "Terjadi kesalahan internal.",
      status: "error",
    });
  });

  it("memastikan basis URL API browser adalah origin satu asal", () => {
    expect(getBrowserApiBaseUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });

  it("mengirim submitDemo browser ke rute API satu origin", async () => {
    const app = createDemoApp();
    let requestedUrl = "";

    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requestedUrl = input instanceof Request ? input.url : String(input);
        return app.request(
          input instanceof Request ? input : String(input),
          init,
        );
      },
    );

    try {
      const client = createBrowserApiClient("http://web.test");
      await expect(
        submitDemo(
          (name) => client.api.demos.$post({ json: { name } }),
          "Atlas",
        ),
      ).resolves.toEqual({ name: "Atlas", status: "success" });
      expect(requestedUrl).toBe("http://web.test/api/demos");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("memuat klien browser tanpa memuat database server", () => {
    expect(getBrowserApiBaseUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
  });
});
