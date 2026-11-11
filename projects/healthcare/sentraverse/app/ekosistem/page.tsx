// Architected and built by Drferdi.
// Adapted from app\story\page.tsx (EKOSISTEM PRODUK + MODUL IN DEVELOPMENT)
'use client'

import { Github } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  APP_DOMAINS,
  PRODUCTS,
  STATUS_COLOR,
  STATUSES,
  type ProductStatus,
} from '@/components/ekosistem/data'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { layoutGovernance, typeGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

export default function EkosistemPage() {
  const [activeStatus, setActiveStatus] = useState<ProductStatus | null>(null)

  const filtered = useMemo(
    () => (activeStatus ? PRODUCTS.filter((p) => p.status === activeStatus) : PRODUCTS),
    [activeStatus]
  )

  const statusCount = (status: ProductStatus) => PRODUCTS.filter((p) => p.status === status).length

  return (
    <>
      <Navbar />
      <main className="bg-background text-foreground">
        {/* ═══ Hero ═══ */}
        <section className="border-b border-muted/20 pt-32 pb-16">
          <div className={cn(layoutGovernance.container.wide, layoutGovernance.sectionX)}>
            <p className={typeGovernance.eyebrow}>Ekosistem Produk</p>
            <h1
              className={cn(
                typeGovernance.editorialDisplay,
                'mt-3 max-w-[820px] text-[40px] leading-[1.05] md:text-[64px]'
              )}
            >
              Platform <span className="text-accent">Modular</span> yang Tumbuh Bersama Kebutuhan
            </h1>

            {/* Garis — titik — garis, andalan Sentra */}
            <div className="mt-6 flex max-w-[280px] items-center gap-4" aria-hidden="true">
              <span className="h-px flex-1 bg-accent/60" />
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="h-px flex-1 bg-accent/60" />
            </div>

            <p className={cn(typeGovernance.body, 'mt-6 max-w-[640px]')}>
              Setiap produk Sentra beroperasi sebagai modul independen yang dapat diaktifkan sesuai
              kebutuhan fasilitas — dari klinik kecil hingga rumah sakit rujukan.
            </p>
          </div>
        </section>

        {/* ═══ Status Filter ═══ */}
        <section className={cn('py-8', layoutGovernance.container.wide, layoutGovernance.sectionX)}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveStatus(null)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-jakarta text-[10px] font-bold uppercase tracking-widest transition-colors',
                activeStatus === null
                  ? 'border-accent bg-accent text-white'
                  : 'border-muted/25 text-muted hover:border-muted/50 hover:text-foreground'
              )}
            >
              Semua
              <span className="opacity-70">{PRODUCTS.length}</span>
            </button>
            {STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(activeStatus === status ? null : status)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-jakarta text-[10px] font-bold uppercase tracking-widest transition-colors',
                  activeStatus === status
                    ? 'border-accent bg-accent text-white'
                    : 'border-muted/25 text-muted hover:border-muted/50 hover:text-foreground'
                )}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: activeStatus === status ? '#fff' : STATUS_COLOR[status] }}
                />
                {status}
                <span className="opacity-70">{statusCount(status)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ═══ Product Grid ═══ */}
        <section
          className={cn('pb-24', layoutGovernance.container.wide, layoutGovernance.sectionX)}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {filtered.map((product) => {
              const Icon = product.icon
              const color = STATUS_COLOR[product.status]
              return (
                <div
                  key={product.name}
                  className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-muted/20 bg-background"
                >
                  {/* Header — mac window chrome */}
                  <div className="flex items-center gap-3 border-b border-muted/20 px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="h-3.5 w-px bg-muted/20" />
                    <span className="font-jakarta text-xs font-bold uppercase tracking-widest text-muted">
                      sentra / {product.name.toLowerCase().replace(/\s+/g, '-')}
                    </span>
                    <div className="ml-auto">
                      <span
                        className="inline-flex h-7 items-center rounded-full border px-3 font-jakarta text-[10px] font-bold uppercase tracking-widest"
                        style={{
                          color,
                          borderColor: `${color}33`,
                          background: `${color}0d`,
                        }}
                      >
                        {product.status}
                      </span>
                    </div>
                  </div>
                  {/* Double rule accent */}
                  <div className="mt-[3px] h-px bg-muted/10" />

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-4 px-6 py-10 md:px-8">
                    <div className="flex items-center gap-4">
                      <Icon size={28} strokeWidth={1.5} className="text-accent" />
                      <h2 className={cn(typeGovernance.editorialDisplay, 'text-2xl md:text-3xl')}>
                        {product.name}
                      </h2>
                    </div>
                    <span className="font-jakarta text-xs font-bold uppercase tracking-widest text-muted">
                      {product.domain}
                    </span>
                    <p className={cn(typeGovernance.bodySm, 'mt-2')}>{product.desc}</p>

                    <a
                      href="https://github.com/sentraai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex w-fit items-center gap-2 pt-4 font-jakarta text-xs font-bold uppercase tracking-widest text-muted/60 transition-colors hover:text-muted"
                    >
                      <Github size={16} strokeWidth={1.5} />
                      Klik di sini
                    </a>
                  </div>

                  {/* Corner ticks */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute top-2.5 left-2.5 h-3 w-3 rounded-tl border-t border-l border-muted/30" />
                    <div className="absolute top-2.5 right-2.5 h-3 w-3 rounded-tr border-t border-r border-muted/30" />
                    <div className="absolute bottom-2.5 left-2.5 h-3 w-3 rounded-bl border-b border-l border-muted/30" />
                    <div className="absolute bottom-2.5 right-2.5 h-3 w-3 rounded-br border-b border-r border-muted/30" />
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <div className="font-jakarta text-lg font-semibold">Tidak ada produk</div>
                <div className={cn(typeGovernance.bodySm, 'mt-1')}>Coba reset filter status.</div>
              </div>
            )}
          </div>
        </section>

        {/* ═══ Aplikasi — per domain ═══ */}
        <section
          className={cn(
            'border-t border-muted/20 py-24',
            layoutGovernance.container.wide,
            layoutGovernance.sectionX
          )}
        >
          <p className={typeGovernance.eyebrow}>Aplikasi</p>
          <h2 className={cn(typeGovernance.sectionTitle, 'max-w-[720px]')}>
            Aplikasi Nyata di Seluruh Monorepo
          </h2>
          <p className={cn(typeGovernance.body, 'mt-4 max-w-[640px]')}>
            Di luar produk bermerek Sentra, ekosistem ini juga menopang aplikasi operasional lain
            yang berjalan di berbagai domain — melengkapi, bukan menggantikan, grid produk di atas.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {APP_DOMAINS.map((group) => (
              <div
                key={group.domain}
                className="relative overflow-hidden rounded-2xl border border-muted/20 bg-background"
              >
                {/* Header — mac window chrome */}
                <div className="flex items-center gap-3 border-b border-muted/20 px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="h-3.5 w-px bg-muted/20" />
                  <span className="font-jakarta text-xs font-bold uppercase tracking-widest text-muted">
                    domain / {group.domain.toLowerCase()}
                  </span>
                </div>
                <div className="mt-[3px] h-px bg-muted/10" />

                {/* Body — daftar aplikasi */}
                <div className="divide-y divide-muted/10 px-6 py-2 md:px-8">
                  {group.apps.map((app) => (
                    <div key={app.name} className="py-5">
                      <h3 className={cn(typeGovernance.editorialDisplay, 'text-lg md:text-xl')}>
                        {app.name}
                      </h3>
                      <p className={cn(typeGovernance.bodySm, 'mt-1.5')}>{app.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Corner ticks */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute top-2.5 left-2.5 h-3 w-3 rounded-tl border-t border-l border-muted/30" />
                  <div className="absolute top-2.5 right-2.5 h-3 w-3 rounded-tr border-t border-r border-muted/30" />
                  <div className="absolute bottom-2.5 left-2.5 h-3 w-3 rounded-bl border-b border-l border-muted/30" />
                  <div className="absolute bottom-2.5 right-2.5 h-3 w-3 rounded-br border-b border-r border-muted/30" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
