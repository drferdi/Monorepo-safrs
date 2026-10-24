import type { Metadata } from "next";
import { Geist, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./auth.css";
import { ClerkProvider } from "@clerk/nextjs";
import { getAuthConfig } from "../lib/auth/server";

// Chief's type pair: Plus Jakarta Sans for titles, Geist for everything else.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = { title: "Sentrapedia · Workspace Clinical", description: "Workspace Clinical untuk pertanyaan, catatan, dan langkah perawatan berikutnya. Demonstrasi lokal Sentrapedia." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getAuthConfig();
  return (
    <html lang="id" className={`${geist.variable} ${jakarta.variable}`}>
      <body>
        {config.mode === "clerk" ? <ClerkProvider publishableKey={config.publishableKey} signInUrl="/sign-in" signUpUrl="/sign-up" signInForceRedirectUrl="/" signUpForceRedirectUrl="/">{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
