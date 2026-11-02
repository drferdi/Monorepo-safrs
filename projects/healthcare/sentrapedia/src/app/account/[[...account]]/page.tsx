import { UserProfile } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import logomark from "../../../assets/sentraverse-mark.png";
import { AccessNotice } from "../../../components/auth/auth-frame";
import { getAuthConfig, getBetaAccess } from "../../../lib/auth/server";

export const dynamic = "force-dynamic";

// The doctor's own account page (tier 2 of the 2026-11-02 auth audit): email, passkeys, active devices and deletion are
// Clerk's profile widget, full page rather than a modal, so it has room beside the workspace. A signed-in doctor reaches it
// before the beta acknowledgement too, so an account can be closed without first agreeing to anything.
export default async function Account() {
  if (getAuthConfig().mode !== "clerk") return <AccessNotice unavailable/>;
  const access = await getBetaAccess().resolve(false);
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status !== "allowed") return <AccessNotice unavailable={access.status === "unavailable"}/>;
  return <main className="auth-page account-page">
    <header className="auth-header">
      <Link className="auth-brand" href="/"><Image src={logomark} alt="" width={22} height={17} unoptimized aria-hidden="true"/><span>Sentrapedia</span></Link>
      <Link className="auth-back" href="/">Kembali ke workspace</Link>
    </header>
    <section className="account-stage" aria-label="Pengaturan akun"><UserProfile routing="path" path="/account"/></section>
    <footer className="auth-footer"><p>Architected and built by dr. Ferdi Iskandar</p></footer>
  </main>;
}
