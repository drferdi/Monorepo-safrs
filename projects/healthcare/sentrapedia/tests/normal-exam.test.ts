import { describe, expect, it } from "vitest";
import { readCaseFields } from "../src/lib/aadi/composer";
import { createDraft } from "../src/lib/drafts";
import { missingField } from "../src/lib/clinical-templates";
import { examFlags, examGroupLabel, examPatient, missingPregnancyLines, normalExam, reviewedText } from "../src/lib/normal-exam";

// Fictional cases only (spec section 10).
const exam = (text: string, hints: { age?: string; sex?: "M" | "F" } = {}) => normalExam(text, readCaseFields(text), hints)?.text;
const patient = (text: string) => examPatient(text, readCaseFields(text), {})!;
const flags = (text: string) => examFlags(text, readCaseFields(text), patient(text));
const line = (text: string, label: string) => exam(text)?.split("\n").find((item) => item.startsWith(`${label}: `));

describe("normal exam templates", () => {
  it("assembles the child sample of the spec exactly", () => {
    expect(exam("Laki-laki, 4 tahun. N 110, RR 36, S 38,2\nTenggorok: faring hiperemis (+), tonsil T2-T2 hiperemis, detritus (-)")).toBe([
      "Keadaan umum: Baik, aktif [otomatis normal]",
      "Kesadaran: Compos mentis [otomatis normal]",
      "Kepala: Normocephal [otomatis normal]",
      "Mata: Konjungtiva anemis (-/-), sklera ikterik (-/-), mata cekung (-), pupil isokor, refleks cahaya (+/+) [otomatis normal]",
      "Telinga, hidung, tenggorok: faring hiperemis (+), tonsil T2-T2 hiperemis, detritus (-)",
      "Mulut: Mukosa bibir lembap, sianosis (-) [otomatis normal]",
      "Leher: Pembesaran KGB (-), pembesaran tiroid (-) [otomatis normal]",
      "Paru: Gerak napas simetris, tarikan dinding dada ke dalam (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-) [otomatis normal]",
      "Jantung: Bunyi jantung I–II reguler, murmur (-), gallop (-) [otomatis normal]",
      "Abdomen: Supel, bising usus (+) normal, nyeri tekan (-), hepar dan lien tidak teraba [otomatis normal]",
      "Genitalia: Tidak diperiksa",
      "Anus dan rektum: Tidak diperiksa",
      "Ekstremitas: Akral hangat, CRT < 2 detik [otomatis normal]",
      "Kulit: Ruam (-), turgor kulit kembali cepat [otomatis normal]",
      "Status neurologis: Tidak diperiksa",
    ].join("\n"));
    expect(normalExam("Laki-laki, 4 tahun. N 110, RR 36, S 38,2", readCaseFields("Laki-laki, 4 tahun. N 110, RR 36, S 38,2"), {})?.vitals).toEqual({ heartRate: 110, respiratoryRate: 36, temperature: 38.2 });
  });

  it("assembles the pregnant sample of the spec exactly", () => {
    expect(exam("Perempuan, 28 tahun. TD 150/100, N 92\nHamil: 32 minggu\nEkstremitas: edema tungkai (+/+)\nTFU: 30 cm\nDJJ: 142 /menit")).toBe([
      "Keadaan umum: Baik [otomatis normal]",
      "Kesadaran: Compos mentis [otomatis normal]",
      "Kepala: Normocephal [otomatis normal]",
      "Mata: Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+) [otomatis normal]",
      "Telinga, hidung, tenggorok: Sekret telinga (-/-), sekret hidung (-), faring hiperemis (-), tonsil tidak hiperemis, detritus (-) [otomatis normal]",
      "Mulut: Mukosa bibir lembap, sianosis (-) [otomatis normal]",
      "Leher: Pembesaran KGB (-), pembesaran tiroid (-) [otomatis normal]",
      "Paru: Gerak napas simetris, retraksi (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-) [otomatis normal]",
      "Jantung: Bunyi jantung I–II reguler, murmur (-), gallop (-) [otomatis normal]",
      "Payudara: Massa (-), retraksi puting (-) [otomatis normal]",
      "Abdomen: Membesar (hamil), nyeri tekan (-) [otomatis normal]",
      "Tinggi fundus uteri: 30 cm",
      "Denyut jantung janin: 142 /menit",
      "Pemeriksaan dalam: Tidak dilakukan",
      "Genitalia: Tidak diperiksa",
      "Anus dan rektum: Tidak diperiksa",
      "Ekstremitas: edema tungkai (+/+)",
      "Kulit: Ruam (-) [otomatis normal]",
      "Status neurologis: Tidak diperiksa",
    ].join("\n"));
    expect(flags("Perempuan, 28 tahun. TD 150/100, N 92\nHamil: 32 minggu")).toEqual(["TD 150/100 mmHg: ≥ 140/90 pada kehamilan"]);
  });

  it("chooses the group from age, sex, pregnancy and the postpartum period", () => {
    expect(patient("Laki-laki, 45 tahun").group).toBe("adult");
    expect(patient("Usia: 8 bulan, perempuan")).toMatchObject({ group: "infant", months: 8, age: "8 bulan" });
    // A duration in months is not an age.
    expect(patient("Laki-laki 30 tahun, batuk 2 bulan").group).toBe("adult");
    expect(patient("Perempuan 25 tahun\nHamil: tidak").group).toBe("adult");
    expect(patient("Perempuan 25 tahun, takut hamil").group).toBe("adult");
    expect(patient("Laki-laki 25 tahun\nHamil: ya").group).toBe("adult");
    expect(patient("Perempuan 25 tahun\nNifas: hari ke-3")).toMatchObject({ group: "postpartum", day: 3 });
    expect(patient("Perempuan 25 tahun\nHamil: 39 minggu\nNifas: 2 hari").group).toBe("postpartum");
    expect(examGroupLabel(patient("Perempuan, 28 tahun\nHamil: 32 minggu"))).toBe("Hamil 32 minggu · P · 28 tahun");
    expect(normalExam("Demam 3 hari", {}, {})).toBeUndefined();
    expect(normalExam("Demam 3 hari", {}, { age: "40", sex: "F" })?.text).toContain("Payudara: Tidak diperiksa");
  });

  it("adds infant and postpartum lines and leaves an unmeasured line out", () => {
    const infant = exam("Usia: 8 bulan, laki-laki")!;
    expect(infant).not.toContain("Lingkar kepala");
    expect(infant).not.toContain("Ubun-ubun besar");
    expect(infant).not.toContain("Payudara");
    const nifas = exam("Perempuan 25 tahun\nNifas: hari ke-3\nLokia: rubra")!;
    expect(nifas).toContain("Lokia: rubra");
    expect(nifas).not.toContain("Kontraksi uterus");
    expect(nifas).toContain("Ekstremitas: Akral hangat, CRT < 2 detik, edema tungkai (-/-), nyeri betis (-/-) [otomatis normal]");
    expect(nifas).not.toContain("Leopold");
    for (const text of [infant, nifas, exam("Laki-laki 60 tahun")!]) expect(text).not.toMatch(/^(?:Tekanan darah|Nadi|Napas|Suhu|SpO₂|Berat badan|IMT|Lingkar)|belum diukur|belum dinilai/m);
  });

  it("derives IMT only from typed weight and height, and keeps the doctor's units", () => {
    const text = exam("Laki-laki 40 tahun\nBB: 80\nTB: 170 cm\nLingkar perut: 95")!;
    expect(text).toContain("Berat badan: 80 kg");
    expect(text).toContain("Tinggi badan / panjang badan: 170 cm");
    expect(text).toContain("IMT: 27,7");
    expect(flags("Laki-laki 40 tahun\nBB: 80\nTB: 170 cm\nLingkar perut: 95")).toEqual(["IMT 27,7: ≥ 25 (Asia-Pasifik, KMK 509/2025)", "Lingkar perut 95 cm: > 90 (KMK 509/2025)"]);
  });

  it("never contradicts the doctor's findings", () => {
    expect(line("Laki-laki 40 tahun\nKeluhan utama: lemas\nPemeriksaan fisik: konjungtiva anemis", "Mata")).toBe("Mata: lihat temuan dokter");
    expect(exam("Laki-laki 40 tahun\nKeluhan utama: lemas\nPemeriksaan fisik: konjungtiva anemis")!.split("\n")[0]).toBe("Temuan dokter: konjungtiva anemis");
    // Complaint words do not suppress once the text is labelled.
    expect(line("Laki-laki 40 tahun\nKeluhan utama: lemas, sesak", "Paru")).toMatch(/\[otomatis normal\]$/);
    // Fully unlabelled text is scanned as a whole.
    expect(line("Perempuan 35 tahun, konjungtiva anemis, lemas", "Mata")).toBe("Mata: lihat catatan dokter");
    expect(line("Laki-laki 40 tahun\nPemeriksaan fisik: keputihan", "Genitalia")).toBe("Genitalia: lihat temuan dokter");
    // A finding for a line the group does not have stays under the doctor's findings.
    expect(exam("Laki-laki 40 tahun\nDJJ: 140")).toContain("DJJ: 140");
  });

  it("flags values against the reference ranges without writing them", () => {
    expect(flags("Laki-laki 4 tahun, RR 44, N 130, S 38,2")).toEqual(["Suhu 38,2 °C: ≥ 37,5", "Nadi 130 /menit: di luar 80-120", "Napas 44 /menit: ≥ 40, napas cepat (MTBS)"]);
    expect(flags("Usia: 6 bulan, perempuan, RR 52")).toEqual(["Napas 52 /menit: ≥ 50, napas cepat (MTBS)"]);
    expect(flags("Laki-laki 50 tahun, TD 134/80, SpO2 92")).toEqual(["TD 134/80 mmHg: rentang normal-tinggi 130-139/85-89 (PERHI 2021)", "SpO₂ 92%: < 95%"]);
    expect(flags("Perempuan 30 tahun\nNifas: hari ke-2\nS 38,4, N 110")).toEqual(["Suhu 38,4 °C: ≥ 38,0 pada masa nifas", "Nadi 110 /menit: di luar 60-100"]);
    expect(flags("Perempuan 30 tahun\nHamil: 32 minggu\nTFU: 27 cm\nDJJ: 170")).toEqual(["DJJ 170 /menit: di luar 120-160", "TFU 27 cm: selisih > 2 cm dari usia kehamilan 32 minggu"]);
  });

  it("hides the marker only once the draft is reviewed", () => {
    const text = "Mata: Konjungtiva anemis (-/-) [otomatis normal]";
    expect(reviewedText(text, "draft")).toBe(text);
    expect(reviewedText(text, undefined)).toBe(text);
    expect(reviewedText(text, "reviewed")).toBe("Mata: Konjungtiva anemis (-/-)");
    expect(reviewedText(text, "final")).toBe("Mata: Konjungtiva anemis (-/-)");
  });

  it("offers the Hamil and Nifas lines until they are typed", () => {
    expect(missingPregnancyLines("Perempuan 30 tahun")).toEqual(["Hamil", "Nifas"]);
    expect(missingPregnancyLines("Perempuan 30 tahun\nHamil: ")).toEqual(["Nifas"]);
  });
});

