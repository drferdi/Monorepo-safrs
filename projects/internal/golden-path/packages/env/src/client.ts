import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

type ClientEnvironment = Pick<NodeJS.ProcessEnv, "NEXT_PUBLIC_APP_URL">;

const clientSchema = {
  NEXT_PUBLIC_APP_URL: z.url().optional(),
};

export function createClientEnv(environment: ClientEnvironment) {
  return createEnv({
    client: clientSchema,
    runtimeEnv: {
      NEXT_PUBLIC_APP_URL: environment.NEXT_PUBLIC_APP_URL,
    },
    emptyStringAsUndefined: true,
  });
}

export const clientEnv = createClientEnv({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
