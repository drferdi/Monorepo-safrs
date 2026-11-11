import { useState } from "react";
import {
  Search, ChevronRight, ChevronDown,
  LayoutDashboard, Link2, BookOpen, FolderOpen,
  History, Bell, Settings, LogOut,
  FileText, Globe, ShieldCheck,
} from "lucide-react";
import { ThinIcon } from "@/components/ui/ThinIcon";
import type { PatientData } from "@workspace/api-client-react";

/* ── Types ───────────────────────────────────────────────────────────────── */
type NavItemProps = {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
  onClick?: () => void;
  indent?: boolean;
};

/* ── Nav item ────────────────────────────────────────────────────────────── */
function NavItem({ icon: Icon, label, active, onClick, indent }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[14px] transition-colors duration-150 ${
        indent ? "pl-9" : ""
      } ${
        active
          ? "bg-[#2a2a28] text-[#e8e8e6] font-medium"
          : "text-[#6a6a68] hover:bg-[#1e1e1c] hover:text-[#aaaaaa]"
      }`}
    >
      {!indent && <ThinIcon Icon={Icon} className="size-[18px] shrink-0" />}
      {indent && <span className="size-[6px] shrink-0 rounded-full bg-current opacity-50" />}
      <span className="flex-1 leading-none">{label}</span>
    </button>
  );
}

/* ── Props ────────────────────────────────────────────────────────────────── */
export type { PatientData };

type Props = {
  patient: PatientData;
  onChange: (p: PatientData) => void;
  backend: string;
  onBackendChange: (b: string) => void;
  model: string;
  availableModels: string[];
  onModelChange: (m: string) => void;
  activeView: string;
  onViewChange: (v: string) => void;
};

const BACKEND_OPTIONS = [
  { value: "openai",     label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter (free)" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o-mini",  label: "gpt-4o-mini (cepat)" },
  { value: "gpt-4o",       label: "gpt-4o" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  { value: "gpt-4.1-nano", label: "gpt-4.1-nano (tercepat)" },
  { value: "gpt-4.1",      label: "gpt-4.1" },
];

export function PatientSidebar({
  patient, onChange,
  backend, onBackendChange,
  model, availableModels, onModelChange,
  activeView, onViewChange,
}: Props) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [settingOpen,   setSettingOpen]   = useState(false);

  const set = (key: keyof PatientData) => (val: string) =>
    onChange({ ...patient, [key]: val });

  const handleBackendChange = (b: string) => {
    onBackendChange(b);
    if (b === "openai") onModelChange("gpt-4o-mini");
    else onModelChange(availableModels[0] ?? "openai/gpt-oss-20b:free");
  };

  const orModels = availableModels.map(m => ({
    value: m,
    label: m.includes("/") ? m.split("/")[1] : m,
  }));
  const modelOptions = backend === "openai" ? OPENAI_MODELS : orModels;

  return (
    <aside
      className="flex h-full flex-col bg-[var(--sentra-db01-sidebar)] px-3 py-6"
      style={{ fontFamily: "var(--sentra-db01-font)" }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3 px-2">
        {/* Icon mark */}
        <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#202020]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 4h14M3 10h9M3 16h14" stroke="#e0e0de" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="16" cy="10" r="2.5" fill="#00cc55"/>
          </svg>
        </div>
        <div>
          <p className="text-[13.5px] font-semibold leading-none text-[#d8d8d6]">Sentra Healthcare</p>
          <p className="mt-[3px] text-[9.5px] font-medium uppercase tracking-[0.12em] text-[#3a3a38]">
            Artificial Intelligence Technology
          </p>
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="mb-5 px-1">
        <div className="flex h-9 items-center gap-2.5 rounded-[10px] bg-[#1c1c1a] px-3 text-[13px] text-[#454543]">
          <Search className="size-3.5 shrink-0" strokeWidth={1.7} />
          <span>Search</span>
        </div>
      </div>

      {/* ── Primary nav ──────────────────────────────────────────────────── */}
      <nav className="space-y-0.5 px-1">
        <NavItem icon={LayoutDashboard} label="SentraBoard"
          active={activeView === "dashboard"} onClick={() => onViewChange("dashboard")} />
        <NavItem icon={Link2}           label="MedLink"
          active={activeView === "consult"}   onClick={() => onViewChange("consult")} />
        <NavItem icon={BookOpen}        label="Logbook"
          active={activeView === "history"}   onClick={() => onViewChange("history")} />

        {/* Resources collapsible */}
        <button
          onClick={() => setResourcesOpen(o => !o)}
          className="flex h-10 w-full items-center gap-3 rounded-[11px] px-3 text-left text-[14px] text-[#6a6a68] transition-colors hover:bg-[#1e1e1c] hover:text-[#aaaaaa]"
        >
          <ThinIcon Icon={FolderOpen} className="size-[18px] shrink-0" />
          <span className="flex-1 leading-none">Resources</span>
          {resourcesOpen
            ? <ChevronDown  className="size-3.5" strokeWidth={1.7} />
            : <ChevronRight className="size-3.5" strokeWidth={1.7} />
          }
        </button>

        {resourcesOpen && (
          <div className="space-y-0.5">
            <NavItem icon={ShieldCheck} label="Credential"   indent onClick={() => {}} />
            <NavItem icon={FileText}    label="Sentrapedia"  indent onClick={() => onViewChange("formularium")} />
            <NavItem icon={Globe}       label="Sentraverse"  indent onClick={() => {}} />
          </div>
        )}

        <NavItem icon={History} label="History"
          active={activeView === "history"} onClick={() => onViewChange("history")} />
        <NavItem icon={Bell}    label="Notification"
          active={activeView === "notif"}   onClick={() => onViewChange("notif")} />
      </nav>

      {/* ── Spacer ───────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Patient data (collapsible under a divider) ───────────────────── */}
      {activeView === "consult" && (
        <>
          <div className="my-4 h-px bg-[var(--sentra-db01-divider)]" />
          <div className="px-1 space-y-2.5 max-h-[280px] overflow-y-auto">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#3a3a38]">
              Data Pasien
            </p>
            {(["nama","umur","jk","bb","tb","alergi","komorbid","obat"] as (keyof PatientData)[]).map(k => (
              k === "jk"
                ? <select key={k} value={patient[k] ?? ""} onChange={e => set(k)(e.target.value)}
                    className="h-9 w-full rounded-[10px] border border-white/[0.07] bg-[#1c1c1a] px-3 text-[13px] text-[#c0c0be] outline-none">
                    <option value="">Jenis kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                : <input key={k} value={patient[k] ?? ""} onChange={e => set(k)(e.target.value)}
                    placeholder={{ nama:"Nama",umur:"Umur",bb:"BB (kg)",tb:"TB (cm)",alergi:"Alergi",komorbid:"Komorbiditas",obat:"Obat" }[k]}
                    className="h-9 w-full rounded-[10px] border border-white/[0.07] bg-[#1c1c1a] px-3 text-[13px] text-[#c0c0be] placeholder:text-[#3a3a38] outline-none focus:border-white/20"
                  />
            ))}
          </div>
        </>
      )}

      {/* ── Bottom nav ───────────────────────────────────────────────────── */}
      <div className="mt-4 space-y-0.5 border-t border-[var(--sentra-db01-divider)] pt-4 px-1">

        {/* Setting collapsible */}
        <button
          onClick={() => setSettingOpen(o => !o)}
          className="flex h-10 w-full items-center gap-3 rounded-[11px] px-3 text-[14px] text-[#6a6a68] transition-colors hover:bg-[#1e1e1c] hover:text-[#aaaaaa]"
        >
          <ThinIcon Icon={Settings} className="size-[18px] shrink-0" />
          <span className="flex-1 leading-none">Setting</span>
          {settingOpen
            ? <ChevronDown  className="size-3.5" strokeWidth={1.7} />
            : <ChevronRight className="size-3.5" strokeWidth={1.7} />
          }
        </button>

        {settingOpen && (
          <div className="mx-2 mb-2 space-y-2.5 rounded-[12px] bg-[#1a1a18] p-3 text-[13px]">
            <div>
              <p className="mb-1 text-[11px] text-[#505050]">Backend</p>
              <select value={backend} onChange={e => handleBackendChange(e.target.value)}
                className="h-8 w-full rounded-[8px] border border-white/[0.07] bg-[#232321] px-2.5 text-[12px] text-[#c0c0be] outline-none">
                {BACKEND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-[#505050]">Model</p>
              <select value={model} onChange={e => onModelChange(e.target.value)}
                className="h-8 w-full rounded-[8px] border border-white/[0.07] bg-[#232321] px-2.5 text-[12px] text-[#c0c0be] outline-none">
                {modelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* User profile */}
        <div className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 hover:bg-[#1e1e1c] transition-colors cursor-pointer group">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#2a2a28] text-[13px] font-medium text-[#909090]">
            F
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#c0c0be] leading-none">dr Ferdi Iskandar</p>
            <p className="mt-[3px] text-[11px] text-[#4a4a48] leading-none">Doctor</p>
          </div>
          <ThinIcon Icon={LogOut} className="size-[15px] text-[#3a3a38] group-hover:text-[#606060] transition-colors" />
        </div>
      </div>
    </aside>
  );
}
