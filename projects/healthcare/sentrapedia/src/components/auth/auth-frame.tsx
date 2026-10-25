import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import logomark from "../../assets/sentraverse-mark.png";

const site = "https://sentrapedia.vercel.app/";

/** Where the doctor signs in. One column, one card, nothing between them and the form. */
export function AuthFrame({ title, alternative, children }: {
  title: string;
  alternative?: { href: string; prompt: string; label: string };
  children: ReactNode;
}) {
  return <main className="auth-page">
    <header className="auth-header">
      {/* The same lockup the website header renders: the neuron mark, then the wordmark in Inter 700.
          Taken from sentrapedia-wordmark-compact.svg, whose mark is byte-identical to this asset. */}
      <a className="auth-brand" href={site}>
        <Image src={logomark} alt="" width={22} height={17} unoptimized aria-hidden="true"/>
        <span>Sentrapedia</span>
      </a>
      <a className="auth-back" href={site}>Kembali ke website</a>
    </header>

    <section className="auth-card" aria-label={title}>
      <p className="auth-kicker">Workspace klinis <span>Beta</span></p>
      <h1>{title}</h1>
      <div className="auth-card-body">{children}</div>
      {alternative && <p className="auth-alternative">{alternative.prompt} <Link href={alternative.href}>{alternative.label}</Link></p>}
    </section>

    <footer className="auth-footer">
      <p>Keputusan klinis akhir tetap pada klinisi.</p>
      <p><a href={`${site}ketentuan/`}>Ketentuan</a> · <a href={`${site}privasi/`}>Privasi</a></p>
    </footer>
  </main>;
}

export function AccessNotice({ unavailable = false }: { unavailable?: boolean }) {
  return <AuthFrame title={unavailable ? "Layanan akses belum tersedia" : "Akses belum diizinkan"}>
    <p className="auth-notice" role="status">{unavailable
      ? "Konfigurasi atau layanan identitas belum tersedia. Coba kembali nanti."
      : "Akun ini belum memenuhi persyaratan beta atau aksesnya dinonaktifkan. Hubungi pengelola untuk pemeriksaan akses."}</p>
  </AuthFrame>;
}
