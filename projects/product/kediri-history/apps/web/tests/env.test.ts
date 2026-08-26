import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { clientEnvSchema, serverEnvSchema } from "../src/env.schema";

/**
 * Kontrak environment diuji dua lapis: bentuknya pada skema, dan perilaku
 * gagal-cepatnya pada modul `env` yang sesungguhnya. Gagal cepat untuk nilai
 * kritis produksi harus dibuktikan, bukan diasumsikan.
 */
const server = z.object(serverEnvSchema);
const client = z.object(clientEnvSchema);

const VALID_SECRET = "a".repeat(32);

const validServerEnv = {
  DATABASE_URL: "postgresql://kediri:kediri@127.0.0.1:54330/kediri_history_dev",
  PAYLOAD_SECRET: VALID_SECRET,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("server environment contract", () => {
  it("accepts the minimum production-critical set", () => {
    const parsed = server.parse(validServerEnv);
    expect(parsed.DATABASE_URL).toContain("postgresql://");
    expect(parsed.NODE_ENV).toBe("development");
  });

  it("rejects a missing database URL", () => {
    const { DATABASE_URL: _omitted, ...withoutDatabase } = validServerEnv;
    expect(server.safeParse(withoutDatabase).success).toBe(false);
  });

  it("rejects a Payload secret that is too short to be safe", () => {
    expect(
      server.safeParse({ ...validServerEnv, PAYLOAD_SECRET: "short" }).success,
    ).toBe(false);
  });

  it("treats Phase 2 object storage as optional but validated when present", () => {
    expect(server.safeParse(validServerEnv).success).toBe(true);
    expect(
      server.safeParse({ ...validServerEnv, S3_ENDPOINT: "not-a-url" }).success,
    ).toBe(false);
    expect(
      server.safeParse({
        ...validServerEnv,
        S3_ENDPOINT: "https://storage.example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown NODE_ENV rather than guessing", () => {
    expect(
      server.safeParse({ ...validServerEnv, NODE_ENV: "staging" }).success,
    ).toBe(false);
  });
});

describe("client environment contract", () => {
  it("requires an absolute public site URL", () => {
    expect(
      client.safeParse({ NEXT_PUBLIC_SITE_URL: "https://kediri.go.id" })
        .success,
    ).toBe(true);
    expect(client.safeParse({ NEXT_PUBLIC_SITE_URL: "/" }).success).toBe(false);
  });

  it("never exposes a server secret to the client", () => {
    // Rahasia yang bocor ke bundel klien adalah kegagalan rilis. Kontraknya
    // dijaga di sini dan diperiksa lagi pada artefak build oleh
    // scripts/deploy-dry-run.mjs.
    for (const name of Object.keys(clientEnvSchema)) {
      expect(name.startsWith("NEXT_PUBLIC_")).toBe(true);
    }
    for (const name of Object.keys(serverEnvSchema)) {
      expect(name.startsWith("NEXT_PUBLIC_")).toBe(false);
    }
  });
});

describe("environment fail-fast behaviour", () => {
  function stubValidEnvironment() {
    vi.stubEnv("DATABASE_URL", validServerEnv.DATABASE_URL);
    vi.stubEnv("PAYLOAD_SECRET", validServerEnv.PAYLOAD_SECRET);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:4320");
  }

  it("loads when every production-critical value is present", async () => {
    stubValidEnvironment();
    vi.resetModules();
    const loaded = await import("../src/env");
    expect(loaded.env.DATABASE_URL).toBe(validServerEnv.DATABASE_URL);
  });

  it("refuses to load when a production-critical value is missing", async () => {
    stubValidEnvironment();
    vi.stubEnv("PAYLOAD_SECRET", "");
    vi.resetModules();
    // Diamnya bukan pilihan: proses harus berhenti di sini, bukan melayani
    // permintaan dengan rahasia yang tidak ada.
    await expect(import("../src/env")).rejects.toThrow();
  });

  it("only skips validation through an explicit, recorded opt-out", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("PAYLOAD_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");
    vi.resetModules();
    await expect(import("../src/env")).resolves.toBeDefined();
  });
});
