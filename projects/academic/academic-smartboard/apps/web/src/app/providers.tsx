"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        richColors={false}
        toastOptions={{
          style: {
            background: "var(--color-background-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-subtle)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
