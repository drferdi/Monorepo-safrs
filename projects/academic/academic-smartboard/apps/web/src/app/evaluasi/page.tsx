"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "../../components/AppShell.tsx";
import { EmptyState } from "../../components/EmptyState.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import {
  listSessions,
  listStudents,
  listSubjects,
  listTutors,
} from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";
import { evalStatusBadge, filterSessionsForEval } from "../../lib/progression.ts";

function EvaluasiView() {
  const { user } = useAuth();
  const isParent = user?.role === "murid_ortu";
  const sessionsQ = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
  });
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
        lede={
          isParent
            ? "Ringkasan perkembangan belajar anak per sesi. Catatan internal pengajar tidak ditampilkan."
            : "Isi dan tinjau evaluasi murid per sesi. Sesi tidak dapat masuk payroll sebelum seluruh evaluasi selesai."
        }
      />
      <p className="text-(length:--font-size-body) text-secondary">
        {rows.length} sesi · Sesi yang sudah berjalan atau lebih lanjut
      </p>
      {rows.length === 0 ? (
        <EmptyState title="Belum ada sesi yang perlu dievaluasi." />
      ) : (
        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full text-left text-(length:--font-size-body)">
            <thead className="bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2)">Tanggal</th>
                <th className="px-(--space-3) py-(--space-2)">Mata pelajaran</th>
                <th className="px-(--space-3) py-(--space-2)">Pengajar</th>
                <th className="px-(--space-3) py-(--space-2)">Murid</th>
                <th className="px-(--space-3) py-(--space-2)">Status</th>
                <th className="px-(--space-3) py-(--space-2)">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const sub = subjectsQ.data?.find(
                  (x) => x.subject_id === s.subject_id,
                );
                const tut = tutorsQ.data?.find((t) => t.tutor_id === s.tutor_id);
                const muridNames = (s.student_ids ?? [])
                  .map(
                    (id) =>
                      studentsQ.data?.find((st) => st.student_id === id)?.name ??
                      id,
                  )
                  .join(", ");
                const badge = evalStatusBadge(s.status);
                return (
                  <tr key={s.session_id} className="border-t border-line-subtle">
                    <td className="px-(--space-3) py-(--space-2)">{s.date}</td>
                    <td className="px-(--space-3) py-(--space-2)">{sub?.name}</td>
                    <td className="px-(--space-3) py-(--space-2)">{tut?.name}</td>
                    <td className="px-(--space-3) py-(--space-2)">{muridNames}</td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <Link
                        data-testid={`btn-open-eval-${s.session_id}`}
                        href={`/sesi/${s.session_id}/` as Route}
                        className="text-accent-text underline"
                      >
                        Buka sesi
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
