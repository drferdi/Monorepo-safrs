import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><h1>Halaman tidak ditemukan.</h1><p>Alamat ini tidak ada di Sentrapedia. Workspace dan data lokal Anda tidak berubah.</p><Link href="/">Kembali ke workspace</Link></main>;
}
