// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ChipRow } from "../../src/components/chip-row";
import { Composer } from "../../src/components/composer";
import { modes } from "../../src/lib/drafts";
import { chipLabel, chipShortlist } from "../../src/lib/studio";
import { initialWorkspace } from "../../src/lib/workspace";

const noop = () => undefined;
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const composerProps = (overrides: Partial<ComponentProps<typeof Composer>> = {}): ComponentProps<typeof Composer> => ({
  prompt: "", onPrompt: noop, mode: "question", onMode: noop, settings: initialWorkspace.settings, onModel: noop, context: "", onContext: noop, onScribe: noop,
  templates: [], favorites: [], templateKey: null, onTemplate: noop, onSubmit: noop, busy: false, ...overrides,
});

describe("chip row", () => {
  it("renders the shortlist as one scrollable row and marks the active mode", () => {
    render(<ChipRow mode="ddx" busy={false} onChip={noop}/>);
    const chips = screen.getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual(chipShortlist.map((id) => chipLabel(id)));
    expect(screen.getByRole("button", { name: "Diagnosis Banding (DDx)" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("group", { name: "Mode" }).classList.contains("chip-row")).toBe(true);
  });

  it("a chip reads Perbarui once the encounter already holds a document of that mode", () => {
    const encounter = { messages: [{ id: "m1", role: "assistant" as const, mode: "ddx" as const, content: "x", createdAt: "2026-11-04T00:00:00.000Z" }] };
    render(<ChipRow encounter={encounter} mode="question" busy={false} onChip={noop}/>);
    expect(screen.getByRole("button", { name: "Perbarui Diagnosis Banding (DDx)" })).toBeTruthy();
  });

  it("a chip prefills the composer with the mode's opening and never submits", () => {
    const onSubmit = vi.fn(), onPrompt = vi.fn(), onMode = vi.fn();
    render(<Composer {...composerProps({ onSubmit, onPrompt, onMode, prompt: "" })}/>);
    fireEvent.click(screen.getByRole("button", { name: "Catatan Klinis (SOAP)" }));
    expect(onMode).toHaveBeenCalledWith("clinic");
    expect(onPrompt).toHaveBeenCalledWith(modes.find((m) => m.id === "clinic")!.opening + "\n");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chips are disabled while an analysis runs so a click cannot cancel or resend it", () => {
    render(<Composer {...composerProps({ busy: true, aadiEnabled: true })}/>);
    for (const chip of screen.getByRole("group", { name: "Mode" }).querySelectorAll("button")) expect((chip as HTMLButtonElement).disabled).toBe(true);
  });

  it("the slash picker lists every mode under Mode and personal templates under Templat pribadi", () => {
    const onTemplate = vi.fn();
    render(<Composer {...composerProps({ onTemplate, prompt: "/", templates: [{ id: "t1", name: "QA SOAP pribadi", mode: "clinic", sections: [], instructions: "" }] })}/>);
    const picker = within(screen.getByRole("listbox", { name: "Pilih templat" }));
    expect(picker.getByRole("group", { name: "Mode" })).toBeTruthy();
    expect(picker.getAllByRole("option")).toHaveLength(modes.length + 1);
    expect(picker.getByRole("group", { name: "Templat pribadi" })).toBeTruthy();
    fireEvent.click(picker.getByRole("option", { name: /QA SOAP pribadi/ }));
    expect(onTemplate).toHaveBeenCalledWith("template:t1");
  });

  it("the slash picker puts favourites first and picking a mode strips the query", () => {
    const onMode = vi.fn(), onPrompt = vi.fn();
    render(<Composer {...composerProps({ onMode, onPrompt, prompt: "/", favorites: ["mode:handoff"] })}/>);
    const picker = within(screen.getByRole("listbox", { name: "Pilih templat" }));
    expect(picker.getAllByRole("group").map((group) => group.getAttribute("aria-label"))).toEqual(["Favorit", "Mode"]);
    fireEvent.click(picker.getAllByRole("option")[0]);
    expect(onMode).toHaveBeenCalledWith("handoff");
    expect(onPrompt).toHaveBeenCalledWith("");
  });

  it("arrow keys move through the slash picker and Enter picks, Escape closes it", () => {
    const onMode = vi.fn();
    render(<Composer {...composerProps({ onMode, prompt: "/" })}/>);
    const box = screen.getByLabelText("Pertanyaan atau catatan klinis");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    const second = within(screen.getByRole("listbox")).getAllByRole("option")[1];
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(box.getAttribute("aria-activedescendant")).toBe(second.id);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onMode).toHaveBeenCalledOnce();
    fireEvent.change(box, { target: { value: "/d" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("no intent tabs, quick-action label, Templat lain or slash hint remain", () => {
    render(<Composer {...composerProps({})}/>);
    for (const text of ["Analisis", "Dokumentasi", "Rencana", "Komunikasi", "Tindakan cepat", "Templat lain", "/ untuk templat"]) expect(screen.queryByText(text)).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Mode atau templat" })).toBeNull();
  });

  it("Mulai Scribe opens the scribe dialog and the vitals toggle shows the strip on demand", () => {
    const onScribe = vi.fn();
    const caseFields = { sex: "", age: "", bp: "", heartRate: "", temperature: "", respiratoryRate: "", spo2: "" } as const;
    render(<Composer {...composerProps({ onScribe, aadiEnabled: true, caseFields, autoFields: [], onCaseField: noop })}/>);
    fireEvent.click(screen.getByRole("button", { name: "Mulai Scribe" }));
    expect(onScribe).toHaveBeenCalledOnce();
    expect(screen.queryByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeNull();
    const toggle = screen.getByRole("button", { name: "Usia dan tanda vital" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeTruthy();
  });

  it("the strip opens by itself while minimum data is missing", () => {
    const caseFields = { sex: "", age: "", bp: "", heartRate: "", temperature: "", respiratoryRate: "", spo2: "" } as const;
    render(<Composer {...composerProps({ aadiEnabled: true, caseFields, autoFields: [], onCaseField: noop, minimumMissing: ["usia"] })}/>);
    expect(screen.getByRole("group", { name: "Usia, jenis kelamin, dan tanda vital" })).toBeTruthy();
  });
});
