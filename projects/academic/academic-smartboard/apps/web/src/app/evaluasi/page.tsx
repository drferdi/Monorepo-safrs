"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import {
  listSessions,
  listStudents,
  listSubjects,
  listTutors,
} from "../../lib/api.ts";
import { filterSessionsForEval } from "../../lib/progression.ts";
import { SESSION_STATUS_LABEL } from "../../lib/labels.ts";

function EvaluasiView() {
  const sessionsQ = useQuery({ queryKey: ["sessions"], queryFn: () => listSessions() });
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });

  const rows = filterSessionsForEval(sessionsQ.data ?? []);

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="AKA"
        eyebrow="Akademik"
        title="Evaluasi Murid"
        lede="Sesi yang menunggu atau sedang dalam evaluasi."
      />
      <p className="text-(length:--font-size-body) text-secondary">
        {rows.length} sesi perlu perhatian
      </p>
      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="w-full text-left text-(length:--font-size-body)">
          <thead className="bg-surface text-secondary">
            <tr>
              <th className="px-(--space-3) py-(--space-2)">Tanggal</th>
              <th className="px-(--space-3) py-(--space-2)">Mapel</th>
              <th className="px-(--space-3) py-(--space-2)">Pengajar</th>
              <th className="px-(--space-3) py-(--space-2)">Status</th>
              <th className="px-(--space-3) py-(--space-2)">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const sub = subjectsQ.data?.find((x) => x.subject_id === s.subject_id);
              const tut = tutorsQ.data?.find((t) => t.tutor_id === s.tutor_id);
              return (
                <tr key={s.session_id} className="border-t border-line-subtle">
                  <td className="px-(--space-3) py-(--space-2)">{s.date}</td>
                  <td className="px-(--space-3) py-(--space-2)">{sub?.name}</td>
                  <td className="px-(--space-3) py-(--space-2)">{tut?.name}</td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {SESSION_STATUS_LABEL[
                      s.status as keyof typeof SESSION_STATUS_LABEL
                    ] ?? s.status}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <Link
                      data-testid={`btn-open-eval-${s.session_id}`}
                      href={`/sesi/${s.session_id}/` as Route}
                      className="text-accent-text underline"
                    >
                      Buka evaluasi
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <span className="sr-only">{studentsQ.data?.length ?? 0}</span>
    </div>
  );
}

export default function EvaluasiPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <EvaluasiView />
      </AppShell>
    </ProtectedRoute>
  );
}
