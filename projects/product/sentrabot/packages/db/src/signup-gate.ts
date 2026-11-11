import { parseAllowlist, signupPolicyFromEnv } from "@sentrabot/core";
import type { SignupPolicyEnv } from "./bootstrap-user.js";
import type { PrismaClient } from "./client.js";

export async function resolveSignupPolicy(
  prisma: Pick<PrismaClient, "deploymentSettings">,
  env: SignupPolicyEnv,
): Promise<{ enabled: boolean; allowlist: string[] }> {
  const settings = await prisma.deploymentSettings.findUnique({
    where: { id: "default" },
    select: { signupsEnabled: true, signupAllowlist: true, signupPolicyInitialized: true },
  });
  if (settings?.signupPolicyInitialized) {
    return {
      enabled: settings.signupsEnabled,
      allowlist: parseAllowlist(settings.signupAllowlist),
    };
  }
  return signupPolicyFromEnv(env);
}
