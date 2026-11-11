import { describe, expect, it } from "vitest";

import { PUBLIC_EVIDENCE_LANGUAGE } from "../src/content/public-evidence-language";

describe("public evidence language", () => {
  it("uses Chief-approved historical and non-judgmental wording", () => {
    expect(PUBLIC_EVIDENCE_LANGUAGE).toEqual({
      epistemicLabel: "Catatan mengenai sumber dan dasar informasi",
      editorialDraft:
        "Naskah ini masih dalam proses penelaahan editorial dan belum diterbitkan secara resmi.",
      disclosure: "Sumber dan bukti sejarah yang tersedia",
      confidence: "Tingkat kepastian berdasarkan sumber",
      supporting: "Sumber yang mendukung penafsiran ini",
      differing: "Sumber yang memuat keterangan atau penafsiran berbeda",
      context: "Sumber untuk memahami latar dan konteks sejarah",
      competing: "Pandangan dan penafsiran lain dalam kajian sejarah",
    });
  });
});
