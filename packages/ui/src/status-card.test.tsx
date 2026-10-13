import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusCard } from "./status-card.js";

describe("StatusCard", () => {
  it("menyampaikan status siap secara terbaca", () => {
    const markup = renderToStaticMarkup(
      createElement(StatusCard, {
        detail: "Endpoint Hono merespons.",
        label: "API bertipe",
        state: "ready",
      }),
    );

    expect(markup).toContain("API bertipe");
    expect(markup).toContain("Siap");
    expect(markup).toContain("Endpoint Hono merespons.");
  });

  it("menyampaikan status perlu perhatian dan menandai state-nya", () => {
    const markup = renderToStaticMarkup(
      createElement(StatusCard, {
        detail: "Database belum terhubung.",
        label: "Database",
        state: "attention",
      }),
    );

    expect(markup).toContain('data-state="attention"');
    expect(markup).toContain("Perlu perhatian");
    expect(markup).not.toContain("Siap");
    expect(markup).toContain("Database belum terhubung.");
  });
});
