// Architected and built by the one and only Drferdi.

import { Instagram, MenuIcon, Youtube } from 'lucide-react'
import React from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface NavLink {
  label: string
  href: string
  external?: boolean
}

interface FloatingHeaderProps {
  crewPortalUrl?: string | null
}

export function FloatingHeader({ crewPortalUrl }: FloatingHeaderProps) {
  const [open, setOpen] = React.useState(false)

  const navLinks: NavLink[] = [
    { label: 'Layanan', href: '#services' },
    { label: 'Alur Pasien', href: '#patient-flow' },
    { label: 'Dokter', href: '#doctors' },
    { label: 'Fasilitas', href: '#facilities' },
    { label: 'Reservasi', href: '#reservation' },
  ]

  const socialLinks = [
    { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/pkm_balowerti/' },
    { icon: Youtube, label: 'YouTube', href: 'https://www.youtube.com/@puskesmasbalowertikediri' },
  ]

  function handleNavClick(
    _e: React.MouseEvent<HTMLAnchorElement>,
    _href: string,
    external?: boolean
  ) {
    if (external) {
      setOpen(false)
      return
    }
    // Biarkan global smooth scroll handler di main.tsx yang menangani offset
    setOpen(false)
  }

  return (
    <header
      className={cn(
        'sticky top-3 z-50 sm:top-4',
        'mx-auto w-full max-w-5xl rounded-xl border shadow-lg',
        'bg-white/90 supports-[backdrop-filter]:bg-white/80 backdrop-blur-lg'
      )}
    >
      <nav className="mx-auto flex items-center justify-between px-3 py-2 sm:px-4">
        {/* Logo kiri */}
        <a
          href="#hero"
          onClick={e => handleNavClick(e, '#hero')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#C9A87C]/30 flex-shrink-0">
            <img
              src="/images/logookm.png"
              alt="Logo Puskesmas"
              width="36"
              height="36"
              loading="eager"
              decoding="sync"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold text-sm text-[#2D2420] hidden sm:block">
            Puskesmas Balowerti
          </span>
        </a>

        {/* Nav links — desktop */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={e => handleNavClick(e, link.href, link.external)}
              className="font-medium tracking-[0.04em] text-[13px] text-[#2D2420] px-4 py-1.5 rounded-full bg-transparent hover:bg-[#FAF3EB] hover:text-[#C9A87C] border border-transparent hover:border-[#EADDCB] transition-all duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Kanan: logo Kediri + social + CTA + mobile menu */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 pr-3 border-r border-[#E5DDD5]">
            <img
              src="/images/logokediri.avif"
              alt="Logo Kota Kediri"
              width="80"
              height="32"
              loading="eager"
              decoding="async"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {socialLinks.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[#FAF3EB] hover:bg-[#C9A87C] group transition-colors"
              >
                <s.icon className="w-4 h-4 text-[#8B7D6F] group-hover:text-white transition-colors" />
              </a>
            ))}
          </div>

          {crewPortalUrl && (
            <a
              href={crewPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'hidden lg:inline-flex bg-[#C9A87C] hover:bg-[#B8956A] text-white border-none rounded-full px-4'
              )}
            >
              Crew Portal
            </a>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setOpen(!open)}
              className="lg:hidden"
              aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              <MenuIcon className="size-4" />
            </Button>
            <SheetContent
              id="mobile-navigation"
              className="bg-white/95 supports-[backdrop-filter]:bg-white/90 backdrop-blur-lg"
              showClose={false}
              side="left"
            >
              <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-[#FAF3EB]">
                <img
                  src="/images/logookm.png"
                  alt="Logo Puskesmas"
                  width="40"
                  height="40"
                  loading="lazy"
                  decoding="async"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-bold text-[#2D2420] text-sm">Puskesmas Balowerti</p>
                  <img
                    src="/images/logokediri.avif"
                    alt="Kota Kediri"
                    width="60"
                    height="20"
                    loading="lazy"
                    decoding="async"
                    className="h-5 w-auto mt-1"
                  />
                </div>
              </div>

              <div className="grid gap-y-1 overflow-y-auto px-4 pt-4 pb-5">
                {navLinks.map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={e => handleNavClick(e, link.href, link.external)}
                    className={cn(
                      buttonVariants({
                        variant: 'ghost',
                        className: 'justify-start text-[#2D2420]',
                      }),
                      'font-medium tracking-[0.04em]'
                    )}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <SheetFooter className="flex-row gap-2">
                <div className="flex gap-2">
                  {socialLinks.map(s => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-[#FAF3EB] hover:bg-[#C9A87C] group transition-colors"
                    >
                      <s.icon className="w-4 h-4 text-[#8B7D6F] group-hover:text-white transition-colors" />
                    </a>
                  ))}
                </div>
                {crewPortalUrl && (
                  <a
                    href={crewPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'bg-[#C9A87C] hover:bg-[#B8956A] text-white rounded-full flex-1'
                    )}
                  >
                    Crew Portal
                  </a>
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
