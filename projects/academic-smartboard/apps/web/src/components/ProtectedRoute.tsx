"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "../lib/auth.tsx";
import type { Role } from "../lib/nav.ts";

export function ProtectedRoute({
  roles,
  children,
}: {
  roles: Role[];
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

  if (status === "unauthenticated") {
    return null;
  }

  if (!roles.includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-(--space-4)">
        <p
          role="alert"
          className="text-[length:var(--font-size-body)] text-(--color-status-critical)"
        >
          Akses ditolak
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
