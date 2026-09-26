import { useMemo } from "react";
import { AlertTriangle, PackageX, Package, Bell, ShieldAlert } from "lucide-react";
import { STOK_OBAT } from "@/data/stok-obat";
import type { SavedCase } from "@/lib/riwayat-store";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

/* ── component ───────────────────────────────────────────────────────────── */

type Props = { cases: SavedCase[] };

export function Notifikasi({ cases }: Props) {
  // Stok habis
  const habis = useMemo(
    () => (STOK_OBAT as unknown as typeof STOK_OBAT[number][]).filter(o => o.stok === 0),
    [],
  );

  // Stok kritis (1–49)
  const kritis = useMemo(
    () => (STOK_OBAT as unknown as typeof STOK_OBAT[number][]).filter(o => o.stok > 0 && o.stok < 50),
    [],
  );

  // Red flags dari riwayat kasus (terbaru, unik per flag text)
  const redFlagItems = useMemo(() => {
    const seen = new Set<string>();
    const out: { flag: string; tanggal: string; patient: string }[] = [];
    for (const c of cases) {
      for (const f of c.result.red_flags) {
        if (!seen.has(f)) {
          seen.add(f);
          out.push({
            flag: f,
            tanggal: c.tanggal,
            patient: c.patient.nama || "Pasien anonim",
          });
        }
      }
      if (out.length >= 10) break;
    }
    return out;
  }, [cases]);

  const totalNotif = habis.length + kritis.length + redFlagItems.length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--sentra-db01-divider)] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#e0e0de]">Notifikasi</h2>
            <p className="mt-0.5 text-[13px] text-[#555553]">
              {totalNotif === 0 ? "Tidak ada peringatan aktif" : `${totalNotif} peringatan aktif`}
            </p>
          </div>
          {totalNotif > 0 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sentra-db01-accent-red)]/20 text-[12px] font-semibold text-[var(--sentra-db01-accent-red)]">
              {totalNotif}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-5 space-y-6">

        {totalNotif === 0 && (
          <div className="flex flex-col items-center py-20 text-center">
            <Bell className="size-8 text-[#252523]" strokeWidth={1.3} />
            <p className="mt-4 text-[15px] font-medium text-[#2e2e2c]">Semua aman</p>
            <p className="mt-1.5 text-[13px] text-[#252523]">Tidak ada stok kritis atau red flag aktif.</p>
          </div>
        )}

        {/* Red flags dari riwayat */}
        {redFlagItems.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="size-4 text-[var(--sentra-db01-accent-red)]" strokeWidth={1.7} />
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sentra-db01-accent-red)]">
                Red Flag — Kasus Terakhir
              </p>
            </div>
            <div className="space-y-2">
              {redFlagItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-[12px] border border-[var(--sentra-db01-accent-red)]/15 bg-[#150606] px-4 py-3"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[var(--sentra-db01-accent-red)]" strokeWidth={1.7} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-[#c04040]">{item.flag}</p>
                    <p className="mt-0.5 text-[11px] text-[#4a3030]">
                      {item.patient} · {formatDate(item.tanggal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stok habis */}
        {habis.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <PackageX className="size-4 text-[var(--sentra-db01-accent-red)]" strokeWidth={1.7} />
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--sentra-db01-accent-red)]">
                Stok Habis ({habis.length})
              </p>
            </div>
            <div className="space-y-1.5">
              {habis.map((o, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-[11px] border border-[var(--sentra-db01-accent-red)]/10 bg-[#120404] px-4 py-2.5"
                >
                  <div>
                    <p className="text-[13px] text-[#b84040]">{o.nama}</p>
                    <p className="text-[11px] text-[#4a2a2a]">{o.kode} · {o.unit}</p>
                  </div>
                  <span className="rounded-full bg-[var(--sentra-db01-accent-red)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--sentra-db01-accent-red)]">
                    0
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stok kritis */}
        {kritis.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Package className="size-4 text-[#fb923c]" strokeWidth={1.7} />
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#fb923c]">
                Stok Kritis — &lt;50 unit ({kritis.length})
              </p>
            </div>
            <div className="space-y-1.5">
              {kritis.map((o, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-[11px] border border-[#7c2d12]/30 bg-[#110800] px-4 py-2.5"
                >
                  <div>
                    <p className="text-[13px] text-[#d08040]">{o.nama}</p>
                    <p className="text-[11px] text-[#4a3010]">{o.kode} · {o.unit}</p>
                  </div>
                  <span className="rounded-full bg-[#fb923c]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#fb923c]">
                    {o.stok}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
