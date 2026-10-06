import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Brain,
  Calculator,
  FileSearch,
  MessageSquare,
  Mic,
  RadioTower,
  ScrollText,
  Shield,
  Stethoscope,
  Users,
  Video,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Klinis',
    items: [
      { href: '/emr', label: 'EMR Console', icon: Stethoscope },
      { href: '/telemedicine', label: 'Telemedicine', icon: Video },
      { href: '/voice', label: 'Consult Audrey', icon: Mic },
      { href: '/icdx', label: 'Smart ICD-10', icon: FileSearch },
      { href: '/calculator', label: 'SenCall', icon: Calculator },
      { href: '/critical-mind', label: 'Critical Mind', icon: Brain },
    ],
  },
  {
    label: 'Tim',
    items: [
      { href: '/hub', label: 'Sentra Hub', icon: Users },
      { href: '/acars', label: 'Sentra Network', icon: RadioTower },
      { href: '/chat', label: 'Team Chat', icon: MessageSquare },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { href: '/dashboard/intelligence', label: 'Intelligence Monitor', icon: Activity },
      { href: '/audit/logbook', label: 'Audit Log', icon: ScrollText },
      { href: '/admin', label: 'Admin', icon: Shield },
    ],
  },
]

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export const NAV_COLLAPSED_KEY = 'puskesmas:nav-collapsed'

export function readNavCollapsed(stored: string | null): boolean {
  return stored !== 'false'
}
