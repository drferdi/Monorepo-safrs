// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { AgentSettings } from "../../src/components/agent-settings";
import { initialWorkspace } from "../../src/lib/workspace";

afterEach(cleanup);
const theoracle = { id: "TheOracle", chunks: 17989, model: "onnx-community/embeddinggemma-300m-ONNX", hash: "a".repeat(64), catalogVersion: "0.6" };

describe("AgentSettings", () => {
  it("has three tabs and saves environment from Preferensi", () => {
    const dispatch = vi.fn();
    render(<AgentSettings state={initialWorkspace} dispatch={dispatch} theoracle={theoracle}/>);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Preferensi", "Mode dan templat", "Pengetahuan"]);
    expect(screen.getByRole("tab", { name: "Preferensi" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.change(screen.getByLabelText("Lingkungan"), { target: { value: "Rawat jalan" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan preferensi" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "settings.save", settings: { ...initialWorkspace.settings, environment: "Rawat jalan" } });
    expect(screen.getByRole("status").textContent).toBe("Preferensi Agent tersimpan.");
  });

  it("binds a textarea per mode to modeInstructions and keeps the template manager on the same tab", () => {
    const dispatch = vi.fn();
    render(<AgentSettings state={initialWorkspace} dispatch={dispatch} theoracle={theoracle}/>);
    fireEvent.click(screen.getByRole("tab", { name: "Mode dan templat" }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("textbox", { name: /^Instruksi mode / })).toHaveLength(18);
    fireEvent.change(within(panel).getByRole("textbox", { name: "Instruksi mode Catatan Klinis (SOAP)" }), { target: { value: "Pakai bahasa singkat." } });
    fireEvent.click(within(panel).getByRole("button", { name: "Simpan instruksi mode" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "settings.save", settings: { ...initialWorkspace.settings, modeInstructions: { clinic: "Pakai bahasa singkat." } } });
    expect(within(panel).getByRole("group", { name: "Pengelola templat" })).toBeTruthy();
    // The page has no composer: the template manager keeps favourites and editing, not "Gunakan".
    expect(within(panel).queryByRole("button", { name: "Gunakan" })).toBeNull();
  });

  it("Pengetahuan lists the installed index, or says the database is not installed", () => {
    const { unmount } = render(<AgentSettings state={initialWorkspace} dispatch={vi.fn()} theoracle={theoracle}/>);
    fireEvent.click(screen.getByRole("tab", { name: "Pengetahuan" }));
    expect(screen.getByText("17.989")).toBeTruthy();
    expect(screen.getByText("onnx-community/embeddinggemma-300m-ONNX")).toBeTruthy();
    expect(screen.getByText("a".repeat(64))).toBeTruthy();
    expect(screen.getByText("0.6")).toBeTruthy();
    unmount();
    render(<AgentSettings state={initialWorkspace} dispatch={vi.fn()} theoracle={null}/>);
    fireEvent.click(screen.getByRole("tab", { name: "Pengetahuan" }));
    expect(screen.getByText("Database belum terpasang")).toBeTruthy();
  });
});
