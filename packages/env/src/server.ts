import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type ServerEnvironment = Partial<
  Record<
    | "DATABASE_URL"
    | "NODE_ENV"
    | "APP_URL"
    | "STRIPE_SECRET_KEY"
    | "STRIPE_WEBHOOK_SECRET",
    string | undefined
  >
>;

const serverSchema = {
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  APP_URL: z.url(),
  /* Stripe capability pack — optional so the baseline builds without keys.
     Prefix checks catch swapped or truncated values early. */
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
};

export function createServerEnv(environment: ServerEnvironment) {
  return createEnv({
    server: serverSchema,
    runtimeEnv: {
      DATABASE_URL: environment.DATABASE_URL,
      NODE_ENV: environment.NODE_ENV,
      APP_URL: environment.APP_URL,
      STRIPE_SECRET_KEY: environment.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: environment.STRIPE_WEBHOOK_SECRET,
    },
    emptyStringAsUndefined: true,
    onValidationError: (issues) => {
      const variableNames = issues
        .map((issue) =>
          issue.path
            ?.map((segment) =>
              typeof segment === "string" || typeof segment === "number"
                ? String(segment)
                : "",
            )
            .filter(Boolean)
            .join("."),
        )
        .filter((name): name is string => Boolean(name))
        .sort()
        .join(", ");

      throw new Error(`Invalid environment variables: ${variableNames}`);
    },
  });
}

export const serverEnv = createServerEnv({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
});
