import { useMemo } from "react";
import { Users, LayoutGrid, Globe, Clock, Info, Zap, FileText } from "lucide-react";
import { ThinIcon } from "@/components/ui/ThinIcon";
import type { SavedCase } from "@/lib/riwayat-store";
import { STOK_OBAT } from "@/data/stok-obat";

/* ── Design tokens ────────────────────────────────────────────────────────── */
const green  = "#22c55e";
const blue   = "#3b82f6";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ── Sentraverse stat card ───────────────────────────────────────────────── */
function SentraCard({
  icon: Icon,
  label,
  value,
  delta,
  accentColor,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  delta: string;
  accentColor: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-white/[0.07] bg-[var(--sentra-db01-raised)] p-5">
      {/* Icon */}
      <ThinIcon Icon={Icon} className="size-6 text-[#606060]" />
      {/* Label */}
      <p className="text-[13px] leading-snug text-[#5a5a58]">{label}</p>
      {/* Value with left accent bar */}
      <div className="flex items-center gap-2.5">
        <span
          className="h-7 w-[3px] shrink-0 rounded-full"
          style={{ background: accentColor }}
        />
        <span className="text-[28px] font-semibold leading-none tracking-tight text-[#e8e8e6]">
          {value}
        </span>
      </div>
      {/* Delta */}
      <p className="text-[12px] text-[#454543]">{delta}</p>
    </div>
  );
}

/* ── Note card ───────────────────────────────────────────────────────────── */
function NoteCard({ title, author }: { title: string; author: string }) {
  return (
    <div className="flex cursor-pointer flex-col items-center gap-3 rounded-[16px] border border-white/[0.06] bg-[var(--sentra-db01-raised)] p-5 transition-colors hover:border-white/[0.12] hover:bg-[#202020]">
      {/* Document thumbnail */}
      <div className="grid h-[72px] w-[60px] place-items-center rounded-[10px] bg-[#2c2c2a]">
        <ThinIcon Icon={FileText} className="size-7 text-[#555553]" />
      </div>
      <div className="w-full text-center">
        <p className="text-[13px] font-medium leading-snug text-[#c0c0be]">{title}</p>
        <p className="mt-1 text-[12px] text-[#484846]">{author}</p>
      </div>
    </div>
  );
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <p className="text-[16px] font-semibold text-[#d0d0ce]">{children}</p>
      <ThinIcon Icon={Info} className="size-[15px] text-[#3a3a38]" />
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
type Props = {
  cases: SavedCase[];
  onStartConsult: () => void;
  onViewChange: (v: string) => void;
  engineReady: boolean;
  model: string;
};

export function Dashboard({ cases, onStartConsult, onViewChange, engineReady, model }: Props) {
  const today = todayStr();

  const stats = useMemo(() => {
    const casesToday  = cases.filter(c => c.tanggal?.slice(0, 10) === today);
    const stokHabis   = STOK_OBAT.filter(o => typeof o.stok === "number" && o.stok === 0);
    return { casesToday, stokHabis };
  }, [cases, today]);

  // Day of week + date in Bahasa Indonesia
  const dateLabel = useMemo(() => {
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const notes = [
    { title: "New policy added",        author: "By dr Ferdi Iskandar" },
    { title: "Registration this week",  author: "By dr Ferdi Iskandar" },
    { title: "10 Tips Sentra",          author: "By dr Ferdi Iskandar" },
    { title: "Forgot password",         author: "By dr Ferdi Iskandar" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[900px] px-10 py-8 space-y-8">

        {/* ── Welcome row ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold leading-none text-[#e8e8e6]">
              Welcome back, dr Ferdi
            </h1>
            <p className="mt-2 text-[14px] text-[#585856]">
              {dateLabel} · Engine {engineReady ? (
                <span className="text-[#22c55e]">terhubung</span>
              ) : (
                <span className="text-[#888886]">menghubungkan…</span>
              )}
              {engineReady && <span className="ml-1 text-[#404040]">· {model}</span>}
            </p>
          </div>
          {/* Medlink / Konsultasi CTA */}
          <button
            onClick={onStartConsult}
            className="flex shrink-0 items-center gap-2 rounded-[14px] border border-white/[0.1] bg-[#1e1e1c] px-5 py-2.5 text-[14px] font-medium text-[#c8c8c6] transition-all hover:bg-[#282826] hover:text-white active:scale-95"
          >
            <ThinIcon Icon={Zap} className="size-[15px]" />
            Medlink
          </button>
        </div>

        {/* ── Sentraverse ──────────────────────────────────────────────── */}
        <div>
          <SectionTitle>Sentraverse</SectionTitle>
          <div className="grid grid-cols-4 gap-3">
            <SentraCard
              icon={Users}
              label="Member"
              value={7}
              delta="+1 From last week"
              accentColor={green}
            />
            <SentraCard
              icon={LayoutGrid}
              label="Apps"
              value={3}
              delta="+1 From last week"
              accentColor={blue}
            />
            <SentraCard
              icon={Globe}
              label={"Sentraverse\n(website)"}
              value={20}
              delta="+10 From last week"
              accentColor={blue}
            />
            <SentraCard
              icon={Clock}
              label="Hours"
              value={20}
              delta="+10 From last week"
              accentColor={green}
            />
          </div>
        </div>

        {/* ── Your Note for Airmanship ─────────────────────────────────── */}
        <div>
          <SectionTitle>Your Note for Airmanship</SectionTitle>
          <div className="grid grid-cols-4 gap-3">
            {notes.map(n => (
              <NoteCard key={n.title} title={n.title} author={n.author} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
