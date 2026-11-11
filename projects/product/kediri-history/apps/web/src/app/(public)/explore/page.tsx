import Link from "next/link";
import type { ReactElement } from "react";

import { SiteFooter } from "../../../components/site-footer";
import { SiteNav } from "../../../components/site-nav";

export const metadata = {
  title: "Explore",
  description:
    "Tiga jalan masuk ke sejarah Kediri: kronologi, tempat, dan tema yang menyambung zaman.",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage(): ReactElement {
  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content">
        <header className="archive-header">
          <p className="eyebrow">Explore</p>
          <h1 className="title-page">Jelajahi Kediri</h1>
          <p className="lead measure">
            Untuk pengunjung yang tidak menginginkan perjalanan sinematik penuh,
            juga tidak menginginkan arsip ilmiah.
          </p>
        </header>
        <div className="card-grid">
          <article>
            <h2 className="record-title">Kronologi</h2>
            <p>Setiap peristiwa terverifikasi, berurut waktu.</p>
            <Link href="/explore/timeline">Buka kronologi</Link>
          </article>
          <article>
            <h2 className="record-title">Tempat</h2>
            <p>Di mana sejarah masih berdiri hari ini.</p>
            <Link href="/explore/places">Buka tempat</Link>
          </article>
          <article>
            <h2 className="record-title">Tema</h2>
            <p>Hubungan yang melintasi abad, bukan berurut waktu.</p>
            <Link href="/archive">Buka arsip</Link>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
