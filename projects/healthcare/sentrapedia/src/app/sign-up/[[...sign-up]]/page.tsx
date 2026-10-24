import { SignUp } from "@clerk/nextjs";
import { AuthFrame, AccessNotice } from "../../../components/auth/auth-frame";
import { getAuthConfig } from "../../../lib/auth/server";
export const dynamic = "force-dynamic";
export default function SignUpPage() {
  if (getAuthConfig().mode !== "clerk") return <AccessNotice unavailable/>;
  return <AuthFrame title="Daftar akun"><p>Buat akun dengan email pribadi. Verifikasi email dan persetujuan ketentuan diselesaikan saat registrasi.</p><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/"/></AuthFrame>;
}
