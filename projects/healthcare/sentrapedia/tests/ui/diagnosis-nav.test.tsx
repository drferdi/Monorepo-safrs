// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { DiagnosisDocument } from "../../src/components/diagnosis-document";
import { DocumentContent } from "../../src/components/document-studio";
import { diagnosisSectionTitles, doctorSummaryTitle } from "../../src/lib/aadi/presentation";

// A fictional report: the doctor's summary, then the nine parts; part 7 carries its DDI and Kontraindikasi fields.
const therapy = "**Usulan terapi dari AADI:**\n\nObat sintetis 500 mg, diminum tiga kali sehari\n\nDDI\nInteraksi sintetis\n\nKontraindikasi\nKontraindikasi sintetis";
const report = (part7: string) => `# Laporan\n\n## ${doctorSummaryTitle}\n\nRingkasan.\n\n` + diagnosisSectionTitles.map((title, index) => `## ${title}\n\n${index === 6 ? part7 : `Teks ${index + 1}.`}\n\n`).join("");

function Document({ content }: { content: string }) {
  const [selected, setSelected] = useState(0);
  return <DiagnosisDocument content={content} selected={selected} onSelect={setSelected} onEdit={() => undefined} renderContent={(text, edit) => <DocumentContent content={text} onEdit={edit} clinical/>}/>;
}
const rows = () => within(screen.getByRole("navigation", { name: "Bagian analisis kasus" })).getAllByRole("button");

Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("the case flow list", () => {
  // Gaffer, 2026-10-21 (RareUI RailTOC): "Rencana tata laksana / DDI / Kontraindikasi".
  it("lists DDI and Kontraindikasi one level under part 7, and a click there goes to that field", async () => {
    const scrolled: string[] = [];
    // jsdom has no scrollIntoView; record which element the list scrolls to.
    Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this.textContent ?? ""); };
    render(<Document content={report(therapy)}/>);
    expect(rows().map((row) => row.textContent)).toEqual([...diagnosisSectionTitles.slice(0, 7), "DDI", "Kontraindikasi", ...diagnosisSectionTitles.slice(7)]);
    expect(rows().filter((row) => row.hasAttribute("data-depth")).map((row) => row.textContent)).toEqual(["DDI", "Kontraindikasi"]);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "DDI" })); await new Promise((resolve) => requestAnimationFrame(resolve)); });
    expect(screen.getByRole("button", { name: "DDI" }).getAttribute("aria-current")).toBe("location");
    expect(scrolled).toEqual(["DDI"]);
    fireEvent.click(screen.getByRole("button", { name: diagnosisSectionTitles[6] }));
    expect(screen.getByRole("button", { name: diagnosisSectionTitles[6] }).getAttribute("aria-current")).toBe("location");
  });
  it("lists only the parts when part 7 has neither field", () => {
    render(<Document content={report("Belum ada data terapi untuk diagnosis ini.")}/>);
    expect(rows().map((row) => row.textContent)).toEqual(diagnosisSectionTitles);
  });
});
