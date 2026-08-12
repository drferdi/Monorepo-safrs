import { z } from "zod";
import { schemaTypeName } from "./schemas.mjs";

/**
 * Build an OpenAPI 3.1 document from a set of named Zod schemas.
 *
 * Uses Zod 4's native `z.toJSONSchema(...)` (draft 2020-12) which is
 * dependency-free and reliable with the repo's Zod version.
 *
 * @param {Array<{name: string, schema: import("zod").ZodTypeAny}>} schemas
 * @param {{title?: string, version?: string}} meta
 * @returns {object}
 */
export function buildOpenApiDocument(schemas, meta = {}) {
  const components = {};
  for (const { name, schema } of schemas) {
    const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(schema);
    components[name] = jsonSchema;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: meta.title ?? "SAFRS Schema API",
      version: meta.version ?? "0.0.0",
    },
    paths: {},
    components: {
      schemas: components,
    },
  };
}

/**
 * Derive a JSON Schema reference for a schema name, matching the component
 * key produced by buildOpenApiDocument.
 *
 * @param {string} name
 * @returns {object}
 */
export function refFor(name) {
  return { $ref: `#/components/schemas/${name}` };
}

export { schemaTypeName };
