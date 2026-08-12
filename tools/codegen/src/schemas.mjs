import { z } from "zod";

/**
 * Heuristic: is a value a Zod schema we can introspect? We detect the Zod
 * internal `_def` marker and the `safeParse` capability. This avoids importing
 * the full Zod type surface in a plain-ESM tool.
 */
export function isZodSchema(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.safeParse === "function" &&
    value._def !== null &&
    typeof value._def === "object" &&
    ("_zod" in value || "__zod" in value || "_def" in value)
  );
}

/**
 * Import a schema module file and collect every exported Zod schema value.
 *
 * @param {string} modulePath absolute path to the schema entry module
 * @returns {Promise<Array<{name: string, schema: import("zod").ZodTypeAny}>>}
 */
export async function importSchemas(modulePath) {
  const mod = await import(modulePath);
  const out = [];
  for (const [name, value] of Object.entries(mod)) {
    if (isZodSchema(value)) out.push({ name, schema: value });
  }
  return out;
}

/**
 * Infer the JSON Schema type name for a Zod schema, used as the OpenAPI
 * component key. Falls back to a sanitized "unknown" name.
 *
 * @param {import("zod").ZodTypeAny} schema
 * @returns {string}
 */
export function schemaTypeName(schema) {
  const def = schema._def;
  // Zod 4 exposes a lowercase discriminator in `_def.type` (e.g. "object").
  if (def?.type && typeof def.type === "string") {
    return def.type;
  }
  if (def?.typeName) {
    return String(def.typeName).replace(/^Zod/, "").toLowerCase();
  }
  return "unknown";
}

/**
 * Build a deterministic mock value for a Zod schema using faker.
 *
 * @param {import("zod").ZodTypeAny} schema
 * @param {import("@faker-js/faker").Faker} faker
 * @param {number} depth guards recursion
 * @returns {unknown}
 */
export function mockForSchema(schema, faker, depth = 0) {
  if (depth > 6) return "";
  const def = schema._def;
  // Zod 4 discriminator: `_def.type` is a lowercase string like "object".
  const kind = String(def?.type ?? def?.typeName ?? "")
    .replace(/^Zod/, "")
    .toLowerCase();

  switch (kind) {
    case "string":
      return faker.lorem.word();
    case "number":
      return faker.number.int({ min: 1, max: 1000 });
    case "boolean":
      return faker.datatype.boolean();
    case "date":
      return faker.date.recent().toISOString();
    case "bigint":
      return faker.number.int({ min: 1, max: 1000 });
    case "enum":
      return pick(def.values ?? def.options ?? []);
    case "literal":
      return def.value;
    case "object": {
      const shape = def.shape ?? {};
      const out = {};
      for (const [key, inner] of Object.entries(shape)) {
        out[key] = mockForSchema(inner, faker, depth + 1);
      }
      return out;
    }
    case "array":
      return [mockForSchema(def.type ?? def.items, faker, depth + 1)];
    case "optional":
    case "nullable":
      return mockForSchema(def.innerType ?? def.type, faker, depth + 1);
    case "union":
      return mockForSchema(pick(def.options ?? []), faker, depth + 1);
    case "record":
      return { key: mockForSchema(def.valueType, faker, depth + 1) };
    default:
      return "";
  }
}

function pick(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list[Math.floor(Math.random() * list.length)];
}

export { z };
