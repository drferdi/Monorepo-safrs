"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "../lib/auth.tsx";
import type { Role } from "../lib/nav.ts";

/**
 * roles undefined/empty = any authenticated user (arsip: /sesi, /evaluasi).
 * roles populated = must match (arsip ProtectedRoute).
 */
export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated" || !user) {
    return null;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-(--space-4)">
        <p
          role="alert"
          className="text-(length:--font-size-body) text-critical"
        >
          Akses ditolak
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
