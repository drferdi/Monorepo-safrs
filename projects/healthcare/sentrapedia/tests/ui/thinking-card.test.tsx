// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ThinkingCard } from "../../src/components/thinking-card";

afterEach(cleanup);

describe("ThinkingCard", () => {
  it("shows only the two honest steps inside a live region that wraps the list", () => {
    render(<ThinkingCard onCancel={vi.fn()} startedAt={performance.now()}/>);
    const status = screen.getByRole("status");
    expect(status.tagName).toBe("DIV");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(within(status).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Permintaan diterima", expect.stringMatching(/^Menunggu jawaban AADI · \d+ dtk$/)]);
    expect(screen.queryByText(/pedoman klinis ditelusuri/)).toBeNull();
  });
  it("counts the seconds since the request was sent", () => {
    render(<ThinkingCard onCancel={vi.fn()} startedAt={performance.now() - 7_200}/>);
    expect(screen.getByText(/Menunggu jawaban AADI · 7 dtk/)).toBeTruthy();
  });
});
