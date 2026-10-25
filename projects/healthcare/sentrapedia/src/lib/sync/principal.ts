import { validUserId } from "../auth/policy";

// The schema accepts only Clerk's own id shape (db/migrations/0001_account_and_templates.sql). The local auth
// mode yields the literal "local-development", which that constraint refuses, so it is mapped to one reserved
// id instead of loosening the constraint. That mode already requires loopback and a development NODE_ENV
// (src/lib/auth/config.ts), so this principal cannot appear on a deployed instance.
export const localDevelopmentPrincipal = "user_localdevelopment";

export function syncPrincipal(authUserId: string): string | null {
  if (authUserId === "local-development") return localDevelopmentPrincipal;
  return validUserId(authUserId) ? authUserId : null;
}
