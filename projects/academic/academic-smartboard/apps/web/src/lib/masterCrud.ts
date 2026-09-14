export interface MasterField {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "date"
    | "number"
    | "textarea"
    | "select"
    | "boolean"
    | "multi";
  required?: boolean;
  wide?: boolean;
  default?: string | number | boolean | string[];
  placeholder?: string;
  options?: (
    extra: Record<string, unknown>,
  ) => Array<{ value: string; label: string }>;
  _idKey?: string;
}

export function resolveRowIdKey(row: Record<string, unknown>): string | null {
  const key = Object.keys(row).find((k) => k.endsWith("_id"));
  return key ?? null;
}

export function filterMasterRows<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
}

export function validateRequiredFields(
  fields: MasterField[],
  form: Record<string, unknown>,
): string | null {
  for (const f of fields) {
    if (!f.required) continue;
    const value = form[f.name];
    if (value === null || value === undefined || value === "") {
      return `Kolom ${f.label} wajib diisi.`;
    }
    if (Array.isArray(value) && value.length === 0) {
      return `Kolom ${f.label} wajib diisi.`;
    }
  }
  return null;
}

export function initMasterForm(
  fields: MasterField[],
): Record<string, unknown> {
  const init: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.default !== undefined) {
      init[f.name] = f.default;
    } else if (f.type === "boolean") {
      init[f.name] = true;
    } else if (f.type === "multi") {
      init[f.name] = [];
    } else if (f.type === "number") {
      init[f.name] = 0;
    } else {
      init[f.name] = "";
    }
  }
  return init;
}
