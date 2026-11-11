import { useState } from "react";
import { Clock, User, Trash2, ChevronRight, FileText, Search } from "lucide-react";
import type { DiagnosisItem } from "@workspace/api-client-react";
import type { SavedCase } from "@/lib/riwayat-store";
import { ClinicalOutput } from "./ClinicalOutput";

export type { SavedCase };

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ""; }
}

/* ── component ───────────────────────────────────────────────────────────── */

type Props = {
  cases: SavedCase[];
  onDelete: (id: string) => void;
  onLoadCase: (c: SavedCase) => void;
};

export function RiwayatKasus({ cases, onDelete, onLoadCase }: Props) {
  const [selected, setSelected] = useState<SavedCase | null>(null);
  const [q, setQ]               = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = cases.filter(c => {
    const lq = q.toLowerCase();
    if (!lq) return true;
    const dx = c.result.sections.diagnosis_kerja?.name?.toLowerCase() ?? "";
    const nm = c.patient.nama?.toLowerCase() ?? "";
    const cc = c.complaint.toLowerCase();
    return dx.includes(lq) || nm.includes(lq) || cc.includes(lq);
  });

  const handleDelete = (id: string) => {
    onDelete(id);
    if (selected?.id === id) setSelected(null);
    setConfirmDelete(null);
  };

  if (selected) {
    return (
      <div className="flex h-full flex-col">
        {/* Detail header */}
        <div className="shrink-0 flex items-center gap-3 border-b border-[var(--sentra-db01-divider)] px-6 py-4">
          <button
            onClick={() => setSelected(null)}
            className="rounded-[9px] px-3 py-1.5 text-[13px] text-[#585856] transition-colors hover:bg-[var(--sentra-db01-raised)] hover:text-[#d0d0ce]"
          >
            ← Kembali
          </button>
          <div className="h-4 w-px bg-[var(--sentra-db01-divider)]" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-[14px] font-medium text-[#d0d0ce]">
              {selected.result.sections.diagnosis_kerja?.name || "Tanpa diagnosis"}
            </p>
            <p className="text-[12px] text-[#484846]">
              {selected.patient.nama || "Pasien anonim"} · {formatDate(selected.tanggal)} {formatTime(selected.tanggal)}
            </p>
          </div>
          <button
            onClick={() => { onLoadCase(selected); setSelected(null); }}
            className="flex items-center gap-1.5 rounded-[10px] bg-[var(--sentra-db01-raised)] px-3.5 py-1.5 text-[13px] font-medium text-[#d0d0ce] transition-all hover:bg-[#303030] active:scale-95"
          >
            Lanjutkan Kasus
          </button>
        </div>

        {/* Complaint recap */}
        <div className="shrink-0 mx-8 mt-5 rounded-[12px] border border-white/[0.05] bg-[#171715] px-5 py-3.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#404040]">Keluhan</p>
          <p className="text-[13px] leading-relaxed text-[#686866]">{selected.complaint}</p>
        </div>

        {/* Clinical output */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          <ClinicalOutput result={selected.result} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--sentra-db01-divider)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#e0e0de]">Riwayat Kasus</h2>
            <p className="mt-0.5 text-[13px] text-[#555553]">
              {cases.length} kasus tersimpan
            </p>
          </div>
          {cases.length > 0 && (
            <div className="flex h-9 items-center gap-2.5 rounded-[11px] border border-white/[0.07] bg-[#1a1a18] px-3 text-[13px]" style={{ width: 260 }}>
              <Search className="size-3.5 shrink-0 text-[#404040]" strokeWidth={1.7} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Cari diagnosis atau pasien…"
                className="flex-1 bg-transparent text-[#d8d8d6] placeholder:text-[#353533] outline-none"
              />
              {q && <button onClick={() => setQ("")} className="text-[#404040] hover:text-[#808080]">✕</button>}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <FileText className="size-8 text-[#252523]" strokeWidth={1.3} />
            <p className="mt-4 text-[15px] font-medium text-[#2e2e2c]">Belum ada riwayat kasus</p>
            <p className="mt-1.5 max-w-[320px] text-[13px] text-[#252523]">
              Kasus akan tersimpan otomatis setiap kali analisis selesai.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Search className="size-7 text-[#252523]" strokeWidth={1.3} />
            <p className="mt-4 text-[14px] text-[#2e2e2c]">Tidak ada kasus yang cocok</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--sentra-db01-divider)]/50">
            {filtered.map(c => (
              <div
                key={c.id}
                className="group flex cursor-pointer items-start gap-4 px-8 py-5 transition-colors hover:bg-[var(--sentra-db01-raised)]/30"
                onClick={() => setSelected(c)}
              >
                {/* Date column */}
                <div className="shrink-0 text-center" style={{ width: 52 }}>
                  <p className="text-[20px] font-semibold tabular-nums leading-none text-[#484846]">
                    {new Date(c.tanggal).getDate().toString().padStart(2, "0")}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#353533]">
                    {new Date(c.tanggal).toLocaleDateString("id-ID", { month: "short" })}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  {/* Diagnosis */}
                  <p className="truncate text-[14px] font-medium text-[#c8c8c6]">
                    {c.result.sections.diagnosis_kerja?.name || "Diagnosis tidak tersedia"}
                  </p>

                  {/* Patient + time */}
                  <div className="mt-1 flex items-center gap-3 text-[12px] text-[#484846]">
                    <span className="flex items-center gap-1.5">
                      <User className="size-3 shrink-0" strokeWidth={1.7} />
                      {c.patient.nama || "Anonim"}
                      {c.patient.umur && `, ${c.patient.umur} thn`}
                      {c.patient.jk && ` · ${c.patient.jk[0]}`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3 shrink-0" strokeWidth={1.7} />
                      {formatTime(c.tanggal)}
                    </span>
                  </div>

                  {/* Complaint preview */}
                  <p className="mt-1.5 line-clamp-1 text-[12px] text-[#353533]">
                    {c.complaint}
                  </p>

                  {/* Differential badges */}
                  {(c.result.sections.diagnosis_banding ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(c.result.sections.diagnosis_banding as DiagnosisItem[]).slice(0, 4).map((d, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-white/[0.06] bg-[#1e1e1c] px-2 py-0.5 text-[11px] text-[#484846]"
                        >
                          {d.name}
                        </span>
                      ))}
                      {(c.result.sections.diagnosis_banding ?? []).length > 4 && (
                        <span className="rounded-full border border-white/[0.06] bg-[#1e1e1c] px-2 py-0.5 text-[11px] text-[#353533]">
                          +{(c.result.sections.diagnosis_banding ?? []).length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {confirmDelete === c.id ? (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                        className="rounded-[8px] bg-[var(--sentra-db01-accent-red)]/20 px-2.5 py-1.5 text-[12px] text-[var(--sentra-db01-accent-red)] transition-colors hover:bg-[var(--sentra-db01-accent-red)]/30"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(null); }}
                        className="rounded-[8px] px-2.5 py-1.5 text-[12px] text-[#484846] transition-colors hover:bg-[var(--sentra-db01-raised)]"
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(c.id); }}
                        className="rounded-[8px] p-1.5 text-[#404040] transition-colors hover:bg-[var(--sentra-db01-raised)] hover:text-[var(--sentra-db01-accent-red)]"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.7} />
                      </button>
                      <ChevronRight className="size-4 text-[#404040]" strokeWidth={1.7} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
