import { useState, useMemo } from "react";
import { Search, Package, FlaskConical, Stethoscope, Layers } from "lucide-react";
import { STOK_OBAT, type StokObat } from "@/data/stok-obat";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const KELOMPOK_OPTS = ["Semua", "OBAT", "BMHP", "ALKES", "REAGEN"] as const;

const KELOMPOK_META: Record<string, { label: string; color: string; Icon: typeof Package }> = {
  OBAT:   { label: "Obat",    color: "text-[var(--sentra-db01-accent-green)]",   Icon: Package },
  BMHP:   { label: "BMHP",   color: "text-[#60a5fa]",                            Icon: Layers },
  ALKES:  { label: "Alkes",  color: "text-[#f59e0b]",                            Icon: Stethoscope },
  REAGEN: { label: "Reagen", color: "text-[#c084fc]",                            Icon: FlaskConical },
};

function stokBadge(stok: number) {
  if (stok === 0)   return { label: "Habis",    cls: "bg-[var(--sentra-db01-accent-red)]/15 text-[var(--sentra-db01-accent-red)]" };
  if (stok < 50)    return { label: "Kritis",   cls: "bg-[#7c2d12]/40 text-[#fb923c]" };
  if (stok < 200)   return { label: "Terbatas", cls: "bg-[#854d0e]/30 text-[#fbbf24]" };
  return              { label: "Tersedia",  cls: "bg-[var(--sentra-db01-accent-green)]/10 text-[var(--sentra-db01-accent-green)]" };
}

/* ── component ───────────────────────────────────────────────────────────── */

export function Formularium() {
  const [q, setQ]             = useState("");
  const [kelompok, setKelompok] = useState<string>("Semua");
  const [page, setPage]       = useState(1);
  const PER_PAGE = 30;

  const filtered = useMemo<StokObat[]>(() => {
    const lq = q.toLowerCase();
    return (STOK_OBAT as unknown as StokObat[]).filter(o => {
      const matchK = kelompok === "Semua" || o.kelompok === kelompok;
      const matchQ = !lq
        || o.nama.toLowerCase().includes(lq)
        || o.kode.toLowerCase().includes(lq);
      return matchK && matchQ;
    });
  }, [q, kelompok]);

  // reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const handleFilter = (k: string) => { setKelompok(k); setPage(1); };
  const handleSearch = (v: string) => { setQ(v); setPage(1); };

  // summary counts
  const counts = useMemo(() => {
    const base = kelompok === "Semua"
      ? (STOK_OBAT as unknown as StokObat[])
      : (STOK_OBAT as unknown as StokObat[]).filter(o => o.kelompok === kelompok);
    return {
      total: base.length,
      habis: base.filter(o => o.stok === 0).length,
      kritis: base.filter(o => o.stok > 0 && o.stok < 50).length,
    };
  }, [kelompok]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--sentra-db01-divider)] px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#e0e0de]">Formularium</h2>
            <p className="mt-0.5 text-[13px] text-[#555553]">Puskesmas Balowerti — Stok obat & BMHP</p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[22px] font-semibold tabular-nums text-[#e0e0de]">{counts.total}</p>
              <p className="text-[11px] text-[#454543]">Total item</p>
            </div>
            <div>
              <p className="text-[22px] font-semibold tabular-nums text-[#fb923c]">{counts.kritis}</p>
              <p className="text-[11px] text-[#454543]">Kritis</p>
            </div>
            <div>
              <p className="text-[22px] font-semibold tabular-nums text-[var(--sentra-db01-accent-red)]">{counts.habis}</p>
              <p className="text-[11px] text-[#454543]">Habis</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex gap-3">
          {/* Search */}
          <div className="flex h-9 flex-1 items-center gap-2.5 rounded-[11px] border border-white/[0.07] bg-[#1a1a18] px-3 text-[13px]">
            <Search className="size-3.5 shrink-0 text-[#404040]" strokeWidth={1.7} />
            <input
              value={q}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Cari nama obat atau kode…"
              className="flex-1 bg-transparent text-[#d8d8d6] placeholder:text-[#353533] outline-none"
            />
            {q && (
              <button onClick={() => handleSearch("")} className="text-[#404040] hover:text-[#808080]">✕</button>
            )}
          </div>

          {/* Kelompok pills */}
          <div className="flex items-center gap-1.5">
            {KELOMPOK_OPTS.map(k => (
              <button
                key={k}
                onClick={() => handleFilter(k)}
                className={`rounded-[9px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  kelompok === k
                    ? "bg-[var(--sentra-db01-raised)] text-[#d8d8d6]"
                    : "text-[#484846] hover:text-[#888886]"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Package className="size-8 text-[#252523]" strokeWidth={1.3} />
            <p className="mt-4 text-[14px] text-[#2e2e2c]">Tidak ada item ditemukan</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-[var(--sentra-db01-shell)]">
              <tr className="border-b border-[var(--sentra-db01-divider)]">
                <th className="px-6 py-3 text-left font-medium text-[#404040]">Kode</th>
                <th className="px-4 py-3 text-left font-medium text-[#404040]">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-[#404040]">Kelompok</th>
                <th className="px-4 py-3 text-right font-medium text-[#404040]">Stok</th>
                <th className="px-4 py-3 text-left font-medium text-[#404040]">Satuan</th>
                <th className="px-6 py-3 text-center font-medium text-[#404040]">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item, i) => {
                const badge  = stokBadge(item.stok);
                const meta   = KELOMPOK_META[item.kelompok] ?? KELOMPOK_META.OBAT;
                return (
                  <tr
                    key={item.kode + i}
                    className="border-b border-[var(--sentra-db01-divider)]/50 transition-colors hover:bg-[var(--sentra-db01-raised)]/30"
                  >
                    <td className="px-6 py-3 font-mono text-[12px] text-[#484846]">{item.kode}</td>
                    <td className="max-w-[320px] px-4 py-3 text-[#d0d0ce]">{item.nama}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 ${meta.color}`}>
                        <meta.Icon className="size-3.5 shrink-0" strokeWidth={1.7} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#c0c0be]">
                      {item.stok.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-[#585856]">{item.unit}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between border-t border-[var(--sentra-db01-divider)] px-6 py-3 text-[13px]">
          <span className="text-[#404040]">
            {((safePage - 1) * PER_PAGE) + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} dari {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-[8px] px-3 py-1.5 text-[#484846] transition-colors hover:bg-[var(--sentra-db01-raised)] disabled:opacity-30"
            >← Prev</button>
            <span className="px-3 py-1.5 text-[#484846]">{safePage} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-[8px] px-3 py-1.5 text-[#484846] transition-colors hover:bg-[var(--sentra-db01-raised)] disabled:opacity-30"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
