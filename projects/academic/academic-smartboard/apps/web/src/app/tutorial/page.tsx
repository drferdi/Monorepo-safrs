"use client";

import { BookOpen } from "lucide-react";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";

const SECTIONS = [
  {
    id: "pengenalan",
    label: "01 · Pengenalan",
    title: "Apa itu Sentra Tutoring Management Smartboard?",
    body: (
      <>
        <p>
          Ini adalah <strong>sistem operasional bimbel</strong>: satu tempat
          untuk mengatur jadwal, sesi belajar, absensi, evaluasi, honor
          pengajar, dan payroll. Tujuannya sederhana — semua data sesi rapi,
          bisa dilacak, dan siap diverifikasi.
        </p>
        <p className="mt-3 text-sm text-secondary">
          Alur utama: Terjadwal → Berlangsung → Menunggu Evaluasi → Menunggu
          Verifikasi → Terverifikasi.
        </p>
      </>
    ),
  },
  {
    id: "login",
    label: "02 · Masuk ke sistem",
    title: "Langkah login",
    body: (
      <ol className="list-decimal space-y-2 pl-5">
        <li>Buka halaman login.</li>
        <li>
          Isi <strong>Email</strong> dan <strong>Kata sandi</strong> (minimal 6
          karakter).
        </li>
        <li>
          Klik <strong>Masuk</strong>.
        </li>
        <li>
          Jika berhasil, Anda langsung masuk ke <strong>Smartboard</strong>.
        </li>
      </ol>
    ),
  },
  {
    id: "smartboard",
    label: "03 · Smartboard",
    title: "Beranda operasional Anda",
    body: (
      <>
        <p>
          Smartboard adalah halaman utama setelah login. Baca dari atas ke
          bawah: <strong>01 Perlu Tindakan</strong>,{" "}
          <strong>02 Rantai Sesi Hari Ini</strong>, lalu KPI dan indikator
          operasional.
        </p>
        <p className="mt-3 text-sm text-secondary">
          Kak Kayyisa tersedia sebagai kolom panduan di Smartboard (atau FAB di
          halaman lain). Untuk Finance, kolom kanan menampilkan kesiapan
          payroll.
        </p>
      </>
    ),
  },
  {
    id: "navigasi",
    label: "04 · Menu kiri (navigasi)",
    title: "Cara berpindah halaman",
    body: (
      <p>
        Menu dikelompokkan (Utama, Operasional, Akademik, Pengajar, Keuangan,
        Laporan, Pengaturan). Yang terlihat bergantung pada{" "}
        <strong>peran</strong> Anda.
      </p>
    ),
  },
  {
    id: "sesi",
    label: "05 · Sesi Pembelajaran",
    title: "Pusat data operasional",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Melihat informasi jadwal, pengajar, dan format kelas</li>
        <li>Mengisi absensi murid</li>
        <li>Menulis / meninjau evaluasi</li>
        <li>
          Memverifikasi sesi (peran tertentu) agar masuk perhitungan honor
        </li>
      </ul>
    ),
  },
  {
    id: "tips",
    label: "06 · Tips kerja harian",
    title: "Agar operasional tetap rapi",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Pagi</strong> — buka Smartboard; cek kelas hari ini dan Perlu
          Tindakan.
        </li>
        <li>
          <strong>Saat sesi</strong> — pastikan absensi terisi; jangan menunda
          evaluasi.
        </li>
        <li>
          <strong>Akhir hari</strong> — selesaikan evaluasi & minta verifikasi.
        </li>
        <li>
          <strong>Mingguan</strong> — cek Rekap Honor / Payroll.
        </li>
      </ul>
    ),
  },
] as const;

function TutorialView() {
  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="PND"
        eyebrow="Panduan pengguna"
        title="Tutorial Penggunaan"
        lede="Ringkas untuk Owner, Admin, Pengajar, Finance, dan Orang Tua. Gambar aset arsip belum diikutkan di capsule ini."
      />

      <nav aria-label="Daftar isi tutorial" className="space-y-(--space-2)">
        <p className="text-xs tracking-wide text-secondary uppercase">
          Daftar isi
        </p>
        <div className="flex flex-wrap gap-(--space-2)">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1 rounded-control border border-line-subtle px-(--space-3) py-(--space-2) text-sm text-primary hover:bg-surface"
            >
              <BookOpen size={12} aria-hidden />
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-(--space-4)" data-testid="tutorial-page">
        {SECTIONS.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="rounded-control border border-line-subtle bg-canvas p-(--space-4)"
          >
            <p className="text-xs text-secondary">{s.label}</p>
            <h2 className="mt-1 text-lg font-semibold text-primary">
              {s.title}
            </h2>
            <div className="mt-(--space-3) text-sm text-primary">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function TutorialPage() {
  return (
    <ProtectedRoute
      roles={[
        "owner",
        "admin_akademik",
        "tentor",
        "murid_ortu",
        "finance",
        "content_manager",
      ]}
    >
      <AppShell>
        <TutorialView />
      </AppShell>
    </ProtectedRoute>
  );
}
