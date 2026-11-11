import { FileText } from "lucide-react";
import { Sidebar } from "./sidebar";
import { PerformanceOverview, RecentTests, SectionHeader, StudyPlanCard } from "./sections";

export function PrimaryButton() {
  return <button className="inline-flex h-[57px] items-center gap-4 rounded-[18px] bg-[#eeeeec] px-6 text-[18px] font-semibold tracking-[-0.3px] text-[#272727] transition-transform duration-200 hover:bg-white active:scale-[0.98]"><FileText className="size-6" strokeWidth={2.15} />Take a new test</button>;
}

export function AppShell() {
  return <main className="mx-auto my-[4.6vw] grid min-h-[calc(100dvh-9.2vw)] w-[min(94vw,1930px)] grid-cols-[360px_minmax(0,1fr)] overflow-hidden rounded-[56px] border-[12px] border-[#343434] bg-[var(--sentra-db01-shell)] lg:my-[4.6vw]">
    <Sidebar />
    <section className="min-w-0 bg-[var(--sentra-db01-shell)]"><header className="flex h-[89px] items-center border-b border-[var(--sentra-db01-divider)] px-8"><FileText className="size-7 text-[#91918f]" strokeWidth={1.75} /><span className="ml-3 text-[19px] font-medium text-[#999997]">DB01</span></header><div className="mx-auto max-w-[1115px] px-16 py-12 xl:px-24"><div className="flex items-center justify-between gap-10"><div><h1 className="text-[33px] font-semibold tracking-[-1.15px] text-[#f4f4f1]">Welcome back, Isaac</h1><p className="mt-2 text-[20px] text-[#90908d]">Every practice session brings you closer to your goal.</p></div><PrimaryButton /></div><PerformanceOverview /><section className="mt-14"><SectionHeader>Your Weekly Study Plan</SectionHeader><div className="mt-8 grid grid-cols-4 divide-x divide-white/[0.075]"><StudyPlanCard /><StudyPlanCard /><StudyPlanCard /><StudyPlanCard /></div></section><RecentTests /></div></section>
  </main>;
}
