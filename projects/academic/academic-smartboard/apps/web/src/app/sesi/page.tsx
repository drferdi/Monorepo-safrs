"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "../../components/AppShell.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { StatusBadge } from "../../components/StatusBadge.tsx";
import { listSessions, listSubjects, listTutors } from "../../lib/api.ts";
import {
  SESSION_STATUS_LABEL,
  STATUS_BADGE,
  type StatusBadgeTone,
} from "../../lib/labels.ts";

function SesiListView() {
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");

  const sessionsQ = useQuery({
    queryKey: ["sessions", status, dateFrom, dateTo],
    queryFn: () =>
      listSessions({
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
  });
  const tutorsQ = useQuery({ queryKey: ["tutors"], queryFn: listTutors });
  const subjectsQ = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });

  const rows = useMemo(() => {
    const data = sessionsQ.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((s) => {
      const tut =
        tutorsQ.data?.find((t) => t.tutor_id === s.tutor_id)?.name ?? "";
      const sub =
        subjectsQ.data?.find((x) => x.subject_id === s.subject_id)?.name ?? "";
      return (
        s.session_id.toLowerCase().includes(needle) ||
        tut.toLowerCase().includes(needle) ||
        sub.toLowerCase().includes(needle)
      );
    });
  }, [sessionsQ.data, tutorsQ.data, subjectsQ.data, q]);

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="OPS"
        eyebrow="Operasional"
        title="Sesi Pembelajaran"
        lede="Daftar sesi terjadwal hingga terverifikasi."
      />
      <div className="flex flex-wrap gap-(--space-3)">
        <select
          data-testid="filter-status"
          className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Semua status</option>
          {Object.entries(SESSION_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          data-testid="filter-date-from"
          type="date"
          className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          data-testid="filter-date-to"
          type="date"
          className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <input
          data-testid="filter-search"
          type="search"
          placeholder="Cari…"
          className="rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {sessionsQ.isError ? (
        <p data-testid="sesi-list-error" role="alert" className="text-critical">
          Gagal memuat sesi
        </p>
      ) : null}
      {sessionsQ.isPending ? (
        <p data-testid="sesi-list-loading" className="text-secondary">
          Memuat…
        </p>
      ) : (
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
                const tone = (STATUS_BADGE[s.status] ??
                  "neutral") as StatusBadgeTone;
                const tut = tutorsQ.data?.find(
                  (t) => t.tutor_id === s.tutor_id,
                );
                const sub = subjectsQ.data?.find(
                  (x) => x.subject_id === s.subject_id,
                );
                return (
                  <tr
                    key={s.session_id}
                    data-testid={`row-ses-${s.session_id}`}
                    className="border-t border-line-subtle"
                  >
                    <td className="px-(--space-3) py-(--space-2)">{s.date}</td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {sub?.name}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      {tut?.name}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <StatusBadge tone={tone}>
                        {SESSION_STATUS_LABEL[
                          s.status as keyof typeof SESSION_STATUS_LABEL
                        ] ?? s.status}
                      </StatusBadge>
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <Link
                        data-testid={`link-open-${s.session_id}`}
                        href={`/sesi/${s.session_id}/` as Route}
                        className="text-accent-text underline"
                      >
                        Buka
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

export default function SesiPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <SesiListView />
      </AppShell>
    </ProtectedRoute>
  );
}
