// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GuidelineCitations } from "../../src/components/guideline-citations";
import { DocumentContent } from "../../src/components/document-studio";
import type { TheOracleReferenceItem } from "../../src/lib/aadi/presentation";

afterEach(cleanup);
const fiveItems: TheOracleReferenceItem[] = [1, 2, 3, 4, 5].map((n) => ({ id: `P00${n}-00${n}-abcdef0123456789`, title: `pnpk-uji-${n}.md`, similarity: "0.7", text: `Kutipan ${n}` }));

describe("GuidelineCitations", () => {
  it("numbers the cards, shows two and folds the rest behind a count", () => {
    render(<GuidelineCitations idPrefix="c" items={fiveItems}/>);
    expect(screen.getByRole("region", { name: "Kutipan pedoman" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")[1].id).toBe("c-2");
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan 3 kutipan lagi" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getAllByText("Terverifikasi")).toHaveLength(5);
    expect(screen.getByText("Pnpk uji 3")).toBeTruthy();
    expect(screen.getByText("P003-003")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lipat kutipan" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
  it("shows no fold control for two or fewer items and nothing for none", () => {
    const { unmount } = render(<GuidelineCitations idPrefix="c" items={fiveItems.slice(0, 2)}/>);
    expect(screen.queryByRole("button")).toBeNull();
    unmount();
    render(<GuidelineCitations idPrefix="c" items={[]}/>);
    expect(screen.queryByRole("region")).toBeNull();
  });
  it("an in-text [2] links to the second card, and stays text without a prefix", () => {
    const { unmount } = render(<DocumentContent content="Teks. [2]" onEdit={() => undefined} citePrefix="c"/>);
    expect(screen.getByRole("link", { name: "[2]" }).getAttribute("href")).toBe("#c-2");
    unmount();
    render(<DocumentContent content="Teks. [2]" onEdit={() => undefined}/>);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Teks. [2]")).toBeTruthy();
  });
});
