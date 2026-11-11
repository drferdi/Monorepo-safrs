// Architected and built by Drferdi.
'use client'

import SentraBentoCards from '@/components/ui/sentra-bento-cards'

export default function ScrollGallery() {
  // overflow-hidden: kartu bento berarak masuk dari luar (offset x) —
  // jangan bocor jadi scroll horizontal.
  return (
    <section className="overflow-hidden border-b border-muted/20 bg-[var(--sentra-canvas-dark)]">
      <SentraBentoCards />
    </section>
  )
}
