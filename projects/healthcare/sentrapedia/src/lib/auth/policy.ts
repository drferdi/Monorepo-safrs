export const betaPolicyVersion = "sentrapedia-beta-v1";
export type BetaConsent = { version: string; acceptedAt: string; syntheticOnly: true };
export type BetaUser = { id: string; emailVerified: boolean; privateMetadata: Record<string, unknown> };
export type AccessResult = { status: "allowed"; userId: string } | { status: "signed-out" | "consent-required" | "disabled" | "unavailable" };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function validUserId(value: string): boolean { return /^user_[A-Za-z0-9]{1,120}$/.test(value); }

export function assessBetaUser(user: BetaUser, requireConsent: boolean): AccessResult {
  if (!user.emailVerified || !isRecord(user.privateMetadata)) return { status: "disabled" };
  const access = user.privateMetadata.sentrapediaBetaAccess;
  if (access !== undefined && (!isRecord(access) || access.disabled !== false)) return { status: "disabled" };
  const consent = user.privateMetadata.sentrapediaBetaConsent;
  const currentConsent = isRecord(consent) && consent.version === betaPolicyVersion && consent.syntheticOnly === true && typeof consent.acceptedAt === "string" && Number.isFinite(Date.parse(consent.acceptedAt));
  if (requireConsent && !currentConsent) return { status: "consent-required" };
  return { status: "allowed", userId: user.id };
}
