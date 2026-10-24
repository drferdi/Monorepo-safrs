// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { DocumentContent } from "../../src/components/document-studio";

const view = (content: string) => render(<DocumentContent content={content} onEdit={() => undefined} clinical/>);
afterEach(cleanup);

describe("report tables and inline marks", () => {
  it("renders a markdown table with its header, body rows, escaped pipes, bold and links", () => {
    view("Sebelum\n\n| Sumber | Status |\n| --- | --- |\n| [NICE CG150](https://www.nice.org.uk/guidance/cg150) | **Ditinjau** |\n| Nyeri \\| dada | Belum |\n\nSesudah");
    const table = screen.getByRole("region", { name: "Tabel Sumber, Status" });
    expect(table.getAttribute("tabindex")).toBe("0");
    expect(within(table).getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Sumber", "Status"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByRole("link", { name: "NICE CG150" }).getAttribute("target")).toBe("_blank");
    expect(within(table).getByText("Ditinjau").tagName).toBe("STRONG");
    expect(within(table).getByRole("cell", { name: "Nyeri | dada" })).toBeTruthy();
    expect(screen.getByText("Sebelum")).toBeTruthy();
    expect(screen.getByText("Sesudah")).toBeTruthy();
  });
  it("shows a table that is still arriving: the header alone, then the header with its separator", () => {
    view("| Aspek | Data |");
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    cleanup();
    view("| Aspek | Data |\n| --- | --- |");
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.queryAllByRole("cell")).toHaveLength(0);
  });
  it("links only to web pages, and bolds a line whose closing mark has not arrived yet", () => {
    view("Lihat [sumber](javascript:alert(1)) dan *catatan*.\n**Status tanda bahaya: belum");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("catatan").tagName).toBe("EM");
    expect(screen.getByText("Status tanda bahaya: belum").tagName).toBe("STRONG");
  });
});
