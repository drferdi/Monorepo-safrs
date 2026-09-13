"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { getCurriculumAlignment } from "../../../lib/api.ts";

function KeselarasanView() {
  const alignQ = useQuery({
    queryKey: ["curriculum-alignment"],
    queryFn: getCurriculumAlignment,
  });

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="AKA"
        eyebrow="Akademik"
        title="Keselarasan Kurikulum"
        lede="Matriks keselarasan mapel × jenjang."
      />
      <p data-testid="align-thesis" className="text-(length:--font-size-body) text-secondary">
        {alignQ.isPending
          ? "Memuat matriks…"
          : alignQ.isError
            ? "Gagal memuat keselarasan"
            : "Matriks keselarasan dimuat dari backend."}
      </p>
      {Array.isArray(alignQ.data?.cells) ? (
        <div className="overflow-x-auto rounded-control border border-line-subtle p-(--space-3)">
          <p className="text-(length:--font-size-label) text-secondary">
            {alignQ.data.cells.length} sel
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function KeselarasanPage() {
  return (
    <ProtectedRoute
      roles={[
        "owner",
        "admin_akademik",
        "tentor",
        "murid_ortu",
        "finance",
        "content_manager",
      ]}
    >
      <AppShell>
        <KeselarasanView />
      </AppShell>
    </ProtectedRoute>
  );
}
