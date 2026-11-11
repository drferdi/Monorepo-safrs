import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createBetaAccess } from "./access";
import { resolveAuthConfig } from "./config";

export function getAuthConfig() { return resolveAuthConfig(process.env); }

// Neither secrets nor full Clerk user records leave this server boundary.
export function getBetaAccess() {
  return createBetaAccess({
    config: getAuthConfig(),
    session: async () => (await auth()).userId,
    user: async (id) => {
      const user = await (await clerkClient()).users.getUser(id);
      const primary = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
      return { id: user.id, emailVerified: primary?.verification?.status === "verified", privateMetadata: user.privateMetadata };
    },
    writeConsent: async (id, consent) => {
      // The metadata endpoint merges this namespace, retaining suspension and unrelated records.
      await (await clerkClient()).users.updateUserMetadata(id, { privateMetadata: { sentrapediaBetaConsent: consent } });
    },
  });
}
