"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "../../../components/AppShell.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../../components/StatusBadge.tsx";
import { listAuditLogs } from "../../../lib/api.ts";

function AuditLogView() {
  const [q, setQ] = useState("");
  const logsQ = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => listAuditLogs(200),
  });

  const filtered = useMemo(() => {
    const rows = logsQ.data ?? [];
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((l) =>
      JSON.stringify(l).toLowerCase().includes(needle),
    );
  }, [logsQ.data, q]);

  return (
    <AppShell>
      <div className="flex flex-col gap-(--space-4)">
        <PageHead
          seq="SET"
          eyebrow="Pengaturan"
          title="Audit Log"
          lede="Jejak setiap perubahan data: siapa, kapan, modul, dan alasannya. Entri hanya dapat dibaca; tidak dapat diubah atau dihapus."
        />

        <label className="flex max-w-md items-center gap-(--space-2) rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2)">
          <Search size={16} className="text-secondary" aria-hidden="true" />
          <span className="sr-only">Cari log</span>
          <input
            type="search"
            placeholder="Cari…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="search-audit"
            className="min-w-0 flex-1 bg-transparent text-(length:--font-size-body) text-primary outline-none"
          />
        </label>

        <p className="text-(length:--font-size-body) text-secondary">
          <span className="font-semibold text-primary">{filtered.length}</span>{" "}
          entri
          <span className="ml-(--space-2) hidden sm:inline">
            {q ? "Hasil pencarian" : "200 entri terbaru"}
          </span>
        </p>

        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full min-w-[40rem] text-left text-(length:--font-size-body)">
            <thead className="border-b border-line-subtle bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Waktu
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  User
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Modul
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Aksi
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Entity ID
                </th>
                <th className="px-(--space-3) py-(--space-2) font-medium">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {logsQ.isPending && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Memuat…
                  </td>
                </tr>
              )}
              {!logsQ.isPending && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Tidak ada log.
                  </td>
                </tr>
              )}
              {filtered.map((l) => (
                <tr
                  key={l.log_id}
                  className="border-t border-line-subtle text-primary"
                >
                  <td className="px-(--space-3) py-(--space-2) tabular-nums">
                    {l.timestamp ?? "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {l.user_name || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    <StatusBadge tone="neutral">{l.module || "—"}</StatusBadge>
                  </td>
                  <td className="px-(--space-3) py-(--space-2) font-semibold">
                    {l.action}
                  </td>
                  <td className="px-(--space-3) py-(--space-2) tabular-nums">
                    {l.entity_id || "—"}
                  </td>
                  <td className="px-(--space-3) py-(--space-2)">
                    {l.reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

export default function AuditLogPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "finance"]}>
      <AuditLogView />
    </ProtectedRoute>
  );
}
