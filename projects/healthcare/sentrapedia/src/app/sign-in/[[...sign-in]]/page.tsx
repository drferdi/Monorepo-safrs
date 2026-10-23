import { SignIn } from "@clerk/nextjs";
import { AuthFrame, AccessNotice } from "../../../components/auth/auth-frame";
import { getAuthConfig } from "../../../lib/auth/server";
export const dynamic = "force-dynamic";
export default function SignInPage() {
  if (getAuthConfig().mode !== "clerk") return <AccessNotice unavailable/>;
  return <AuthFrame title="Masuk ke workspace"><p>Gunakan email yang sudah diundang. Verifikasi email dan sesi dikelola oleh Clerk.</p><SignIn routing="path" path="/sign-in" signUpUrl="/apply" forceRedirectUrl="/"/></AuthFrame>;
}
