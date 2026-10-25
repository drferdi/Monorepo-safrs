import type { Metadata } from "next";
import { Geist, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./auth.css";
import { ClerkProvider } from "@clerk/nextjs";
import { getAuthConfig } from "../lib/auth/server";

// Chief's type pair: Plus Jakarta Sans for titles, Geist for everything else.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
// Inter is the brand face: apps/site sets every page in it, and the official wordmark SVG embeds it at
// weight 700. The admission pages use it so the doctor crosses from the website without a change of voice.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "Sentrapedia · Workspace Clinical", description: "Workspace Clinical untuk pertanyaan, catatan, dan langkah perawatan berikutnya. Demonstrasi lokal Sentrapedia." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getAuthConfig();
  return (
    <html lang="id" className={`${geist.variable} ${jakarta.variable} ${inter.variable}`}>
      <body>
        {config.mode === "clerk" ? <ClerkProvider publishableKey={config.publishableKey} signInUrl="/sign-in" signUpUrl="/sign-up" signInForceRedirectUrl="/" signUpForceRedirectUrl="/">{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
