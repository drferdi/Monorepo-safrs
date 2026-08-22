"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../lib/auth.tsx";

export default function Page() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // /master/murid is built in Task 8; typedRoutes can't see it yet.
      router.replace("/master/murid" as Route);
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  return null;
}
