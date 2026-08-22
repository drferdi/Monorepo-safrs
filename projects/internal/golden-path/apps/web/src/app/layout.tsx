import { fontMono, fontSans } from "@sentra/token/fonts";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  description: "Pemeriksaan kesiapan alur SAFRS.",
  title: "Kesiapan SAFRS",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${fontSans.variable} ${fontMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
