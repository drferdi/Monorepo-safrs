import Link from "next/link";
import type { ReactElement } from "react";

import { SiteFooter } from "../../../components/site-footer";
import { SiteNav } from "../../../components/site-nav";

export const metadata = {
  title: "Tentang",
  description:
    "Tentang proyek sejarah digital Kota Kediri: tujuan, cakupan, dan cara kerjanya.",
  alternates: { canonical: "/about" },
};

export default function AboutPage(): ReactElement {
  return (
    <div className="shell">
      <SiteNav />
      <main id="historical-content" className="section-stack">
        <header className="archive-header">
          <p className="eyebrow">Tentang</p>
          <h1 className="title-page">Sebuah kota yang terus ditulis</h1>
        </header>

        <section className="measure">
          <p className="prose">
            Kediri bukan kisah satu kerajaan yang naik lalu jatuh. Ia kisah
            sebuah tempat yang berkali-kali berganti bentuk tanpa kehilangan
            identitasnya.
          </p>
          <p className="prose">
            Situs ini punya dua wajah yang sama pentingnya. Journey menjawab
            mengapa sejarah ini berarti. Arsip menjawab dari mana kita tahu.
            Pengunjung berpindah di antara keduanya tanpa kehilangan tempatnya.
          </p>
          <p className="prose">
            Orang yang hidup di sini pada tahun 879 tidak dapat tahu Kediri akan
            menjadi apa. Tidak seorang pun pada 2026 tahu peristiwa hari ini
            yang akan tampak menentukan bagi pembaca sejarah Kediri pada 2126.
          </p>
          <p>
            <Link href="/methodology">Bagaimana kami memutuskan</Link> ·{" "}
            <Link href="/rights">Hak dan kredit</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
