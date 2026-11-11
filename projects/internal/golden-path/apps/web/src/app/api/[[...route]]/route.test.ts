import { describe, expect, it } from "vitest";
import { GET } from "./route.js";

describe("Hono Next adapter", () => {
  it("meneruskan health check ke aplikasi Hono", async () => {
    const response = await GET(new Request("http://localhost:3000/api/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
