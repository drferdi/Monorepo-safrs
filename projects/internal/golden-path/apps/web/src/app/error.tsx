"use client";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="recovery-panel">
      <h1>Pemeriksaan belum dapat ditampilkan</h1>
      <p>
        Periksa koneksi lokal, lalu coba lagi. Detail teknis tidak ditampilkan
        di halaman ini.
      </p>
      <button type="button" onClick={reset}>
        Coba lagi
      </button>
    </main>
  );
}
