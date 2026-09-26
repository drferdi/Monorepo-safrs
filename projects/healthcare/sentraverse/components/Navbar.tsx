// Architected and built by Drferdi.
// [APPROVED]
'use client'

import { Menu, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { SentraKineticNav } from '@/components/ui/sentra-kinetic-nav'
import { siteLinks } from '@/lib/site-links'
import { cn } from '@/lib/utils'

// Semua halaman nyata (route). Section anchor homepage (About/Services/Audrey)
// tetap dapat dijangkau lewat menu overlay + scroll.
const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Story', href: siteLinks.story },
  { name: 'Asisten Medis', href: siteLinks.asistenMedis },
  { name: 'Insights', href: siteLinks.insights },
  { name: 'Sentrapedia', href: siteLinks.sentrapedia },
  { name: 'Ekosistem', href: siteLinks.ekosistem },
  { name: 'SentraWiki', href: siteLinks.sentrawiki },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-background/80 backdrop-blur-md py-4' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 flex justify-between items-center">
          {/* Logo */}
          <Link href={siteLinks.home} className="flex items-center gap-2.5">
            <Image
              src="/images/sentraverse-mark.png"
              alt="Sentraverse"
              width={32}
              height={32}
              priority
              className="h-8 w-8"
            />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground leading-tight font-jakarta">
              Sentra<span className="text-accent ml-0.5">.</span> Healthcare
              <br />
              Artificial Intelligence
            </span>
          </Link>

          {/* Desktop Links — semua halaman + indikator halaman aktif */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = link.href.startsWith('http')
                ? false
                : link.href === '/'
                  ? pathname === '/'
                  : !!pathname?.startsWith(link.href)
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative text-sm font-medium transition-colors',
                    isActive ? 'text-foreground' : 'text-muted hover:text-accent'
                  )}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-0 h-px w-full bg-accent" />
                  )}
                </Link>
              )
            })}
            <Link
              href={siteLinks.contact}
              className="group ml-1 inline-flex items-center gap-1.5 rounded-full border border-accent/30 px-4 py-1.5 text-sm font-medium text-accent/90 transition-all hover:border-accent/60 hover:bg-accent/10 hover:text-accent"
            >
              Get Started
              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Right cluster: Menu - visible on all screens */}
          <div className="flex items-center gap-3">
            <button
              className="text-foreground hover:text-accent transition-colors flex items-center gap-3"
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
            >
              <span className="hidden sm:block text-xs font-bold uppercase tracking-widest text-muted">
                Menu
              </span>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Kinetic Sidebar Navigation */}
      <SentraKineticNav isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
