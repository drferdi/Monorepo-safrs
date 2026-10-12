import { describe, expect, it } from "vitest";
import { app } from "./app.ts";
import { buildOpenApiDocument } from "./openapi.ts";

describe("OpenAPI document", () => {
  it("is an OpenAPI 3.1 document with schema components", () => {
    const doc = buildOpenApiDocument();
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.components.schemas.Demo.type).toBe("object");
    const input = doc.components.schemas.CreateDemoInput;
    expect(input.properties).toBeDefined();
    expect(input.properties?.name).toBeDefined();
    expect(doc.paths["/api/demos"]).toBeDefined();
  });

  it("serves the document at /api/openapi.json", async () => {
    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
  });

  it("serves an HTML docs page at /api/docs", async () => {
    const response = await app.request("/api/docs");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("swagger-ui");
    expect(html).toContain("swagger-ui-dist@5.30.2");
    expect(html).toContain(
      'integrity="sha512-eZpfl9qlKnbDvlJ2brfdx3nhlP1FMsA23w65motxKdYsUcfMcdO2bcLPr7mXhvyzmDZwuzYCJKrl/sEo1ditVQ=="',
    );
    expect(html).toContain(
      'integrity="sha512-S3rkmTECRsgtsysO1CAFdy2KElfxyyEKzzQ/GudcfJ09ahsZIM3G4uvtsgCXMXsnvmSJA3O9FWQtzFyq8QMuzA=="',
    );
  });
});
