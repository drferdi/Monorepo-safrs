import { describe, expect, it } from "vitest";
import { wordsUpTo } from "../src/lib/typing";

describe("table rows during the answer reveal", () => {
  const text = "Pengantar laporan.\n| Komponen | Keterangan |\n| --- | --- |\n| Keluhan utama | Nyeri kepala hebat |\nSesudah tabel, teks biasa.";
  const rows = text.split("\n");
  const end = (lines: number) => rows.slice(0, lines).join("\n").length;
  it("shows a row only once it is complete", () => {
    for (let count = end(1) + 1; count < end(2); count++) expect(wordsUpTo(text, count)).toBe(rows[0]);
    expect(wordsUpTo(text, end(2))).toBe(rows.slice(0, 2).join("\n"));
    for (let count = end(3) + 1; count < end(4); count++) expect(wordsUpTo(text, count)).toBe(rows.slice(0, 3).join("\n"));
    expect(wordsUpTo(text, end(4))).toBe(rows.slice(0, 4).join("\n"));
  });
  it("streams the text after the table word by word again", () => {
    expect(wordsUpTo(text, end(4) + 3)).toBe(rows.slice(0, 4).join("\n") + "\nSesudah");
  });
});
