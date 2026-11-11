// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { AuthFrame, AccessNotice } from "../../src/components/auth/auth-frame";

afterEach(cleanup);
describe("admission presentation", () => {
  it("puts the form on the page with nothing between the doctor and it", () => {
    const { container } = render(<AuthFrame title="Masuk ke workspace" alternative={{ href: "/sign-up", prompt: "Belum punya akun?", label: "Daftar" }}><p>Gunakan email yang sudah diundang.</p></AuthFrame>);
    const admission = screen.getByRole("region", { name: "Masuk ke workspace" });
    expect(within(admission).getByRole("heading", { level: 1, name: "Masuk ke workspace" })).toBeTruthy();
    expect(within(admission).getByText("Gunakan email yang sudah diundang.")).toBeTruthy();
    expect(within(admission).getByRole("link", { name: "Daftar" }).getAttribute("href")).toBe("/sign-up");
    // One heading, so the page states its purpose once.
    expect(container.querySelectorAll("h1, h2, h3")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Kembali ke website/i }).getAttribute("href")).toBe("https://sentrapedia.vercel.app/");
  });
  it("sets the decorative cabinet after the form, hidden from assistive technology", () => {
    const { container } = render(<AuthFrame title="Masuk ke workspace"><p>Isi formulir.</p></AuthFrame>);
    const card = container.querySelector(".auth-card")!;
    const figure = container.querySelector("figure.auth-figure")!;
    expect(figure.getAttribute("aria-hidden")).toBe("true");
    expect(card.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(figure.querySelector("a, button, input, [tabindex]")).toBeNull();
    expect(container.querySelectorAll("[role='region']")).toHaveLength(0);
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });
  it("offers no way onward when there is none to offer", () => {
    render(<AuthFrame title="Masuk ke workspace"><p>Gunakan email yang sudah diundang.</p></AuthFrame>);
    expect(screen.queryByRole("link", { name: "Daftar" })).toBeNull();
  });
  it("presents missing configuration honestly instead of inventing a usable login form", () => {
    render(<AccessNotice unavailable/>);
    expect(screen.getByRole("status").textContent).toContain("Konfigurasi atau layanan identitas belum tersedia");
    expect(screen.getByRole("heading", { name: "Layanan akses belum tersedia" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("retains an explicit denied state and never renders workspace records", () => {
    const { container } = render(<AccessNotice/>);
    expect(screen.getByRole("heading", { name: "Akses belum diizinkan" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("dinonaktifkan");
    expect(container.querySelector(".app-shell")).toBeNull();
  });
});
