// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { DiagnosisDocument } from "../../src/components/diagnosis-document";
import { DocumentContent } from "../../src/components/document-studio";
import { diagnosisSectionTitles, doctorSummaryTitle } from "../../src/lib/aadi/presentation";
import { mobileQuery } from "../../src/lib/layout";

// The report's shape: the doctor summary, then the nine parts; part 3 is a table, as AADI writes it.
const bodies = ["Teks satu.", "**Status tanda bahaya: belum dinilai.** Data yang belum tersedia tidak boleh dicatat sebagai temuan negatif.\n\nPrioritaskan penilaian terhadap:\n- Penurunan kesadaran", "| Data yang perlu dilengkapi | Alasan |\n| --- | --- |\n| Onset nyeri kepala | Membedakan nyeri kepala primer |", "**Temuan aktual: belum tersedia.**\n\nPemeriksaan yang perlu didokumentasikan:\n- Tanda vital", "Teks lima.", "Teks enam.", "Teks tujuh.", "Teks delapan.", "Teks sembilan."];
const report = `# Laporan\n\n## ${doctorSummaryTitle}\n\nRingkasan.\n\n` + diagnosisSectionTitles.map((title, index) => `## ${title}\n\n${bodies[index]}\n\n`).join("");
const folded = diagnosisSectionTitles.slice(1, 4);
const show = () => render(<DiagnosisDocument content={report} selected={0} onSelect={() => undefined} onEdit={() => undefined} renderContent={(text, edit) => <DocumentContent content={text} onEdit={edit} clinical/>} typing/>);
const section = (container: HTMLElement, title: string) => [...container.querySelectorAll<HTMLElement>(".diagnosis-section")].find(item => item.querySelector("h3")?.textContent === title)!;
const width = (phone: boolean) => Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: phone && query === mobileQuery, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("parts 2-4 on the phone", () => {
  it("start folded with their title and one line, arrive whole, and leave the summary and the other parts open", async () => {
    width(true);
    const { container } = show();
    // About 110 typed characters (the summary and parts 1, 5-9) take under 400 ms; typing parts 2-4 too would take longer.
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(container.querySelector(".diagnosis-document")!.getAttribute("aria-busy")).toBe("false");
    for (const title of folded) {
      const fold = section(container, title).querySelector<HTMLDetailsElement>(":scope > details[data-fold=\"part\"]")!;
      expect(fold.open).toBe(false);
      expect(fold.querySelector("summary h3")!.textContent).toBe(title);
    }
    expect(section(container, folded[0]).querySelector(".diagnosis-fold-line")!.textContent).toBe("Status tanda bahaya: belum dinilai. Data yang belum tersedia tidak boleh dicatat sebagai temuan negatif. Prioritaskan penilaian terhadap: Penurunan kesadaran");
    expect(section(container, folded[1]).querySelector(".diagnosis-fold-line")!.textContent).toBe("Onset nyeri kepala · Membedakan nyeri kepala primer");
    expect(section(container, folded[2]).querySelector(".diagnosis-fold-line")!.textContent).toBe("Temuan aktual: belum tersedia. Pemeriksaan yang perlu didokumentasikan: Tanda vital");
    // The full text is there once opened, word for word.
    expect(section(container, folded[0]).querySelector("details .diagnosis-section-body")!.textContent).toContain("Penurunan kesadaran");
    for (const title of [doctorSummaryTitle, ...diagnosisSectionTitles.filter(title => !folded.includes(title))]) expect(section(container, title).querySelector("details")).toBeNull();
  });
  it("show the full text of a folded part opened while the parts after it still type", async () => {
    width(true);
    const { container } = show();
    // Frame by frame until part 5 types: parts 2-4 are there whole in that same frame.
    for (let frame = 0; frame < 40 && section(container, diagnosisSectionTitles[4])?.dataset.typing !== "true"; frame++) await act(async () => { vi.advanceTimersByTime(16); });
    expect(section(container, diagnosisSectionTitles[4]).dataset.typing).toBe("true");
    expect(container.querySelector(".diagnosis-document")!.getAttribute("aria-busy")).toBe("true");
    expect(section(container, folded[2]).querySelector("details .diagnosis-section-body")!.textContent).toContain("Tanda vital");
  });
  it("stay open on a wider screen", async () => {
    width(false);
    const { container } = show();
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(container.querySelector(".diagnosis-document")!.getAttribute("aria-busy")).toBe("false");
    for (const title of folded) expect(section(container, title).querySelector("details")).toBeNull();
  });
});
