import { createSentraBotAuth, createSentraBotAuthConfig } from "@safrs/auth";
import { database } from "@safrs/database";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;
const e2eSeedMode =
  process.env.NODE_ENV !== "production" &&
  process.env.SENTRABOT_E2E_SEED === "1";

if (!secret || !baseURL) {
  throw new Error("BETTER_AUTH_SECRET and BETTER_AUTH_URL are required");
}

export const authConfig = createSentraBotAuthConfig({
  secret,
  baseURL,
  trustedOrigins: [baseURL],
  signupPolicy: {
    mode: e2eSeedMode ? "open" : "closed",
    allowlist: [],
    requireVerifiedEmail: !e2eSeedMode,
  },
});

export const auth = createSentraBotAuth(authConfig, database);
