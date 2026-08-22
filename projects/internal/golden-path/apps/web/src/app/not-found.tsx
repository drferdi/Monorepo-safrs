import Link from "next/link";

export default function NotFound() {
  return (
    <main className="recovery-panel">
      <h1>Halaman tidak ditemukan</h1>
      <p>Gunakan meja kesiapan untuk kembali ke alur utama.</p>
      <Link href="/">Kembali ke kesiapan</Link>
    </main>
  );
}
