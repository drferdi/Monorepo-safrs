/**
 * Minimal JSON Schema (2020-12) validator for the MIRA contract files in this folder, so the
 * extension checks service responses against the very schema the Python service is built from.
 *
 * Supported keywords are listed in `SUPPORTED_KEYWORDS`; the contract test fails if a schema
 * uses any other keyword, so nothing is silently ignored. Only local `$ref`s
 * (`#/$defs/<name>`) are supported.
 *
 * @module lib/diagnosis-engine/contract/validate-json
 */

export interface JsonSchema {
  [keyword: string]: unknown;
}

export const SUPPORTED_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$defs',
  '$ref',
  'title',
  'description',
  'type',
  'enum',
  'const',
  'required',
  'properties',
  'additionalProperties',
  'items',
  'minimum',
  'maximum',
  'minLength',
]);

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  if (type === 'integer') return Number.isInteger(value);
  return typeOf(value) === type;
}

function check(value: unknown, schema: JsonSchema, root: JsonSchema, path: string): string[] {
  if (typeof schema.$ref === 'string') {
    const name = schema.$ref.replace(/^#\/\$defs\//, '');
    const target = (root.$defs as Record<string, JsonSchema> | undefined)?.[name];
    if (!target) return [`${path}: unresolved $ref ${schema.$ref}`];
    return check(value, target, root, path);
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
    if (!types.some((type) => matchesType(value, type))) {
      return [`${path}: expected ${types.join(' or ')}, got ${typeOf(value)}`];
    }
  }
  if ('const' in schema && value !== schema.const) {
    return [`${path}: expected ${JSON.stringify(schema.const)}`];
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return [`${path}: expected one of ${JSON.stringify(schema.enum)}`];
  }

  const errors: string[] = [];
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${path}: below minimum ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${path}: above maximum ${schema.maximum}`);
    }
  }
  if (typeof value === 'string' && typeof schema.minLength === 'number') {
    if (value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      errors.push(...check(item, schema.items as JsonSchema, root, `${path}[${index}]`));
    });
  }
  if (typeOf(value) === 'object') {
    const record = value as Record<string, unknown>;
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    for (const key of (schema.required ?? []) as string[]) {
      if (!(key in record)) errors.push(`${path}.${key}: required`);
    }
    for (const [key, child] of Object.entries(record)) {
      if (properties[key]) errors.push(...check(child, properties[key], root, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}.${key}: not allowed`);
    }
  }
  return errors;
}

/** Returns the list of violations; empty means valid. */
export function validateJson(value: unknown, schema: JsonSchema): string[] {
  return check(value, schema, schema, '$');
}
