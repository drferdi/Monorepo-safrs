import { describe, expect, it } from "vitest";
import { toCsvCell, toCsv } from "./csv";

describe("toCsvCell", () => {
  it("passes through plain values", () => {
    expect(toCsvCell("Bimbel Alfa")).toBe("Bimbel Alfa");
    expect(toCsvCell(150000)).toBe("150000");
  });

  it("returns empty string for null/undefined", () => {
    expect(toCsvCell(null)).toBe("");
    expect(toCsvCell(undefined)).toBe("");
  });

  it("quotes values containing commas, quotes, or newlines", () => {
    expect(toCsvCell("a,b")).toBe('"a,b"');
    expect(toCsvCell('he said "hi"')).toBe('"he said ""hi"""');
    expect(toCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("defuses spreadsheet formula injection", () => {
    expect(toCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(toCsvCell("+1")).toBe("'+1");
    expect(toCsvCell("-1")).toBe("'-1");
    expect(toCsvCell("@cmd")).toBe("'@cmd");
  });

  it("quotes a formula that also contains a comma", () => {
    expect(toCsvCell("=A1,B1")).toBe("\"'=A1,B1\"");
  });
});

describe("toCsv", () => {
  const columns = [
    { label: "Nama", get: (r: { name: string; status: string }) => r.name },
    {
      label: "Status",
      get: (r: { name: string; status: string }) => r.status,
    },
  ];

  it("renders header + CRLF-separated rows", () => {
    const csv = toCsv(columns, [
      { name: "Alfa", status: "active" },
      { name: "Beta, Cabang", status: "draft" },
    ]);
    expect(csv).toBe('Nama,Status\r\nAlfa,active\r\n"Beta, Cabang",draft');
  });

  it("returns just the header for an empty row set", () => {
    expect(toCsv(columns, [])).toBe("Nama,Status");
  });
});
