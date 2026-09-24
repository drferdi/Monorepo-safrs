"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { listStudents } from "../../../lib/api.ts";

function ProgressionListView() {
  const [q, setQ] = useState("");
  const studentsQ = useQuery({ queryKey: ["students"], queryFn: listStudents });

  const rows = useMemo(() => {
    const data = studentsQ.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((s) => s.name.toLowerCase().includes(needle));
  }, [studentsQ.data, q]);

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="AKA"
        eyebrow="Akademik"
        title="Perkembangan Murid"
        lede="Pilih murid untuk melihat ringkasan perkembangan."
      />
      <input
        data-testid="search-progression"
        type="search"
        placeholder="Cari murid…"
        className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="w-full text-left text-(length:--font-size-body)">
          <thead className="bg-surface text-secondary">
            <tr>
              <th className="px-(--space-3) py-(--space-2)">Nama</th>
              <th className="px-(--space-3) py-(--space-2)">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.student_id} className="border-t border-line-subtle">
                <td className="px-(--space-3) py-(--space-2)">{s.name}</td>
                <td className="px-(--space-3) py-(--space-2)">
                  <Link
                    data-testid={`btn-progression-${s.student_id}`}
                    href={`/akademik/perkembangan/${s.student_id}/` as Route}
                    className="text-accent-text underline"
                  >
                    Lihat
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PerkembanganPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "tentor", "murid_ortu"]}>
      <AppShell>
        <ProgressionListView />
      </AppShell>
    </ProtectedRoute>
  );
}
