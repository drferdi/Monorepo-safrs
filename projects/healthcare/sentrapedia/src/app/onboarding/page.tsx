import { redirect } from "next/navigation";
import { AuthFrame, AccessNotice } from "../../components/auth/auth-frame";
import { ConsentForm } from "../../components/auth/consent-form";
import { getBetaAccess } from "../../lib/auth/server";

export const dynamic = "force-dynamic";

// The beta acknowledgement, asked once per policy version (src/lib/auth/policy.ts) of a signed-in doctor whose account is
// otherwise admitted. The server decides who sees it: a visitor goes to sign-in, an admitted doctor who already agreed goes
// straight to the workspace, and a disabled or unavailable identity sees the same notice the workspace shows.
export default async function Onboarding() {
  const access = await getBetaAccess().resolve();
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status === "allowed") redirect("/");
  if (access.status !== "consent-required") return <AccessNotice unavailable={access.status === "unavailable"}/>;
  return <AuthFrame title="Sebelum membuka workspace"><ConsentForm/></AuthFrame>;
}
