import { describe, expect, it } from "vitest";
import {
  ATTEND_LABEL,
  COMPETENCE_LABEL,
  FORMAT_LABEL,
  MODE_LABEL,
  ROLE_LABEL,
  SESSION_STATUS_LABEL,
  STATUS_BADGE,
  fmtDate,
  fmtDateShort,
  rupiah,
} from "./labels";

describe("ROLE_LABEL", () => {
  it("mempertahankan label peran arsip verbatim", () => {
    expect(ROLE_LABEL.owner).toBe("Owner / Kepala");
    expect(ROLE_LABEL.admin_akademik).toBe("Admin Akademik");
    expect(ROLE_LABEL.tentor).toBe("Pengajar");
    expect(ROLE_LABEL.finance).toBe("Finance");
    expect(ROLE_LABEL.murid_ortu).toBe("Murid / Orang Tua");
    expect(ROLE_LABEL.content_manager).toBe("Content Manager");
  });
});

describe("FORMAT_LABEL / MODE_LABEL", () => {
  it("mempertahankan format dan mode arsip", () => {
    expect(FORMAT_LABEL.privat).toBe("Privat");
    expect(FORMAT_LABEL.semi_privat).toBe("Semi-Privat");
    expect(FORMAT_LABEL.reguler).toBe("Reguler");
    expect(MODE_LABEL.di_tempat).toBe("Di Tempat Bimbel");
    expect(MODE_LABEL.kunjung).toBe("Kunjung Rumah");
    expect(MODE_LABEL.online).toBe("Online");
  });
});

describe("SESSION_STATUS_LABEL / ATTEND_LABEL / COMPETENCE_LABEL", () => {
  it("mempertahankan status sesi, kehadiran, dan kompetensi arsip", () => {
    expect(SESSION_STATUS_LABEL.menunggu_evaluasi).toBe("Menunggu Evaluasi");
    expect(SESSION_STATUS_LABEL.dijadwalkan_ulang).toBe("Dijadwalkan Ulang");
    expect(ATTEND_LABEL.tidak_hadir).toBe("Tidak Hadir");
    expect(ATTEND_LABEL.digantikan).toBe("Digantikan");
    expect(COMPETENCE_LABEL.belum_memahami).toBe("Belum Memahami");
    expect(COMPETENCE_LABEL.menguasai).toBe("Menguasai");
  });
});

describe("STATUS_BADGE", () => {
  it("memetakan status arsip ke tone token-friendly", () => {
    expect(STATUS_BADGE.terjadwal).toBe("info");
    expect(STATUS_BADGE.berlangsung).toBe("info");
    expect(STATUS_BADGE.menunggu_evaluasi).toBe("warning");
    expect(STATUS_BADGE.menunggu_verifikasi).toBe("warning");
    expect(STATUS_BADGE.terverifikasi).toBe("success");
    expect(STATUS_BADGE.masuk_payroll).toBe("success");
    expect(STATUS_BADGE.selesai).toBe("success");
    expect(STATUS_BADGE.dibatalkan).toBe("critical");
    expect(STATUS_BADGE.dijadwalkan_ulang).toBe("neutral");
    expect(STATUS_BADGE.hadir).toBe("success");
    expect(STATUS_BADGE.terlambat).toBe("warning");
    expect(STATUS_BADGE.izin).toBe("neutral");
    expect(STATUS_BADGE.sakit).toBe("neutral");
    expect(STATUS_BADGE.tidak_hadir).toBe("critical");
    expect(STATUS_BADGE.digantikan).toBe("info");
  });
});

describe("rupiah", () => {
  it("memformat angka seperti arsip", () => {
    expect(rupiah(null)).toBe("Rp0");
    expect(rupiah(undefined)).toBe("Rp0");
    expect(rupiah(Number.NaN)).toBe("Rp0");
    expect(rupiah(1500000)).toBe("Rp1.500.000");
  });
});

describe("fmtDate / fmtDateShort", () => {
  // Arsip memakai toLocaleDateString('id-ID') → "Agu"; dayjs locale id → "Agt".
  // Pertahankan keluaran arsip (lihat Catatan eksekusi sub-fase 2).
  it("memformat tanggal panjang seperti arsip", () => {
    expect(fmtDate("2026-08-04")).toBe("Sel, 04 Agu 2026");
    expect(fmtDate("")).toBe("-");
    expect(fmtDate(null)).toBe("-");
  });

  it("memformat tanggal pendek seperti arsip", () => {
    expect(fmtDateShort("2026-08-04")).toBe("04 Agu");
    expect(fmtDateShort("")).toBe("-");
  });
});
