import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReadinessDesk } from "./page.js";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("ReadinessDesk", () => {
  it("menjelaskan monorepo siap serta menyediakan status dan formulir yang dapat diakses", () => {
    const markup = renderToStaticMarkup(
      createElement(ReadinessDesk, {
        demos: [],
        readiness: {
          api: { detail: "Endpoint Hono merespons.", state: "ready" },
          database: { detail: "PostgreSQL dapat dijangkau.", state: "ready" },
        },
      }),
    );

    expect(markup).toContain("Monorepo siap untuk alur SAFRS");
    expect(markup).toContain("Database");
    expect(markup).toContain("API bertipe");
    expect(markup).toContain('label for="demo-name"');
    expect(markup).toContain('aria-label="Nama contoh"');
    expect(markup).toContain("Simpan contoh");
  });

  it("menandai langkah akhir perlu perhatian ketika dependensi belum siap", () => {
    const markup = renderToStaticMarkup(
      createElement(ReadinessDesk, {
        demos: [],
        readiness: {
          api: {
            detail: "API belum dapat diperiksa.",
            state: "attention",
          },
          database: {
            detail: "PostgreSQL dapat dijangkau.",
            state: "ready",
          },
        },
      }),
    );

    expect(markup).toContain(
      '<li aria-label="Status akhir: Perlu perhatian" class="flow-step flow-step--attention"><span>04</span><strong>Perlu perhatian</strong>',
    );
    expect(markup).toContain("Periksa kesiapan alur SAFRS");
    expect(markup).not.toContain("Monorepo siap untuk alur SAFRS");
  });

  it("menampilkan contoh tersimpan dari database", () => {
    const markup = renderToStaticMarkup(
      createElement(ReadinessDesk, {
        demos: [
          {
            createdAt: "2026-01-01T00:00:00.000Z",
            id: "00000000-0000-4000-8000-000000000001",
            name: "Sentra Demo",
          },
        ],
        readiness: {
          api: { detail: "Endpoint Hono merespons.", state: "ready" },
          database: { detail: "PostgreSQL dapat dijangkau.", state: "ready" },
        },
      }),
    );

    expect(markup).toContain('aria-label="Contoh tersimpan"');
    expect(markup).toContain("Sentra Demo");
  });
});
