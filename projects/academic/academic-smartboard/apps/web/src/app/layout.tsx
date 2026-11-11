import { fontMono, fontSans } from "@sentra/token/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth.tsx";
import { Providers } from "./providers.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sentra Smartboard", template: "%s | Sentra Smartboard" },
  description: "Platform bimbingan belajar multi-tenant El-Kayyisa",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
