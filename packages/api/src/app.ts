import { zValidator } from "@hono/zod-validator";
import { createDemoInputSchema, demoSchema } from "@safrs/schemas";
import { telemetryMiddleware } from "@safrs/telemetry";
import { type Context, Hono } from "hono";
import type { ApplyGlobalResponse } from "hono/client";
import { type ApiError, internalError, validationError } from "./error.ts";
import { buildOpenApiDocument, openApiDocsHtml } from "./openapi.ts";

type DemoRecord = {
  createdAt: Date;
  id: string;
  name: string;
};

export type DemoStore = {
  demo: {
    create: (args: { data: { name: string } }) => Promise<DemoRecord>;
    findMany: () => Promise<DemoRecord[]>;
  };
};

type ApiEnvironment = {
  Variables: {
    correlationId: string;
  };
};

type CreateAppOptions = {
  getStore?: () => Promise<DemoStore>;
};

type GlobalErrorResponses = {
  500: {
    json: ApiError;
  };
};

async function defaultStore(): Promise<DemoStore> {
  const { database } = await import("@safrs/database");

  return database;
}

function serializeDemo(demo: DemoRecord) {
  return demoSchema.parse({
    createdAt: demo.createdAt.toISOString(),
    id: demo.id,
    name: demo.name,
  });
}

function createRoutes({ getStore = defaultStore }: CreateAppOptions = {}) {
  return new Hono<ApiEnvironment>()
    .basePath("/api")
    .use("*", async (context, next) => {
      const correlationId = crypto.randomUUID();

      context.set("correlationId", correlationId);
      await next();
      context.header("x-correlation-id", correlationId);
    })
    .use("*", telemetryMiddleware())
    .get("/health", (context) => context.json({ status: "ok" as const }, 200))
    .get("/openapi.json", (context) => context.json(buildOpenApiDocument()))
    .get("/docs", (context) => context.html(openApiDocsHtml()))
    .get("/demos", async (context) => {
      const store = await getStore();
      const demos = await store.demo.findMany();

      return context.json(demos.map(serializeDemo), 200);
    })
    .post(
      "/demos",
      zValidator("json", createDemoInputSchema, (result, context) => {
        if (result.success) {
          return;
        }

        return context.json(
          validationError(
            result.error,
            (context as Context<ApiEnvironment>).get("correlationId"),
          ),
          400,
        );
      }),
      async (context) => {
        const { name } = context.req.valid("json");
        const store = await getStore();
        const demo = await store.demo.create({ data: { name } });

        return context.json(serializeDemo(demo), 201);
      },
    )
    .onError((_error, context) =>
      context.json(internalError(context.get("correlationId")), 500),
    );
}

type ApiRoutes = ReturnType<typeof createRoutes>;

export type AppType = ApplyGlobalResponse<ApiRoutes, GlobalErrorResponses>;

export function createApp(options: CreateAppOptions = {}): AppType {
  return createRoutes(options) as AppType;
}

export const app = createApp();
