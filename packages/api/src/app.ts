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
    findMany: (args?: {
      orderBy?: { createdAt: "desc" };
    }) => Promise<DemoRecord[]>;
  };
};

type ApiEnvironment = {
  Variables: {
    correlationId: string;
  };
};

type CreateAppOptions = {
  demoWriteLimit?: number;
  environment?: "development" | "production" | "test";
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

function createRoutes({
  demoWriteLimit = 60,
  environment = process.env.NODE_ENV === "production"
    ? "production"
    : "development",
  getStore = defaultStore,
}: CreateAppOptions = {}) {
  const demoWrites = createFixedWindowLimiter(demoWriteLimit);

  return new Hono<ApiEnvironment>()
    .basePath("/api")
    .use("*", async (context, next) => {
      const correlationId = crypto.randomUUID();

      context.set("correlationId", correlationId);
      context.header(
        "content-security-policy",
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none';",
      );
      context.header(
        "permissions-policy",
        "camera=(), geolocation=(), microphone=()",
      );
      context.header("referrer-policy", "no-referrer");
      context.header("x-content-type-options", "nosniff");
      context.header("x-frame-options", "DENY");
      await next();
      context.header("x-correlation-id", correlationId);
    })
    .use("*", telemetryMiddleware())
    .get("/health", (context) => context.json({ status: "ok" as const }, 200))
    .get("/openapi.json", (context) => context.json(buildOpenApiDocument()))
    .get("/docs", (context) => context.html(openApiDocsHtml()))
    .get("/demos", async (context) => {
      const store = await getStore();
      const demos = await store.demo.findMany({
        orderBy: { createdAt: "desc" },
      });

      return context.json(demos.map(serializeDemo), 200);
    })
    .post(
      "/demos",
      async (context, next) => {
        if (environment === "production") {
          return context.body(null, 404);
        }
        if (!demoWrites.take()) {
          context.header("retry-after", "60");
          return context.body(null, 429);
        }
        await next();
      },
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

function createFixedWindowLimiter(limit: number) {
  let count = 0;
  let startedAt = Date.now();
  const windowMs = 60_000;

  return {
    take() {
      const now = Date.now();
      if (now - startedAt >= windowMs) {
        count = 0;
        startedAt = now;
      }
      if (count >= limit) {
        return false;
      }
      count += 1;
      return true;
    },
  };
}

type ApiRoutes = ReturnType<typeof createRoutes>;

export type AppType = ApplyGlobalResponse<ApiRoutes, GlobalErrorResponses>;

export function createApp(options: CreateAppOptions = {}): AppType {
  return createRoutes(options) as AppType;
}

export const app = createApp();
