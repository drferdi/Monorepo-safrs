// Architected and built by Drferdi.
// Flat reskin dari wikirepo EngineCard — border tipis + rail accent kiri,
// mengganti gaya neumorphic asli (Chief menolak shadow timbul). Konten verbatim.
import type { Engine } from './data'

import { typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

export default function EngineCard({ id, title, description, subsystems, disclaimer }: Engine) {
  return (
    <div
      id={id}
      className="mb-5 scroll-mt-28 rounded-r-md border border-l-[3px] border-muted/20 border-l-accent bg-foreground/[0.02] px-6 py-5 transition-colors hover:border-l-accent hover:bg-foreground/[0.04]"
    >
      <h3 className={cn(typeGovernance.editorialDisplay, 'mb-3 text-lg md:text-xl')}>{title}</h3>
      <p
        className={cn(typeGovernance.bodySm, 'mb-3')}
        dangerouslySetInnerHTML={{ __html: description }}
      />
      <ul className={cn(typeGovernance.bodySm, 'mb-3 list-disc space-y-1.5 pl-5')}>
        {subsystems.map((item) => (
          <li key={item}>
            <span dangerouslySetInnerHTML={{ __html: item }} />
          </li>
        ))}
      </ul>
      {disclaimer && (
        <p className={cn(typeGovernance.bodySm, 'text-xs italic text-muted/70')}>{disclaimer}</p>
      )}
    </div>
  )
}
