import Link from "next/link";
import type { ReactElement } from "react";

/**
 * Navigasi tetap kecil meskipun sistem pengetahuannya besar (UX Bible bagian
 * 3). Tidak ada mega-menu, tidak ada carousel berita.
 */
export function SiteNav(): ReactElement {
  return (
    <nav className="site-nav" aria-label="Navigasi utama">
      <Link href="/" className="wordmark">
        Kediri
      </Link>
      <ul>
        <li>
          <Link href="/journey">Journey</Link>
        </li>
        <li>
          <Link href="/explore/timeline">Explore</Link>
        </li>
        <li>
          <Link href="/archive">Arsip</Link>
        </li>
        <li>
          <Link href="/sources">Sumber</Link>
        </li>
      </ul>
    </nav>
  );
}
