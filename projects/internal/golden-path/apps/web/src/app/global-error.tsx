"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body>
        <main className="recovery-panel">
          <h1>Aplikasi perlu dimuat ulang</h1>
          <p>
            Terjadi kendala saat memulai halaman. Coba lagi setelah layanan
            lokal siap.
          </p>
          <button type="button" onClick={reset}>
            Muat ulang
          </button>
        </main>
      </body>
    </html>
  );
}
