import { describe, expect, it } from "vitest";
import {
  buildSlipUrl,
  canApproveOvertime,
  earningRowStatus,
  METHOD_LABEL,
  OT_STATUS_LABEL,
  OT_STATUS_TONE,
  OT_TYPE_LABEL,
  PAYROLL_STATUS_LABEL,
  PAYROLL_STATUS_TONE,
  sumEarningsSummary,
  sumPaymentTotal,
  validatePaymentForm,
} from "./payroll.ts";

describe("sumEarningsSummary", () => {
  it("menjumlah total dan sesi", () => {
    const s = sumEarningsSummary([
      { total: 100_000, sessions: 2 },
      { total: 50_000, sessions: 1 },
    ]);
    expect(s.totalPayroll).toBe(150_000);
    expect(s.totalSessions).toBe(3);
    expect(s.tutorCount).toBe(2);
  });

  it("aman untuk array kosong", () => {
    expect(sumEarningsSummary([])).toEqual({
      totalPayroll: 0,
      totalSessions: 0,
      tutorCount: 0,
    });
  });
});

describe("earningRowStatus", () => {
  it("paid > verified > draft", () => {
    expect(earningRowStatus({ paid: true, verified: true })).toEqual({
      label: "Dibayar",
      tone: "success",
    });
    expect(earningRowStatus({ paid: false, verified: true })).toEqual({
      label: "Terverifikasi",
      tone: "info",
    });
    expect(earningRowStatus({ paid: false, verified: false })).toEqual({
      label: "Draft",
      tone: "neutral",
    });
  });
});

describe("PAYROLL_STATUS", () => {
  it("memetakan status periode ke label + tone", () => {
    expect(PAYROLL_STATUS_LABEL.dikunci).toBe("Terkunci");
    expect(PAYROLL_STATUS_TONE.dikunci).toBe("critical");
    expect(PAYROLL_STATUS_LABEL.draft).toBe("Draft");
    expect(PAYROLL_STATUS_TONE.dibayar).toBe("success");
  });
});

describe("buildSlipUrl", () => {
  it("membangun URL slip dari base API", () => {
    expect(buildSlipUrl("https://api.example/api", "p1", "t1")).toBe(
      "https://api.example/api/payroll/periods/p1/slip/t1",
    );
  });
});

describe("validatePaymentForm", () => {
  it("wajib periode, pengajar, jumlah", () => {
    expect(
      validatePaymentForm({
        period_id: "",
        tutor_id: "t",
        amount: 1,
        method: "tunai",
      }),
    ).toBe("Lengkapi periode, pengajar, jumlah");
  });

  it("aturan transfer_bank", () => {
    expect(
      validatePaymentForm({
        period_id: "p",
        tutor_id: "t",
        amount: 1000,
        method: "transfer_bank",
        bank_name: "",
        account_last4: "1234",
        transfer_ref: "REF123",
      }),
    ).toBe("Nama bank wajib");
    expect(
      validatePaymentForm({
        period_id: "p",
        tutor_id: "t",
        amount: 1000,
        method: "transfer_bank",
        bank_name: "BCA",
        account_last4: "12",
        transfer_ref: "REF123",
      }),
    ).toBe("4 digit terakhir rekening wajib");
    expect(
      validatePaymentForm({
        period_id: "p",
        tutor_id: "t",
        amount: 1000,
        method: "transfer_bank",
        bank_name: "BCA",
        account_last4: "1234",
        transfer_ref: "ab",
      }),
    ).toBe("No. referensi transfer wajib");
    expect(
      validatePaymentForm({
        period_id: "p",
        tutor_id: "t",
        amount: 1000,
        method: "transfer_bank",
        bank_name: "BCA",
        account_last4: "1234",
        transfer_ref: "REF99",
      }),
    ).toBeNull();
  });

  it("METHOD_LABEL lengkap", () => {
    expect(METHOD_LABEL.transfer_bank).toBe("Transfer Bank");
    expect(METHOD_LABEL.tunai).toBe("Tunai");
  });
});

describe("overtime helpers", () => {
  it("canApproveOvertime hanya owner/finance", () => {
    expect(canApproveOvertime("owner")).toBe(true);
    expect(canApproveOvertime("finance")).toBe(true);
    expect(canApproveOvertime("tentor")).toBe(false);
    expect(canApproveOvertime("admin_akademik")).toBe(false);
  });

  it("label status dan jenis", () => {
    expect(OT_STATUS_LABEL.diajukan).toBe("Diajukan");
    expect(OT_STATUS_TONE.ditolak).toBe("critical");
    expect(OT_TYPE_LABEL.mengajar_pengganti).toBe("Mengajar Pengganti");
  });
});

describe("sumPaymentTotal", () => {
  it("menjumlah amount pembayaran", () => {
    expect(sumPaymentTotal([{ amount: 10 }, { amount: 5 }])).toBe(15);
    expect(sumPaymentTotal([])).toBe(0);
  });
});
