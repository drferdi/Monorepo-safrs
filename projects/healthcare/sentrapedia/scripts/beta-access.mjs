import { createClerkClient } from "@clerk/backend";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { operateBetaAccess } from "./beta-access-core.mjs";

export async function runBetaAccess(args, environment = process.env, provider = secretKey => createClerkClient({ secretKey })) {
  try {
    if (args.length !== 2) throw new Error("arguments");
    const result = await operateBetaAccess({ action: args[0], userId: args[1], secretKey: environment.CLERK_SECRET_KEY, provider });
    console.log(`Beta access ${args[0]} complete; sessions revoked: ${result.revoked}.`);
    return 0;
  } catch {
    console.error("Beta access operation failed. Use disable|enable and an explicit Clerk user ID; check configuration and retry. No account was automatically approved.");
    return 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await runBetaAccess(process.argv.slice(2));
