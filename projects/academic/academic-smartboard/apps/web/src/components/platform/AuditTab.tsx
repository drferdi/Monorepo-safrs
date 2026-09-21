"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listPlatformAudit } from "../../lib/api.ts";
import { downloadCsv, stamp, toCsv } from "../../lib/csv.ts";
import { fmtDate } from "../../lib/labels.ts";
import { auditLabel } from "../../lib/platform/pricing.ts";
import { Button } from "../ui/button.tsx";

function kindOf(action?: string): string {
  if (action?.startsWith("tenant_status:")) return "status";
  if (action === "create_tenant") return "tenant";
  if (action === "invite_owner") return "owner";
  if (action === "create_plan" || action === "update_plan") return "plan";
  if (action === "assign_plan") return "assign";
  return "other";
}

export function AuditTab() {
  const auditQ = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: () => listPlatformAudit({ limit: 200 }),
  });
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const rows = auditQ.data ?? [];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && kindOf(r.action) !== kindFilter) return false;
      if (!q) return true;
      return (
        (r.entity_name || "").toLowerCase().includes(q) ||
        (r.entity_id || "").toLowerCase().includes(q) ||
        (r.user_name || "").toLowerCase().includes(q) ||
        auditLabel(r.action).toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, kindFilter]);

  const exportCsv = () => {
    downloadCsv(
      `audit-platform-${stamp()}.csv`,
      toCsv(
        [
          { label: "Waktu", get: (r) => r.timestamp || "" },
          { label: "Tindakan", get: (r) => auditLabel(r.action) },
          { label: "Oleh", get: (r) => r.user_name || r.user_id || "" },
          {
            label: "Target",
            get: (r) => r.entity_name || r.entity_id || "",
          },
          { label: "Alasan", get: (r) => r.reason || "" },
        ],
        visible,
      ),
    );
  };

  return (
    <>
      <div className="mb-(--space-5)">
        <p className="text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
          <span className="mr-(--space-2) font-semibold text-accent-text">
            AUD
          </span>
          Jejak
        </p>
        <h1 className="text-(length:--font-size-title-page) font-bold text-primary">
          Audit Platform
        </h1>
        <p className="mt-(--space-2) max-w-prose text-(length:--font-size-body) text-secondary">
          Riwayat tindakan platform: pembuatan institusi, perubahan status,
          paket, dan undangan owner.
        </p>
      </div>

      {auditQ.isError ? (
        <div className="mb-(--space-4)" role="alert">
          <p className="text-critical">Gagal memuat audit</p>
        </div>
      ) : null}

      <div className="mb-(--space-4) flex flex-wrap gap-(--space-2)">
        <input
          className="min-h-(--target-min) min-w-[12rem] flex-1 rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          placeholder="Cari target, aktor, tindakan, atau alasan…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="audit-search"
        />
        <select
          className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) text-primary"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          data-testid="audit-filter"
        >
          <option value="all">Semua tindakan</option>
          <option value="tenant">Buat institusi</option>
          <option value="status">Ubah status</option>
          <option value="plan">Paket</option>
          <option value="assign">Tugaskan paket</option>
          <option value="owner">Undang owner</option>
        </select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={exportCsv}
          disabled={!visible.length}
          data-testid="audit-export"
        >
          Ekspor CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-control border border-line-subtle">
        <table className="w-full min-w-[40rem] text-left text-(length:--font-size-body)">
          <thead className="border-b border-line-subtle bg-surface text-secondary">
            <tr>
              <th className="px-(--space-3) py-(--space-2)">Waktu</th>
              <th className="px-(--space-3) py-(--space-2)">Tindakan</th>
              <th className="px-(--space-3) py-(--space-2)">Oleh</th>
              <th className="px-(--space-3) py-(--space-2)">Target</th>
              <th className="px-(--space-3) py-(--space-2)">Alasan</th>
            </tr>
          </thead>
          <tbody>
            {auditQ.isPending ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Memuat…
                </td>
              </tr>
            ) : null}
            {!auditQ.isPending && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Belum ada aktivitas platform.
                </td>
              </tr>
            ) : null}
            {!auditQ.isPending && rows.length > 0 && visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-(--space-3) py-(--space-4) text-secondary"
                >
                  Tidak ada yang cocok dengan filter.
                </td>
              </tr>
            ) : null}
            {visible.map((r) => (
              <tr
                key={r.log_id}
                data-testid={`audit-row-${r.log_id}`}
                className="border-t border-line-subtle text-primary"
              >
                <td className="px-(--space-3) py-(--space-2) tabular-nums">
                  {r.timestamp ? fmtDate(r.timestamp) : "—"}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  {auditLabel(r.action)}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  {r.user_name || r.user_id || "—"}
                </td>
                <td className="px-(--space-3) py-(--space-2)">
                  {r.entity_name || r.entity_id || "—"}
                </td>
                <td className="px-(--space-3) py-(--space-2) text-secondary">
                  {r.reason || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
