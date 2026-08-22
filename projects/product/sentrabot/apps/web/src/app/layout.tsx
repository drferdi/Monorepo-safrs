import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sentra Bot",
  description:
    "Agen otonom untuk Indonesia — daftar, deploy, dan jalankan dengan BYOK.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
