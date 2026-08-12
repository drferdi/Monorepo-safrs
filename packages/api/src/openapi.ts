import {
  apiErrorSchema,
  createDemoInputSchema,
  demoSchema,
} from "@safrs/schemas";
import { z } from "zod";

/**
 * Build an OpenAPI 3.1 document for the golden-path API from the Zod schemas
 * in `@safrs/schemas`. Uses Zod 4's native `z.toJSONSchema(...)` (draft
 * 2020-12) so the documentation cannot drift from the validation contracts.
 */
export function buildOpenApiDocument() {
  const components = {
    schemas: {
      ApiError: stripSchemaMeta(apiErrorSchema),
      Demo: stripSchemaMeta(demoSchema),
      CreateDemoInput: stripSchemaMeta(createDemoInputSchema),
    },
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "SAFRS Golden Path API",
      version: "0.0.0",
      description: "Schema-driven API documentation for the golden-path demo.",
    },
    paths: {
      "/api/health": {
        get: {
          summary: "Health check",
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { status: { type: "string", enum: ["ok"] } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/demos": {
        get: {
          summary: "List demos",
          responses: {
            "200": {
              description: "A list of demo records",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Demo" },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Create a demo record",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateDemoInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Demo" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ApiError" },
                },
              },
            },
          },
        },
      },
    },
    components,
  };
}

/** Drop the non-OpenAPI `$schema` key Zod emits, keeping the JSON Schema body. */
function stripSchemaMeta(schema: z.ZodTypeAny) {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema);
  return jsonSchema;
}

/**
 * Minimal Swagger UI page. Loads the interactive UI from a CDN and points it
 * at the local `/api/openapi.json` document. Safe for local development.
 */
export function openApiDocsHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SAFRS Golden Path API — Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/api/openapi.json",
          dom_id: "#swagger-ui",
        });
      };
    </script>
  </body>
</html>`;
}
