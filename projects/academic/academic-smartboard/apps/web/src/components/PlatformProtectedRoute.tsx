"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth.tsx";

/**
 * Gate for Platform Admin Console — mirror arsip PlatformProtectedRoute.
 * Server remains authority on /platform/*; this keeps UI honest.
 */
export function PlatformProtectedRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-(--space-4)">
        <p className="text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
          Memuat konsol platform…
        </p>
      </main>
    );
  }

  if (status === "unauthenticated" || !user) {
    return null;
  }

  if (!user.is_platform_admin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-(--space-4)">
        <div
          className="max-w-lg rounded-control border border-line-subtle bg-canvas p-(--space-5)"
          role="alert"
        >
          <p className="text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
            Akses Ditolak
          </p>
          <h1 className="mt-(--space-2) text-(length:--font-size-title-page) font-bold text-primary">
            Konsol Platform khusus administrator platform
          </h1>
          <p className="mt-(--space-2) text-(length:--font-size-body) text-secondary">
            Akun Anda tidak memiliki akses ke konsol markas platform.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
