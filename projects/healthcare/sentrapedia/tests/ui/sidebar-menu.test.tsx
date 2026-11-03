// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AccountMenu } from "../../src/components/account-menu";
import { Sidebar } from "../../src/components/sidebar";
import { initialWorkspace } from "../../src/lib/workspace";

afterEach(cleanup);
const noop = () => undefined;

describe("sidebar order", () => {
  it("lists Glass's six entries in order and no group titles", () => {
    render(<Sidebar state={initialWorkspace} open mobile={false} onToggle={noop} onDialog={noop} onNew={noop} onSelect={noop} onToast={noop}/>);
    const labels = Array.from(screen.getByRole("navigation", { name: "Navigasi utama" }).querySelectorAll(":scope > button, :scope > a")).map(b => b.textContent?.replace(/⌘.*$/, "").trim());
    expect(labels).toEqual(["Baru", "Buat Pasien", "Buat Daftar Pasien", "Mulai Scribe", "Pengaturan Agent", "Cari"]);
    expect(screen.queryByText("Alat kerja")).toBeNull();
  });
  it("opens the scribe dialog from the nav, and Pengaturan Agent is a link to the /agent page", () => {
    const onDialog = vi.fn();
    render(<Sidebar state={initialWorkspace} open mobile={false} onToggle={noop} onDialog={onDialog} onNew={noop} onSelect={noop} onToast={noop}/>);
    fireEvent.click(screen.getByRole("button", { name: "Mulai Scribe" }));
    expect(onDialog.mock.calls).toEqual([["scribe"]]);
    expect(screen.getByRole("link", { name: "Pengaturan Agent" }).getAttribute("href")).toBe("/agent");
  });
});

describe("sidebar account row", () => {
  const sidebar = (props: Partial<ComponentProps<typeof Sidebar>> = {}) => <Sidebar state={initialWorkspace} open mobile={false} onToggle={noop} onDialog={noop} onNew={noop} onSelect={noop} onToast={noop} {...props}/>;
  it("forwards sign-out and the user button into the account menu", () => {
    const onSignOut = vi.fn();
    render(sidebar({ onSignOut, userButton: <span data-testid="user-button"/> }));
    fireEvent.click(screen.getByRole("button", { name: /Sentrapedia/ }));
    expect(screen.getByTestId("user-button")).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Keluar" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
  it("names the account after the display name in settings", () => {
    render(sidebar({ state: { ...initialWorkspace, settings: { ...initialWorkspace.settings, name: "dr. Rani Putri" } } }));
    const trigger = screen.getByRole("button", { name: /dr\. Rani Putri/ });
    expect(trigger.querySelector(".avatar")?.textContent).toBe("DR");
  });
  it("closes the phone sidebar before opening the chosen dialog", () => {
    const calls: string[] = [];
    render(sidebar({ mobile: true, onToggle: () => calls.push("toggle"), onDialog: (name) => calls.push(`dialog:${name}`) }));
    fireEvent.click(screen.getByRole("button", { name: /Sentrapedia/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Referensi" }));
    expect(calls).toEqual(["toggle", "dialog:knowledge"]);
  });
});

describe("account menu", () => {
  it("opens with settings, queue, references, about and sign out", () => {
    const onOpen = vi.fn(), onSignOut = vi.fn();
    render(<AccountMenu name="dr. Rani" plan="Lite" onOpen={onOpen} onSignOut={onSignOut}/>);
    fireEvent.click(screen.getByRole("button", { name: /dr\. Rani/ }));
    expect(screen.getAllByRole("menuitem").map(i => i.textContent)).toEqual(["Pengaturan Agent", "Antrean kerja", "Referensi", "Tentang workspace", "Keluar"]);
    expect(screen.getByRole("menuitem", { name: "Pengaturan Agent" }).getAttribute("href")).toBe("/agent");
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
  it("moves focus into the menu and walks it with the arrow, Home and End keys", () => {
    render(<AccountMenu name="dr. Rani" plan="Lite" onOpen={noop} onSignOut={noop}/>);
    fireEvent.click(screen.getByRole("button", { name: /dr\. Rani/ }));
    const names = () => screen.getAllByRole("menuitem").map(i => i.textContent);
    const focused = () => document.activeElement?.textContent;
    expect(focused()).toBe(names()[0]);
    const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key });
    press("ArrowDown"); expect(focused()).toBe("Antrean kerja");
    press("End"); expect(focused()).toBe("Keluar");
    press("ArrowDown"); expect(focused()).toBe("Pengaturan Agent");
    press("ArrowUp"); expect(focused()).toBe("Keluar");
    press("Home"); expect(focused()).toBe("Pengaturan Agent");
  });
  it("puts the menu after the trigger and closes when focus leaves it", () => {
    render(<><AccountMenu name="dr. Rani" plan="Lite" onOpen={noop}/><button>luar</button></>);
    const trigger = screen.getByRole("button", { name: /dr\. Rani/ });
    fireEvent.click(trigger);
    expect(trigger.compareDocumentPosition(screen.getByRole("menu")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.blur(screen.getAllByRole("menuitem")[0], { relatedTarget: screen.getByRole("button", { name: "luar" }) });
    expect(screen.queryByRole("menu")).toBeNull();
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