describe("the local SOAP draft", () => {
  const draft = (prompt: string, language: "Bahasa Indonesia" | "English" = "Bahasa Indonesia") => createDraft({ mode: "clinic", prompt, context: "", specialty: "Umum", model: "Standard", language, instructions: "", caseFields: readCaseFields(prompt) });
  const section = (text: string, title: string) => text.split(new RegExp(`\\n## \\d+\\. ${title}\\n\\n`))[1]?.split(/\n\n(?:---\n\n)?## /)[0];

  it("fills Pemeriksaan Fisik from the template and keeps exam lines out of the complaint", () => {
    const text = draft("Demam 3 hari, laki-laki 4 tahun\nTenggorok: faring hiperemis (+)");
    expect(section(text, "Keluhan Utama")).toBe("Demam sejak 3 hari.");
    expect(section(text, "Pemeriksaan Fisik")).toContain("| **THT** | Faring hiperemis (+). |");
    expect(section(text, "Pemeriksaan Fisik")).toContain("| **Paru** | Gerak napas simetris");
    expect(section(text, "Assessment")).toBeUndefined();
    expect(section(text, "Kelengkapan Dokumentasi")).toContain("- Assessment / Diagnosis\n");
    expect(text).toContain("## Teks sumber (verbatim)\nDemam 3 hari, laki-laki 4 tahun\nTenggorok: faring hiperemis (+)");
  });

  // Gaffer, 2026-10-21 ("Catatan Klinis / REFORMAT"): his pasted note, line for line.
  it("writes the clinical note in Gaffer's format", () => {
    expect(draft("Laki-laki 40 tahun demam 3 hari, nyeri kepala, TD 120/80, N 96, S 38,6")).toBe([
      "# CATATAN KLINIS", "",
      "**Pasien:** Laki-laki, 40 tahun",
      "**Status:** Draf pemeriksaan • Menunggu validasi dokter", "",
      "## 1. Keluhan Utama", "",
      "Demam sejak 3 hari disertai nyeri kepala.", "",
      "## 2. Pemeriksaan Fisik", "",
      "### A. Keadaan Umum & Tanda Vital", "",
      "| Parameter | Hasil |", "| --- | --- |",
      "| **Keadaan umum** | Baik [otomatis normal] |",
      "| **Kesadaran** | Compos mentis [otomatis normal] |",
      "| **Tekanan darah** | 120/80 mmHg |",
      "| **Nadi** | 96 x/menit |",
      "| **Suhu** | 38,6 °C |",
      "| Frekuensi napas | Belum diukur |",
      "| SpO₂ | Belum diukur |", "",
      "### B. Antropometri", "",
      "| Parameter | Hasil |", "| --- | --- |",
      "| Berat badan | Belum diukur |",
      "| Tinggi badan | Belum diukur |",
      "| IMT | Belum dihitung |",
      "| Lingkar perut | Belum diukur |", "",
      "### C. Pemeriksaan Sistemik", "",
      "| Organ / Sistem | Temuan Pemeriksaan |", "| --- | --- |",
      "| **Kepala** | Lihat catatan dokter. |",
      "| **Mata** | Konjungtiva anemis (-/-), sklera ikterik (-/-), pupil isokor, refleks cahaya (+/+). [otomatis normal] |",
      "| **THT** | Sekret telinga (-/-), sekret hidung (-), faring hiperemis (-), tonsil tidak hiperemis, detritus (-). [otomatis normal] |",
      "| **Mulut** | Mukosa bibir lembap, sianosis (-). [otomatis normal] |",
      "| **Leher** | Pembesaran KGB (-), pembesaran tiroid (-). [otomatis normal] |",
      "| **Paru** | Gerak napas simetris, retraksi (-), suara napas vesikuler (+/+), ronki (-/-), wheezing (-/-). [otomatis normal] |",
      "| **Jantung** | Bunyi jantung I–II reguler, murmur (-), gallop (-). [otomatis normal] |",
      "| **Abdomen** | Supel, bising usus (+) normal, nyeri tekan (-), hepar dan lien tidak teraba. [otomatis normal] |",
      "| **Ekstremitas** | Akral hangat, CRT < 2 detik, edema (-/-). [otomatis normal] |",
      "| **Kulit** | Ruam (-). [otomatis normal] |", "",
      "### D. Pemeriksaan Lainnya", "",
      "| Pemeriksaan | Status |", "| --- | --- |",
      "| Genitalia | Tidak diperiksa |",
      "| Anus & rektum | Tidak diperiksa |",
      "| Status neurologis | Tidak diperiksa |", "",
      "---", "",
      "## 3. Kelengkapan Dokumentasi", "",
      "**Belum diisi:**",
      "- Riwayat penyakit",
      "- Riwayat pengobatan dan alergi",
      "- Assessment / Diagnosis",
      "- Tata laksana", "",
      "**Temuan dari templat normal — perlu validasi dokter:**", "",
      "Keadaan umum, kesadaran, mata, THT, mulut, leher, paru, jantung, abdomen, ekstremitas, dan kulit.", "",
      "*Catatan: Temuan yang berasal dari templat normal belum dapat dianggap sebagai hasil pemeriksaan aktual sampai dikonfirmasi oleh dokter.*", "",
      "**Status akhir:** Belum lengkap — memerlukan verifikasi sebelum finalisasi catatan klinis.",
    ].join("\n"));
    const named = createDraft({ mode: "clinic", prompt: "Demam 3 hari", context: "", specialty: "Umum", model: "Standard", language: "Bahasa Indonesia", instructions: "", patient: { id: "p1", name: "Pasien Fiktif", age: "30", sex: "Female", notes: "" } });
    expect(named).toContain("\n**Pasien:** Pasien Fiktif, Perempuan, 30 tahun\n");
  });

  it("leaves the exam to the completeness list until age and sex are known, and keeps English drafts unmarked", () => {
    const text = draft("Demam 3 hari");
    expect(section(text, "Pemeriksaan Fisik")).toBeUndefined();
    expect(section(text, "Kelengkapan Dokumentasi")).toContain("- Pemeriksaan fisik\n");
    expect(text).not.toContain("templat normal");
    expect(draft("Fever, male 40 tahun", "English")).not.toContain("[otomatis normal]");
  });

  it("uses the saved patient's age and sex", () => {
    const text = createDraft({ mode: "clinic", prompt: "Keluhan utama: batuk", context: "", specialty: "Umum", model: "Standard", language: "Bahasa Indonesia", instructions: "", patient: { id: "p1", name: "Pasien Fiktif", age: "30", sex: "Female", notes: "" } });
    expect(section(text, "Pemeriksaan Fisik")).toContain("| Payudara | Tidak diperiksa |");
  });
});
