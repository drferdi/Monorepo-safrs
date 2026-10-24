import { SignIn } from "@clerk/nextjs";
import { AuthFrame, AccessNotice } from "../../../components/auth/auth-frame";
import { getAuthConfig } from "../../../lib/auth/server";
export const dynamic = "force-dynamic";
export default function SignInPage() {
  if (getAuthConfig().mode !== "clerk") return <AccessNotice unavailable/>;
  return <AuthFrame title="Masuk ke workspace"><p>Masuk menggunakan email akun yang sudah terdaftar.</p><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/"/></AuthFrame>;
}
