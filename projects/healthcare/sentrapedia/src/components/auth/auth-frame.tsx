import type { ReactNode } from "react";
import Link from "next/link";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} />
  </svg>;
}

function WorkspaceSchematic() {
  return <div className="auth-schematic" aria-hidden="true">
    <div className="auth-schematic-caption"><span>PEMIKIRAN, TERHUBUNG.</span><span>FIG. 01</span></div>
    <svg viewBox="0 0 640 284" fill="none" focusable="false">
      <path className="auth-diagram-guide" d="M20 40h600M20 244h600M56 18v248M584 18v248" />
      <g className="auth-diagram-orbit">
        <ellipse cx="332" cy="144" rx="244" ry="100" />
        <ellipse cx="332" cy="144" rx="170" ry="127" transform="rotate(-16 332 144)" />
      </g>
      <g className="auth-diagram-sheet auth-diagram-sheet-back">
        <path d="M252 47h190v180H252z" />
        <path d="M266 66h162M266 80h92" />
      </g>
      <g className="auth-diagram-sheet auth-diagram-sheet-front">
        <path d="M224 64h190v180H224z" />
        <path className="auth-diagram-ink" d="M246 88h55M246 102h114" />
        <path className="auth-diagram-rule" d="M246 126h146M246 146h146M246 166h146M246 186h99" />
        <path className="auth-diagram-accent" d="m368 207 6 6 13-15" />
        <path className="auth-diagram-rule" d="M246 218h69" />
      </g>
      <path className="auth-diagram-connector" d="M110 113h75v33h39M414 145h55V81h49M414 189h42v41h62" pathLength="1" />
      <g className="auth-diagram-node auth-diagram-node-first">
        <path d="M24 83h135v55H24z" />
        <path className="auth-diagram-accent" d="M40 100h12v12H40z" />
        <text x="64" y="111">Konteks</text>
        <text className="auth-diagram-small" x="40" y="126">SATUKAN INFORMASI</text>
      </g>
      <g className="auth-diagram-node auth-diagram-node-second">
        <path d="M487 49h129v61H487z" />
        <path className="auth-diagram-accent" d="M502 65h14m-14 5h10m-10 5h14" />
        <text x="529" y="76">Catatan</text>
        <text className="auth-diagram-small" x="502" y="95">SUSUN PEMIKIRAN</text>
      </g>
      <g className="auth-diagram-node auth-diagram-node-third">
        <path d="M474 201h142v55H474z" />
        <path className="auth-diagram-accent" d="M488 219h14m-5-5 5 5-5 5" />
        <text x="512" y="224">Langkah berikutnya</text>
        <text className="auth-diagram-small" x="488" y="242">TINJAU & LANJUTKAN</text>
      </g>
      <g className="auth-diagram-points"><circle cx="186" cy="146" r="4" /><circle cx="469" cy="145" r="4" /><circle cx="456" cy="230" r="4" /></g>
    </svg>
    <div className="auth-schematic-bottom"><span>ILUSTRASI ALUR WORKSPACE</span><span>BUKAN DATA PASIEN</span></div>
  </div>;
}

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return <main className="auth-page">
    <div className="auth-layout">
      <header className="auth-header">
        <a className="auth-brand" href="https://sentrapedia.vercel.app/">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false"><path d="M23 7H10v9h12v9H8M16 2v28" /></svg>
          <span>Sentrapedia<span className="auth-brand-period">.</span></span>
        </a>
        <a className="auth-back" href="https://sentrapedia.vercel.app/">Kembali ke website <Arrow diagonal /></a>
      </header>

      <div className="auth-canvas">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <p className="auth-eyebrow"><span className="auth-beta-mark" /> CLINICAL WORKSPACE <span className="auth-edition">/ BETA</span></p>
          <h1 id="auth-intro-title">Ruang untuk<br />pemikiran <span>klinis.</span></h1>
          <p className="auth-intro-copy">Dari konteks yang tersebar menjadi pemikiran yang terarah. Satu ruang untuk menyusun catatan dan meninjau langkah berikutnya.</p>
          <p className="auth-synthetic"><span aria-hidden="true">↳</span> Ruang evaluasi. Data sintetis saja.</p>
        </section>

        <section className="auth-panel" aria-label={title}>
          <div className="auth-panel-index"><span>AKSES WORKSPACE</span><span aria-hidden="true">01 / 03</span></div>
          <div className="auth-panel-body">
            <span className="auth-entry-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" focusable="false"><path d="M18 7h8v20h-8M5 17h15m-6-6 6 6-6 6" /></svg></span>
            <p className="auth-panel-eyebrow">SELAMAT DATANG DI SENTRAPEDIA</p>
            <h2>{title}</h2>
            <div className="auth-panel-content">{children}</div>
            <nav className="auth-navigation" aria-label="Akses beta">
              <Link href="/sign-up">Daftar <Arrow /></Link>
              <Link href="/sign-in">Masuk <Arrow /></Link>
            </nav>
            <p className="auth-panel-note">Daftar dengan email pribadi, lalu masuk ke workspace.</p>
          </div>
          <div className="auth-panel-foot"><span className="auth-beta-mark" /><span>Hanya untuk evaluasi dengan kasus sintetis.</span></div>
        </section>

        <WorkspaceSchematic />
      </div>

      <footer className="auth-footer">
        <p>Dirancang untuk alur pikir klinisi.<span>Sentra · Sentrapedia</span></p>
        <ol className="auth-journey" aria-label="Tahapan akses beta">
          <li><span>01</span> Daftar</li>
          <li><span>02</span> Login</li>
          <li><span>03</span> Akses workspace</li>
        </ol>
      </footer>
    </div>
  </main>;
}

export function AccessNotice({ unavailable = false }: { unavailable?: boolean }) {
  return <AuthFrame title={unavailable ? "Layanan akses belum tersedia" : "Akses belum diizinkan"}>
    <div className="auth-notice" role="status" data-state={unavailable ? "unavailable" : "denied"}>
      <span className="auth-notice-symbol" aria-hidden="true">!</span>
      <p>{unavailable ? "Konfigurasi atau layanan identitas belum tersedia. Coba kembali nanti." : "Akun ini belum memenuhi persyaratan beta atau aksesnya dinonaktifkan. Hubungi pengelola untuk pemeriksaan akses."}</p>
    </div>
  </AuthFrame>;
}
