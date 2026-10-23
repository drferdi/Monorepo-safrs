import { SignUp } from "@clerk/nextjs";
import { AuthFrame, AccessNotice } from "../../../components/auth/auth-frame";
import { getAuthConfig } from "../../../lib/auth/server";
export const dynamic = "force-dynamic";
export default function SignUpPage() {
  if (getAuthConfig().mode !== "clerk") return <AccessNotice unavailable/>;
  return <AuthFrame title="Terima undangan beta"><p>Registrasi memerlukan undangan yang disetujui pengelola. Persetujuan legal dan verifikasi email diproses oleh Clerk, dilanjutkan persetujuan beta.</p><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/onboarding"/></AuthFrame>;
}
