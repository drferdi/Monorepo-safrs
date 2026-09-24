import { describe, expect, it } from "vitest";
import {
  filterMasterRows,
  initMasterForm,
  type MasterField,
  resolveRowIdKey,
  validateRequiredFields,
} from "./masterCrud.ts";

describe("resolveRowIdKey", () => {
  it("mengambil kunci *_id pertama", () => {
    expect(resolveRowIdKey({ school_id: "s1", name: "A" })).toBe("school_id");
    expect(resolveRowIdKey({ name: "A" })).toBeNull();
  });
});

describe("filterMasterRows", () => {
  it("filter case-insensitive atas JSON row", () => {
    const rows = [
      { school_id: "1", name: "SD Negeri" },
      { school_id: "2", name: "SMP Swasta" },
    ];
    expect(filterMasterRows(rows, "negeri")).toHaveLength(1);
    expect(filterMasterRows(rows, "")).toHaveLength(2);
  });
});

describe("validateRequiredFields", () => {
  const fields: MasterField[] = [
    { name: "name", label: "Nama", required: true },
    { name: "stage", label: "Jenjang", required: true },
  ];

  it("mengembalikan pesan wajib", () => {
    expect(validateRequiredFields(fields, { name: "", stage: "SD" })).toBe(
      "Kolom Nama wajib diisi.",
    );
    expect(
      validateRequiredFields(fields, { name: "A", stage: "SD" }),
    ).toBeNull();
  });
});

describe("initMasterForm", () => {
  it("mengisi default tipe", () => {
    expect(
      initMasterForm([
        { name: "active", label: "Status", type: "boolean" },
        { name: "tags", label: "Tag", type: "multi" },
        { name: "order", label: "Urutan", type: "number", default: 3 },
      ]),
    ).toEqual({ active: true, tags: [], order: 3 });
  });
});
