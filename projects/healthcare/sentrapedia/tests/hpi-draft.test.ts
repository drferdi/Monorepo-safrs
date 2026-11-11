import { describe, expect, it } from "vitest";
import { readCaseFields } from "../src/lib/aadi/composer";
import { createDraft } from "../src/lib/drafts";

// Fictional cases only (spec section 10).
const draft = (prompt: string, language: "Bahasa Indonesia" | "English" = "Bahasa Indonesia") => createDraft({ mode: "hpi", prompt, context: "", specialty: "Umum", model: "Standard", language, instructions: "", caseFields: readCaseFields(prompt) });

describe("the Indonesian HPI note", () => {
  // Gaffer, 2026-10-21: "keluhan dipecah ke onset/durasi, gejala penyerta, dan negatif, seperti Catatan Klinis".
  it("splits free text into onset, character, associated symptoms and negatives, and keeps the source", () => {
    expect(draft("Perempuan 28 tahun batuk 5 hari, berdahak putih, demam ringan sejak 2 hari, tidak sesak")).toBe([
      "# ANAMNESIS (HPI)", "",
      "**Pasien:** Perempuan, 28 tahun",
      "**Status:** Draf anamnesis • Menunggu validasi dokter", "",
      "## 1. Keluhan Utama", "", "Batuk sejak 5 hari.", "",
      "## 2. Onset dan Durasi", "", "- Batuk: sejak 5 hari", "- Demam ringan: sejak 2 hari", "",
      "## 3. Lokasi / Sifat / Derajat", "", "- Berdahak putih", "",
      "## 4. Gejala Penyerta", "", "- Demam ringan", "",
      "## 5. Negatif Pertinen", "", "- Tidak sesak", "",
      "---", "",
      "## 6. Kelengkapan Dokumentasi", "",
      "**Belum diisi:**", "- Faktor pemberat dan peringan", "",
      "**Status akhir:** Belum lengkap — memerlukan verifikasi sebelum finalisasi catatan klinis.", "",
      "## Teks sumber (verbatim)",
      "Perempuan 28 tahun batuk 5 hari, berdahak putih, demam ringan sejak 2 hari, tidak sesak",
    ].join("\n"));
  });

  it("reads aggravating factors, word durations and \"(-)\" negatives", () => {
    const text = draft("Laki-laki 50 tahun nyeri ulu hati sejak kemarin, memberat setelah makan, mual, muntah (-), tanpa BAB hitam");
    expect(text).toContain("## 1. Keluhan Utama\n\nNyeri ulu hati sejak kemarin.\n");
    expect(text).toContain("Faktor Pemberat / Peringan\n\n- Memberat setelah makan\n");
    expect(text).toContain("Gejala Penyerta\n\n- Mual\n");
    expect(text).toContain("Negatif Pertinen\n\n- Muntah (-)\n- Tanpa BAB hitam\n");
  });

  it("lets labelled lines win and lists what is empty", () => {
    const text = draft("Keluhan utama: Batuk\nOnset: 3 hari lalu, mendadak\nGejala penyerta: pilek");
    expect(text).toContain("## 1. Keluhan Utama\n\nBatuk.\n");
    expect(text).toContain("## 2. Onset dan Durasi\n\n3 hari lalu, mendadak\n");
    expect(text).toContain("Gejala Penyerta\n\npilek\n");
    expect(text).toContain("**Belum diisi:**\n- Lokasi, sifat, dan derajat\n- Faktor pemberat dan peringan\n- Negatif pertinen\n");
  });

  it("leaves English HPI drafts as they were", () => {
    expect(draft("Cough for 5 days", "English")).toContain("# History of present illness\n\nLocal draft · Umum · Standard\n");
  });
});
