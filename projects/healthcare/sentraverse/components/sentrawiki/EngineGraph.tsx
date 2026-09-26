// Architected and built by Drferdi.
// Flat reskin dari wikirepo EngineGraph. Gaya neumorphic asli dibuang
// (Chief menolak shadow timbul + override .dark tidak pernah aktif di situs
// dark-only ini). Node & relasi antar-engine dipertahankan apa adanya.
import { ENGINE_NODES, ENGINE_RELATIONS } from './data'

import { typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

function EngineNodeCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="relative min-w-[150px] rounded-lg border border-muted/25 bg-background px-5 py-3 text-center">
      {/* mac dots */}
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#febc2e]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
      </div>
      <span className="mt-2 block font-mono text-xs font-bold tracking-wide text-foreground">
        {label}
      </span>
      <span className="mt-1 block text-[10px] font-medium text-muted/70">{desc}</span>
    </div>
  )
}

export default function EngineGraph() {
  return (
    <div className="my-6">
      <div className="rounded-2xl border border-muted/20 bg-foreground/[0.02] p-6 md:p-8">
        <div className="flex flex-col items-center gap-3">
          {ENGINE_NODES.map((node, i) => {
            const relation = ENGINE_RELATIONS[i]
            return (
              <div key={node.id} className="flex flex-col items-center gap-3">
                <EngineNodeCard label={node.label} desc={node.desc} />
                {relation && (
                  <div className="flex flex-col items-center gap-1" aria-hidden="true">
                    <span className="h-4 w-px bg-muted/25" />
                    <span className="rounded-full border border-muted/20 bg-background px-2 py-0.5 font-mono text-[10px] italic text-muted/70">
                      {relation.label}
                    </span>
                    <span className="h-4 w-px bg-muted/25" />
                    <span className="text-[10px] text-accent">▼</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p className={cn(typeGovernance.bodySm, 'mt-3 text-xs italic text-muted/70')}>
        Crown Jewel engine interaction graph. Arrows indicate call, usage, encoding, guard, and
        lookup relationships between the five core intelligence engines.
      </p>
    </div>
  )
}
