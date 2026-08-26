import Link from "next/link";
import type { ReactElement } from "react";

import { SiteFooter } from "../../components/site-footer";
import { SiteNav } from "../../components/site-nav";

/**
 * Halaman 404 (UX Bible bagian 37). Ia tidak pernah mengarang isi pengganti.
 */
export default function NotFound(): ReactElement {
  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content">
        <header className="archive-header">
          <h1 className="title-page">Bagian sejarah ini tidak ada di sini</h1>
          <p className="lead measure">
            Tautannya mungkin berubah, atau catatannya belum diterbitkan.
          </p>
        </header>
        <p>
          <Link href="/journey">Mulai perjalanan</Link> ·{" "}
          <Link href="/archive">Cari di arsip</Link> ·{" "}
          <Link href="/explore/timeline">Buka kronologi</Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
