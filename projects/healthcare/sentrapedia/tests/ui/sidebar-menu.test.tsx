// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AccountMenu } from "../../src/components/account-menu";
import { Sidebar } from "../../src/components/sidebar";
import { initialWorkspace } from "../../src/lib/workspace";

afterEach(cleanup);
const noop = () => undefined;

describe("sidebar order", () => {
  it("lists Glass's six entries in order and no group titles", () => {
    render(<Sidebar state={initialWorkspace} open mobile={false} onToggle={noop} onDialog={noop} onNew={noop} onSelect={noop} onToast={noop}/>);
    const labels = within(screen.getByRole("navigation", { name: "Navigasi utama" })).getAllByRole("button").map(b => b.textContent?.replace(/⌘.*$/, "").trim());
    expect(labels).toEqual(["Baru", "Buat Pasien", "Buat Daftar Pasien", "Mulai Scribe", "Pengaturan Agent", "Cari"]);
    expect(screen.queryByText("Alat kerja")).toBeNull();
  });
  it("opens the scribe and settings dialogs from the nav", () => {
    const onDialog = vi.fn();
    render(<Sidebar state={initialWorkspace} open mobile={false} onToggle={noop} onDialog={onDialog} onNew={noop} onSelect={noop} onToast={noop}/>);
    fireEvent.click(screen.getByRole("button", { name: "Mulai Scribe" }));
    fireEvent.click(screen.getByRole("button", { name: "Pengaturan Agent" }));
    expect(onDialog.mock.calls).toEqual([["scribe"], ["settings"]]);
  });
});

describe("account menu", () => {
  it("opens with settings, queue, references, about and sign out", () => {
    const onOpen = vi.fn(), onSignOut = vi.fn();
    render(<AccountMenu name="dr. Rani" plan="Lite" onOpen={onOpen} onSignOut={onSignOut}/>);
    fireEvent.click(screen.getByRole("button", { name: /dr\. Rani/ }));
    expect(screen.getAllByRole("menuitem").map(i => i.textContent)).toEqual(["Pengaturan Agent", "Antrean kerja", "Referensi", "Tentang workspace", "Keluar"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Antrean kerja" }));
    expect(onOpen).toHaveBeenCalledWith("queue");
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("omits Keluar without a sign-out handler, shows usage when given, and hosts its children", () => {
    render(<AccountMenu name="dr. Rani" plan="Lite" usage={{ stepsToday: 3, budgetUsd: 2 }} onOpen={noop}><span data-testid="slot"/></AccountMenu>);
    fireEvent.click(screen.getByRole("button", { name: /dr\. Rani/ }));
    expect(screen.queryByRole("menuitem", { name: "Keluar" })).toBeNull();
    expect(screen.getByRole("menu").textContent).toContain("3 langkah");
    expect(screen.getByTestId("slot")).toBeTruthy();
  });
  it("closes on Escape and outside click, returning focus to the trigger", () => {
    render(<><button>luar</button><AccountMenu name="dr. Rani" plan="Lite" onOpen={noop}/></>);
    const trigger = screen.getByRole("button", { name: /dr\. Rani/ });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "luar" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
