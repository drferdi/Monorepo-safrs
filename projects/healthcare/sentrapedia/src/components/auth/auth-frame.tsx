import type { ReactNode } from "react";
import Link from "next/link";

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className="auth-page"><section className="auth-panel" aria-label={title}>
    <a className="auth-brand" href="https://sentrapedia.vercel.app/">Sentrapedia</a>
    <p className="auth-eyebrow">Closed beta · data sintetis saja</p><h1>{title}</h1>
    {children}<nav aria-label="Akses beta"><Link href="/apply">Ajukan akses</Link><Link href="/sign-in">Masuk</Link></nav>
  </section></main>;
}

export function AccessNotice({ unavailable = false }: { unavailable?: boolean }) {
  return <AuthFrame title={unavailable ? "Layanan akses belum tersedia" : "Akses belum diizinkan"}>
    <p>{unavailable ? "Konfigurasi atau layanan identitas belum tersedia. Coba kembali nanti." : "Akun ini belum memenuhi persyaratan beta atau aksesnya dinonaktifkan. Hubungi pengelola untuk pemeriksaan akses."}</p>
  </AuthFrame>;
}
