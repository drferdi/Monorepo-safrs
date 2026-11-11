import { AudioLines, BookOpenText, Ear, FileText, Info, MoreHorizontal, PenLine } from "lucide-react";
import { ThinIcon } from "./icons";

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="flex items-center gap-3 text-[23px] font-semibold tracking-[-0.65px] text-[#ededeb]">{children}<Info className="size-5 text-[#adadab]" strokeWidth={2} /></h2>;
}

const metrics = [
  { label: "Speaking Test", score: "7.5", color: "#30d069", Icon: AudioLines },
  { label: "Writing Test", score: "6.5", color: "#1399e9", Icon: PenLine },
  { label: "Listening Test", score: "5.5", color: "#f53b37", Icon: Ear },
  { label: "Reading Test", score: "7.5", color: "#31ce6a", Icon: FileText }
];

export function PerformanceOverview() {
  return <section className="mt-12"><SectionHeader>Performance Overview</SectionHeader><div className="mt-8 grid grid-cols-4">{metrics.map(({ label, score, color, Icon }, index) => <article key={label} className={`min-h-[166px] px-6 first:pl-0 ${index < metrics.length - 1 ? "border-r border-white/[0.075]" : "pr-0"}`}><ThinIcon Icon={Icon} className="size-7 text-[#8b8b89]" /><p className="mt-4 text-[17px] font-medium text-[#9d9d9a]">{label}</p><div className="mt-6 flex items-center gap-3"><span className="h-10 w-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-[48px] font-semibold leading-none tracking-[-2.4px] text-[#f2f2ef]">{score}</span></div><p className="mt-2 text-[14px] text-[#7e7e7b]">+2.5 From last week</p></article>)}</div></section>;
}

export function StudyPlanCard() {
  return <article className="flex min-h-[220px] flex-col items-center justify-center text-center"><div className="relative grid size-[108px] place-items-center rounded-[23px] bg-[#aaa9a6] shadow-[inset_0_2px_0_rgba(255,255,255,0.18)]"><span className="absolute right-0 top-0 size-8 rounded-bl-[19px] bg-[#181818]" /><span className="absolute right-0 top-[2px] h-5 w-5 rounded-bl-[12px] bg-[#c9c8c4]" /><span className="grid gap-[6px]"><i className="block h-[7px] w-12 rounded-full bg-[#6d6d6a]" /><i className="block h-[7px] w-12 rounded-full bg-[#6d6d6a]" /><i className="block h-[7px] w-12 rounded-full bg-[#6d6d6a]" /><i className="block h-[7px] w-10 rounded-full bg-[#6d6d6a]" /></span></div><h3 className="mt-4 text-[18px] font-medium text-[#d9d9d7]">Vocabulary bank</h3><p className="mt-1 text-[14px] text-[#828280]">15 new words</p></article>;
}

const recentTests = [
  ["General Writing Task 1 – Formal Letter (Request)", "“I am writing to request information regarding your accommodations for guests with disabilities...”"],
  ["General Writing Task 1 – Informal Letter (Invitation)", "“I hope this letter finds you well. I would like to invite you to my birthday party next month...”"]
];

export function RecentTests() {
  return <section className="mt-14"><h2 className="text-[23px] font-semibold tracking-[-0.65px] text-[#ededeb]">Recent Tests</h2><div className="mt-6 space-y-6">{recentTests.map(([title, preview]) => <article key={title} className="grid grid-cols-[26px_minmax(0,1fr)_28px] items-start gap-4"><ThinIcon Icon={BookOpenText} className="mt-1 size-6 text-[#90908e]" /><div><h3 className="text-[19px] font-medium tracking-[-0.35px] text-[#d8d8d5]">{title}</h3><p className="mt-1 truncate text-[15px] text-[#828280]">{preview}</p></div><button aria-label={`More options for ${title}`} className="grid size-7 place-items-center rounded-lg text-[#9b9b99] transition-colors hover:bg-[#252525] hover:text-[#ddddda]"><MoreHorizontal className="size-5" strokeWidth={2} /></button></article>)}</div></section>;
}
