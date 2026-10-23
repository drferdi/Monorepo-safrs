// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { AuthFrame, AccessNotice } from "../../src/components/auth/auth-frame";

afterEach(cleanup);
describe("redesigned access presentation", () => {
  it("separates the product introduction from the actual admission surface", () => {
    render(<AuthFrame title="Masuk ke workspace"><p>Gunakan email yang sudah diundang.</p></AuthFrame>);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    const admission = screen.getByRole("region", { name: "Masuk ke workspace" });
    expect(within(admission).getByRole("heading", { level: 2, name: "Masuk ke workspace" })).toBeTruthy();
    expect(within(admission).getByText("Gunakan email yang sudah diundang.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Kembali ke website/i }).getAttribute("href")).toBe("https://sentrapedia.vercel.app/");
  });
  it("presents missing configuration honestly instead of inventing a usable login form", () => {
    render(<AccessNotice unavailable/>);
    expect(screen.getByRole("status").textContent).toContain("Konfigurasi atau layanan identitas belum tersedia");
    expect(screen.getByRole("heading", { name: "Layanan akses belum tersedia" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    const nav = screen.getByRole("navigation", { name: "Akses beta" });
    expect(within(nav).getByRole("link", { name: "Ajukan akses" }).getAttribute("href")).toBe("/apply");
    expect(within(nav).getByRole("link", { name: "Masuk" }).getAttribute("href")).toBe("/sign-in");
  });
  it("retains an explicit denied state and never renders workspace records", () => {
    const { container } = render(<AccessNotice/>);
    expect(screen.getByRole("heading", { name: "Akses belum diizinkan" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("dinonaktifkan");
    expect(container.querySelector(".app-shell")).toBeNull();
  });
});
