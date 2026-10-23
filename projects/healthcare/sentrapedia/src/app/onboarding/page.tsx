import { redirect } from "next/navigation";
import { AuthFrame, AccessNotice } from "../../components/auth/auth-frame";
import { ConsentForm } from "../../components/auth/consent-form";
import { getBetaAccess } from "../../lib/auth/server";
export const dynamic = "force-dynamic";
export default async function Onboarding() {
  const access = await getBetaAccess().resolve(false);
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status !== "allowed") return <AccessNotice unavailable={access.status === "unavailable"}/>;
  return <AuthFrame title="Persetujuan penggunaan beta"><ConsentForm/></AuthFrame>;
}
