import { useState } from "react";
import {
  Bell, BookCopy, ChevronDown, ChevronRight, CreditCard, FileText, GraduationCap, History,
  Home, Search, Settings, Sparkles, SquareStack, Target
} from "lucide-react";
import { ThinIcon } from "./icons";

type SidebarItemProps = {
  icon: typeof Home;
  label: string;
  active?: boolean;
  expanded?: boolean;
  onClick?: () => void;
};

export function SidebarItem({ icon, label, active, expanded, onClick }: SidebarItemProps) {
  return (
    <button onClick={onClick} className={`flex h-11 w-full items-center gap-3 rounded-[13px] px-3.5 text-left text-[15px] font-medium transition-colors duration-200 ${active ? "bg-[#282828] text-[#f0f0ee]" : "text-[#898989] hover:bg-[#202020] hover:text-[#d8d8d6]"}`}>
      <ThinIcon Icon={icon} className="size-[22px] shrink-0" />
      <span className="flex-1">{label}</span>
      {expanded === true && <ChevronDown className="size-4" strokeWidth={1.7} />}
    </button>
  );
}

function ResourceLink({ icon, children }: { icon: typeof FileText; children: React.ReactNode }) {
  return <a href="#" className="flex items-center gap-3 py-2 text-[14px] font-medium text-[#858585] transition-colors hover:text-[#d6d6d4]"><ThinIcon Icon={icon} className="size-[19px]" />{children}</a>;
}

export function Sidebar() {
  const [resourcesOpen, setResourcesOpen] = useState(true);
  const [activeItem, setActiveItem] = useState("Dashboard");
  const primary = [
    [Home, "Dashboard"], [SquareStack, "Tests"], [Sparkles, "Coach"], [Target, "Progress"]
  ] as const;

  return (
    <aside className="flex min-h-[min(100dvh-9rem,1280px)] w-[360px] shrink-0 flex-col border-r border-white/[0.045] bg-[#181818] px-6 py-9 lg:w-[360px]">
      <div className="mb-8 flex items-center gap-3 px-1 text-[24px] font-semibold tracking-[-0.8px] text-[#f5f5f4]">
        <span className="grid size-7 place-items-center rounded-[7px] bg-[#f1f1ef] text-[#202020]"><GraduationCap className="size-5" strokeWidth={2.2} /></span>Sentra AI
      </div>

      <label className="relative mb-6 block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[22px] -translate-y-1/2 text-[#818181]" strokeWidth={1.65} />
        <input aria-label="Search" placeholder="Search" className="h-11 w-full rounded-[14px] border border-white/[0.08] bg-transparent pl-12 pr-4 text-[15px] text-[#e7e7e5] placeholder:text-[#747474] outline-none transition-colors focus:border-white/25" />
      </label>

      <nav className="space-y-1" aria-label="Primary navigation">
        {primary.map(([icon, label]) => <SidebarItem key={label} icon={icon} label={label} active={activeItem === label} onClick={() => setActiveItem(label)} />)}
        <SidebarItem icon={BookCopy} label="Resources" expanded={resourcesOpen} onClick={() => setResourcesOpen((open) => !open)} />
        {resourcesOpen && <div className="ml-6 mt-1 border-l border-[#4d4d4d] pl-6"><ResourceLink icon={FileText}>Essay samples</ResourceLink><ResourceLink icon={SquareStack}>Templates</ResourceLink><ResourceLink icon={FileText}>Vocabulary bank</ResourceLink></div>}
        <SidebarItem icon={History} label="History" active={activeItem === "History"} onClick={() => setActiveItem("History")} />
        <SidebarItem icon={Bell} label="Notifications" active={activeItem === "Notifications"} onClick={() => setActiveItem("Notifications")} />
      </nav>

      <div className="mt-auto pt-10">
        <p className="mb-3 px-3 text-[14px] font-medium text-[#858585]">Settings</p>
        <div className="space-y-1"><SidebarItem icon={CreditCard} label="Subscriptions" /><SidebarItem icon={Settings} label="General settings" /></div>
        <button className="mt-9 flex h-[60px] w-full items-center gap-3 rounded-[18px] border border-white/[0.075] bg-[#1b1b1b] px-3 text-left transition-colors hover:bg-[#222222]">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#7c746e] text-[11px] font-bold text-[#e9e6e2]">IT</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold text-[#d9d9d7]">Isaac Turkson</span></span>
          <ChevronRight className="size-5 text-[#8a8a8a]" strokeWidth={1.65} />
        </button>
      </div>
    </aside>
  );
}
