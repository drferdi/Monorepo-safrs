// Architected and built by Drferdi.
// Accordion collapsible untuk indeks dokumentasi (~150 entri). Ciut default
// (kategori pertama terbuka), isi mengalir multi-kolom agar padat. Seluruh
// href asli di sumber adalah '#' placeholder, jadi item non-interaktif.
'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { LibraryCategory, LibraryItem } from './data'
import { LIBRARY_DATA } from './data'

import { cn } from '@/lib/utils'

// Hitung jumlah dokumen (leaf) dalam satu kategori.
function countLeaves(items: LibraryItem[]): number {
  return items.reduce((n, it) => n + (it.children ? countLeaves(it.children) : 1), 0)
}

function CategoryPanel({ category }: { category: LibraryCategory }) {
  const groups = category.items.filter((it) => it.children && it.children.length > 0)
  const singles = category.items.filter((it) => !it.children || it.children.length === 0)

  return (
    <div className="border-t border-muted/10 px-5 py-4">
      {singles.length > 0 && (
        <ul className="mb-4 columns-2 gap-x-6 md:columns-3 [&>li]:mb-1 [&>li]:break-inside-avoid [&>li]:text-xs [&>li]:text-muted">
          {singles.map((item) => (
            <li key={item.label}>{item.label}</li>
          ))}
        </ul>
      )}
      {groups.map((group) => (
        <div key={group.label} className="mb-4 last:mb-0">
          <div className="mb-1.5 font-jakarta text-[10px] font-bold uppercase tracking-widest text-accent">
            {group.label}
          </div>
          <ul className="columns-2 gap-x-6 md:columns-3 [&>li]:mb-1 [&>li]:break-inside-avoid [&>li]:text-xs [&>li]:text-muted">
            {(group.children ?? []).map((child) => (
              <li key={child.label}>{child.label}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function LibraryGrid() {
  // Kategori pertama terbuka default; sisanya terlipat.
  const [openTitle, setOpenTitle] = useState<string | null>(LIBRARY_DATA[0]?.title ?? null)

  return (
    <div className="flex flex-col gap-3">
      {LIBRARY_DATA.map((category) => {
        const isOpen = openTitle === category.title
        const count = countLeaves(category.items)
        return (
          <div
            key={category.title}
            className="overflow-hidden rounded-md border border-muted/20 bg-foreground/[0.02]"
          >
            <button
              type="button"
              onClick={() => setOpenTitle(isOpen ? null : category.title)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-foreground/[0.02]"
            >
              <span className="font-jakarta text-xs font-bold uppercase tracking-widest text-foreground">
                {category.title}
              </span>
              <span className="rounded-full border border-muted/20 px-2 py-0.5 font-mono text-[10px] text-muted/70">
                {count}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  'ml-auto shrink-0 text-muted transition-transform duration-200',
                  isOpen && 'rotate-180 text-accent'
                )}
              />
            </button>
            {isOpen && <CategoryPanel category={category} />}
          </div>
        )
      })}
    </div>
  )
}
