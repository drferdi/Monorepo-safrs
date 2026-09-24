"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "../../components/AppShell.tsx";
import { ChipTabs } from "../../components/ChipTabs.tsx";
import { PageHead } from "../../components/PageHead.tsx";
import { ProtectedRoute } from "../../components/ProtectedRoute.tsx";
import { Button } from "../../components/ui/button.tsx";
import { getApiBaseUrl, getReport } from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";
import { rupiah } from "../../lib/labels.ts";

const TABS = [
  { key: "operational", label: "Operasional" },
  { key: "academic", label: "Akademik" },
  { key: "tutors", label: "Pengajar" },
  { key: "finance", label: "Keuangan" },
  { key: "compliance", label: "Kepatuhan" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type ReportColumn = {
  key: string;
  label: string;
  render?: (v: unknown) => string;
};

const COLS: Record<TabKey, ReportColumn[]> = {
  operational: [
    { key: "date", label: "Tanggal" },
    { key: "start", label: "Mulai" },
    { key: "end", label: "Selesai" },
    { key: "subject", label: "Mata Pelajaran" },
    { key: "tutor", label: "Pengajar" },
    { key: "students_count", label: "Murid" },
    { key: "format", label: "Format" },
    { key: "mode", label: "Mode" },
    { key: "status", label: "Status" },
  ],
  academic: [
    { key: "student_name", label: "Murid" },
    { key: "evals", label: "Total Evaluasi" },
    { key: "avg_score", label: "Rata-rata Skor" },
    { key: "last_competence", label: "Kompetensi Terakhir" },
  ],
  tutors: [
    { key: "tutor_name", label: "Pengajar" },
    { key: "sessions_taught", label: "Sesi Diajar" },
    { key: "sessions_completed", label: "Selesai" },
    { key: "minutes_taught", label: "Menit" },
    { key: "eval_filled", label: "Evaluasi Diisi" },
    { key: "tasks_open", label: "Task Terbuka" },
    { key: "overtime_hours", label: "Lembur (jam)" },
  ],
  finance: [
    { key: "tutor_name", label: "Pengajar" },
    { key: "sessions", label: "Sesi" },
    { key: "base", label: "Base", render: (v) => rupiah(v as number) },
    { key: "incentive", label: "Insentif", render: (v) => rupiah(v as number) },
    {
      key: "transport",
      label: "Transport",
      render: (v) => rupiah(v as number),
    },
    { key: "total", label: "Total", render: (v) => rupiah(v as number) },
  ],
  compliance: [
    { key: "category", label: "Kategori" },
    { key: "entity_id", label: "ID Entitas" },
    { key: "date", label: "Tanggal" },
    { key: "detail", label: "Detail" },
  ],
};

function LaporanView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("operational");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [period, setPeriod] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (["operational", "academic"].includes(tab)) {
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
    }
    if (["tutors", "finance"].includes(tab) && period) {
      params.period = period;
    }
    return params;
  }, [tab, dateFrom, dateTo, period]);

  const reportQ = useQuery({
    queryKey: ["report", tab, queryParams],
    queryFn: () => getReport(tab, queryParams),
  });

  const data = reportQ.data ?? { summary: {}, rows: [] };
  const cols = COLS[tab];

  const visibleTabs = TABS.filter(
    (t) => user?.role !== "admin_akademik" || t.key !== "finance",
  );

  async function exportFile(fmt: string): Promise<void> {
    const params = new URLSearchParams();
    params.set("export", fmt);
    if (["operational", "academic"].includes(tab)) {
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
    }
    if (["tutors", "finance"].includes(tab) && period) {
      params.set("period", period);
    }
    try {
      const resp = await fetch(
        `${getApiBaseUrl()}/reports/${tab}?${params.toString()}`,
        { credentials: "include" },
      );
      if (!resp.ok) throw new Error("export failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tab}_report.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Gagal mengunduh ${fmt.toUpperCase()}`);
    }
  }

  function printReport(): void {
    window.print();
  }

  return (
    <div className="space-y-(--space-5) print:space-y-(--space-3)">
      <PageHead
        seq="LAP"
        eyebrow="Laporan"
        title="Laporan Terpadu"
        lede="Laporan terpadu: operasional, akademik, pengajar, keuangan, dan kepatuhan. Ekspor CSV, Excel, atau PDF."
      />

      <ChipTabs
        ariaLabel="Kategori laporan"
        value={tab}
        onChange={(id) => setTab(id as TabKey)}
        options={visibleTabs.map((t) => ({
          id: t.key,
          label: t.label,
          testId: `tab-${t.key}`,
        }))}
      />

      <section className="rounded-control border border-line-subtle">
        <div className="flex flex-wrap items-center justify-between gap-(--space-3) border-b border-line-subtle px-(--space-4) py-(--space-3) print:hidden">
          <div className="flex flex-wrap items-center gap-(--space-2)">
            {["operational", "academic"].includes(tab) ? (
              <>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="report-from"
                  className="min-h-(--target-min) rounded-control border border-line-subtle px-(--space-3)"
                />
                <span className="text-(length:--font-size-label) text-secondary">
                  —
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="report-to"
                  className="min-h-(--target-min) rounded-control border border-line-subtle px-(--space-3)"
                />
              </>
            ) : null}
            {["tutors", "finance"].includes(tab) ? (
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                data-testid="report-period"
                className="min-h-(--target-min) rounded-control border border-line-subtle px-(--space-3)"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-(--space-2)">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-print"
              onClick={printReport}
            >
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-export-csv"
              onClick={() => void exportFile("csv")}
            >
              <Download size={14} aria-hidden /> CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="btn-export-xlsx"
              onClick={() => void exportFile("xlsx")}
            >
              <Download size={14} aria-hidden /> Excel
            </Button>
            <Button
              type="button"
              size="sm"
              data-testid="btn-export-pdf"
              onClick={() => void exportFile("pdf")}
            >
              <Download size={14} aria-hidden /> PDF
            </Button>
          </div>
        </div>

        {data.summary && Object.keys(data.summary).length > 0 ? (
          <div className="grid gap-(--space-3) border-b border-line-subtle px-(--space-4) py-(--space-4) sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.summary).map(([k, v]) => (
              <div key={k}>
                <div className="text-(length:--font-size-label) text-secondary">
                  {k.replace(/_/g, " ")}
                </div>
                <div className="text-(length:--font-size-title-section) font-semibold text-primary">
                  {typeof v === "number" && k.includes("total")
                    ? rupiah(v)
                    : String(v)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="overflow-x-auto px-(--space-4) py-(--space-4)">
          <table className="min-w-full border-collapse text-(length:--font-size-body)">
            <thead>
              <tr className="border-b border-line-subtle bg-surface">
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className="px-(--space-3) py-(--space-2) text-left"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data.rows || data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={cols.length}
                    className="px-(--space-3) py-(--space-4) text-center text-secondary"
                  >
                    Tidak ada data untuk filter ini.
                  </td>
                </tr>
              ) : (
                data.rows.map((row, i) => (
                  <tr key={i} className="border-b border-line-subtle">
                    {cols.map((c) => (
                      <td key={c.key} className="px-(--space-3) py-(--space-2)">
                        {c.render
                          ? c.render(row[c.key])
                          : String(row[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`@media print { nav, aside, header, .print\\:hidden { display: none !important; } }`}</style>
    </div>
  );
}

export default function LaporanPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "finance"]}>
      <AppShell>
        <LaporanView />
      </AppShell>
    </ProtectedRoute>
  );
}
