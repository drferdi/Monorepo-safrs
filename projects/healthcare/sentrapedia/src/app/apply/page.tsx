import { Waitlist } from "@clerk/nextjs";
import { AuthFrame, AccessNotice } from "../../components/auth/auth-frame";
import { getAuthConfig } from "../../lib/auth/server";
export const dynamic = "force-dynamic";
export default function Apply() {
  if (getAuthConfig().mode !== "clerk") return <AccessNotice unavailable/>;
  return <AuthFrame title="Ajukan akses beta"><p>Ajukan email pribadi. Pengelola meninjau permintaan sebelum mengirim undangan registrasi. Belum disetujui berarti belum dapat masuk.</p><Waitlist signInUrl="/sign-in"/></AuthFrame>;
}
