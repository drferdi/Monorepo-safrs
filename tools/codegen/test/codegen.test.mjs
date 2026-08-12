import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { generateMock, renderMockModule } from "../src/mock.mjs";
import { buildOpenApiDocument } from "../src/openapi.mjs";
import { isZodSchema, schemaTypeName } from "../src/schemas.mjs";

const demo = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
});

const sample = { name: "demo", schema: demo };

test("isZodSchema detects Zod objects", () => {
  assert.equal(isZodSchema(demo), true);
  assert.equal(isZodSchema({}), false);
  assert.equal(isZodSchema(null), false);
});

test("schemaTypeName normalizes the Zod kind", () => {
  assert.equal(schemaTypeName(demo), "object");
  assert.equal(schemaTypeName(z.string()), "string");
});

test("buildOpenApiDocument emits an OpenAPI 3.1 document with components", () => {
  const doc = buildOpenApiDocument([sample], { title: "T", version: "1.0.0" });
  assert.equal(doc.openapi, "3.1.0");
  assert.equal(doc.info.title, "T");
  assert.ok(doc.components.schemas.demo);
  assert.equal(doc.components.schemas.demo.type, "object");
});

test("generateMock returns an object with the expected keys", () => {
  const mock = generateMock([sample], "demo");
  assert.ok(typeof mock === "object");
  assert.ok("name" in mock);
});

test("generateMock applies overrides", () => {
  const mock = generateMock([sample], "demo", { name: "Atlas" });
  assert.equal(mock.name, "Atlas");
});

test("generateMock throws for an unknown schema", () => {
  assert.throws(() => generateMock([sample], "missing"));
});

test("renderMockModule lists every schema", () => {
  const src = renderMockModule([sample]);
  assert.ok(src.includes("mockdemo"));
  assert.ok(src.includes('"demo"'));
});
