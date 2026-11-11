import Link from "next/link";
import type { ReactElement } from "react";

export function SiteFooter(): ReactElement {
  return (
    <footer className="site-footer">
      <nav aria-label="Navigasi sekunder">
        <ul>
          <li>
            <Link href="/about">Tentang</Link>
          </li>
          <li>
            <Link href="/methodology">Metodologi</Link>
          </li>
          <li>
            <Link href="/rights">Hak dan kredit</Link>
          </li>
          <li>
            <Link href="/accessibility">Aksesibilitas</Link>
          </li>
        </ul>
      </nav>
      <p className="archive-label">Djojo ing bojo</p>
    </footer>
  );
}
