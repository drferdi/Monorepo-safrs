import { readRepoJson } from "./root.ts";

export type RolesSnapshot = {
  available: boolean;
  roles: Record<string, string[]>;
};

/** Role capabilities as the policy records them — the authority, not a summary. */
export async function readRoles(): Promise<RolesSnapshot> {
  try {
    const policy = await readRepoJson<{ roles?: Record<string, string[]> }>(
      ".safrs/policy.json",
    );
    if (!policy?.roles) {
      return { available: false, roles: {} };
    }
    return { available: true, roles: policy.roles };
  } catch {
    return { available: false, roles: {} };
  }
}
