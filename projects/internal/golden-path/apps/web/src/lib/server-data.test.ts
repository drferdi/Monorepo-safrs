import { describe, expect, it, vi } from "vitest";

vi.mock("@safrs/api", () => ({
  app: {
    request: vi.fn().mockRejectedValue(new Error("offline")),
  },
}));

vi.mock("@safrs/database", () => ({
  database: {
    $queryRawUnsafe: vi.fn().mockRejectedValue(new Error("offline")),
  },
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import { cacheTag } from "next/cache";
import { getReadiness, readApiStatus } from "./server-data.js";

describe("getReadiness", () => {
  it("menandai cache readiness API dengan tag stabil", async () => {
    await readApiStatus();

    expect(cacheTag).toHaveBeenCalledWith("safrs:readiness:api");
  });

  it("mengembalikan panduan pemulihan ketika API dan database tidak tersedia", async () => {
    await expect(getReadiness()).resolves.toEqual({
      api: {
        detail:
          "API belum dapat diperiksa. Jalankan pnpm setup lalu muat ulang.",
        state: "attention",
      },
      database: {
        detail:
          "Database belum siap. Jalankan pnpm setup lalu muat ulang halaman ini.",
        state: "attention",
      },
    });
  });
});
