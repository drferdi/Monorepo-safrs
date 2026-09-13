"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "../../../components/AppShell.tsx";
import { ChipTabs } from "../../../components/ChipTabs.tsx";
import { EmptyState } from "../../../components/EmptyState.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import {
  getCurriculumStatus,
  getCurriculumStructure,
  listCurriculumOutcomes,
  type CurriculumOutcome,
} from "../../../lib/api.ts";
import { PHASES } from "../../../lib/curriculumPhase.ts";

function KurikulumView() {
  const [phase, setPhase] = useState<string>("A");
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");

  const statusQ = useQuery({
    queryKey: ["curriculum-status"],
    queryFn: getCurriculumStatus,
  });
  const structureQ = useQuery({
    queryKey: ["curriculum-structure"],
    queryFn: getCurriculumStructure,
  });
  const outcomesQ = useQuery({
    queryKey: ["curriculum-outcomes", phase, subject, q],
    queryFn: () =>
      listCurriculumOutcomes({
        phase,
        subject: subject || undefined,
        q: q || undefined,
      }),
    enabled: Boolean(statusQ.data),
  });

  const items: CurriculumOutcome[] = useMemo(() => {
    const raw = outcomesQ.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return raw.items ?? [];
  }, [outcomesQ.data]);

  const hasData = Boolean(
    statusQ.data?.has_data ?? structureQ.data?.phases,
  );

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="AKA"
        eyebrow="Akademik"
        title="Kurikulum Nasional"
        lede="Browser capaian pembelajaran per fase."
      />
      {statusQ.isError ? (
        <p data-testid="kurikulum-error" role="alert" className="text-critical">
          Gagal memuat kurikulum
        </p>
      ) : null}
      {statusQ.isPending ? (
        <p data-testid="kurikulum-loading" className="text-secondary">
          Memuat…
        </p>
      ) : null}
      {!statusQ.isPending && !hasData ? (
        <EmptyState
          testId="curriculum-not-loaded"
          title="Kurikulum belum diunggah"
          lede="Registry capaian pembelajaran belum tersedia di backend."
        />
      ) : null}
      {hasData ? (
        <>
          <div data-testid="curriculum-status-panel">
            <ChipTabs
              value={phase}
              onChange={setPhase}
              options={PHASES.map((p) => ({
                id: p,
                label: `Fase ${p}`,
                testId: `chip-fase-${p}`,
              }))}
            />
          </div>
          <div className="flex flex-wrap gap-(--space-3)">
            <input
              data-testid="filter-kurikulum-subject"
              className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
              placeholder="Filter mapel"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <input
              data-testid="filter-kurikulum-search"
              className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
              placeholder="Cari CP…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto rounded-control border border-line-subtle">
            <table className="w-full text-left text-(length:--font-size-body)">
              <thead className="bg-surface text-secondary">
                <tr>
                  <th className="px-(--space-3) py-(--space-2)">Kode</th>
                  <th className="px-(--space-3) py-(--space-2)">Mapel</th>
                  <th className="px-(--space-3) py-(--space-2)">Elemen</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cp) => (
                  <tr
                    key={cp.learning_outcome_code}
                    data-testid={`row-cp-${cp.learning_outcome_code}`}
                    className="border-t border-line-subtle"
                  >
                    <td className="px-(--space-3) py-(--space-2)">
                      {cp.learning_outcome_code}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">{cp.subject}</td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {cp.element_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function KurikulumPage() {
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
        <KurikulumView />
      </AppShell>
    </ProtectedRoute>
  );
}
