import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Sentrapedia · Workspace Clinical", description: "Workspace Clinical untuk pertanyaan, catatan, dan langkah perawatan berikutnya. Demonstrasi lokal Sentrapedia." };

export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="id"><body>{children}</body></html>; }
