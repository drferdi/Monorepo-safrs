'use client'

import { PanelLeft } from 'lucide-react'
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import Link from './motion/MotionLink'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { findNavSpot, isNavActive, NAV_COLLAPSED_KEY, NAV_GROUPS, openNavSection, readNavCollapsed, type NavItem } from './shell/nav-items'
import { useReducedMotion } from './shell/use-reduced-motion'

// The open rail follows lab.xevrion.dev/lab/sidebar-submenu (after Pranav Patel): one
// section open at a time, its items hanging off a tree, and the branch to the page
// you are on drawn in the section's tone.

const EASE_OUT = [0.23, 1, 0.32, 1] as const
// Opening and closing share one curve, so the rail's total height holds still.
const FOLD = { duration: 0.32, ease: EASE_OUT }
const SLIDE = { type: 'spring', visualDuration: 0.35, bounce: 0.12 } as const
// A section title's height, which the bar steps by.
const TITLE = 44

// Tree geometry, in px. Rows are a fixed height so the branches are one path.
const ROW = 38
const TRUNK = 8
const BEND = 7
const REACH = 22

const rowMiddle = (i: number) => i * ROW + ROW / 2
const branch = (y: number) => `M${TRUNK} ${y - BEND} Q${TRUNK} ${y} ${TRUNK + BEND} ${y} H${REACH}`

export default function AppNav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    setCollapsed(readNavCollapsed(localStorage.getItem(NAV_COLLAPSED_KEY)))
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleCollapsed() {
    setCollapsed((previous) => {
      localStorage.setItem(NAV_COLLAPSED_KEY, String(!previous))
      return !previous
    })
  }

  return (
    <nav className={collapsed ? 'app-rail' : 'app-rail app-rail--open'} aria-label="Navigasi utama">
      <button
        type="button"
        className="app-rail__toggle"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        title={collapsed ? 'Lebarkan menu (Ctrl+B)' : 'Ciutkan menu (Ctrl+B)'}
      >
        <PanelLeft size={18} strokeWidth={1.75} aria-hidden />
      </button>
      {collapsed ? <IconRail pathname={pathname} /> : <Submenu pathname={pathname} />}
    </nav>
  )
}

function IconRail({ pathname }: { pathname: string }) {
  return NAV_GROUPS.map((group) => (
    <div key={group.label} className="app-rail__group" data-tone={group.tone}>
      {group.items.map(({ href, label, icon: Icon }) => {
        const active = isNavActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'app-rail__item is-active' : 'app-rail__item'}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            title={label}
          >
            <span className="app-rail__icon">
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </span>
          </Link>
        )
      })}
    </div>
  ))
}

function Submenu({ pathname }: { pathname: string }) {
  const reduceMotion = useReducedMotion()
  const spot = findNavSpot(pathname)
  const openSection = openNavSection(pathname)

  return (
    <div className="app-submenu">
      <span aria-hidden className="app-submenu__rail" />
      {spot ? (
        <motion.span
          aria-hidden
          className="app-submenu__bar"
          initial={false}
          animate={{ y: spot.section * TITLE }}
          transition={reduceMotion ? { duration: 0 } : SLIDE}
          style={{ backgroundColor: `var(--${NAV_GROUPS[spot.section].tone})` }}
        />
      ) : null}
      {NAV_GROUPS.map((group, s) => {
        const open = openSection === s
        return (
          <div key={group.label} data-tone={group.tone}>
            <Link
              href={group.items[0].href}
              aria-expanded={open}
              onClick={(event) => open && event.preventDefault()}
              className={open ? 'app-submenu__title is-open' : 'app-submenu__title'}
            >
              {group.label}
            </Link>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  key="items"
                  className="app-submenu__fold"
                  initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: FOLD }}
                  exit={
                    reduceMotion
                      ? { opacity: 0, transition: { duration: 0.1 } }
                      : { height: 0, opacity: 0, transition: FOLD }
                  }
                >
                  <Branches
                    items={group.items}
                    active={spot?.section === s ? spot.item : null}
                    reduceMotion={reduceMotion}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

function Branches({ items, active, reduceMotion }: { items: NavItem[]; active: number | null; reduceMotion: boolean }) {
  const last = items.length - 1
  // The grey tree: a trunk down to the last item, a curved branch to each.
  const tree = [`M${TRUNK} 0 V${rowMiddle(last) - BEND}`, ...items.map((_, i) => branch(rowMiddle(i)))].join(' ')

  // The lit branch runs from the top of the trunk to the active item and follows
  // it, so moving down the list stretches it rather than redrawing it. A section opened by
  // default, with no current page in it, shows no lit branch.
  const y = useMotionValue(rowMiddle(active ?? 0))
  const lit = useTransform(y, (v) => `M${TRUNK} 0 V${v - BEND} Q${TRUNK} ${v} ${TRUNK + BEND} ${v} H${REACH}`)
  useEffect(() => {
    if (active === null) return
    const target = rowMiddle(active)
    if (reduceMotion) y.jump(target)
    else animate(y, target, SLIDE)
  }, [active, reduceMotion, y])

  return (
    <div className="app-submenu__branches">
      <svg
        aria-hidden
        className="app-submenu__tree"
        width={REACH}
        height={items.length * ROW}
        fill="none"
        strokeWidth={1.25}
        strokeLinecap="round"
      >
        <path d={tree} className="app-submenu__tree-path" />
        {active === null ? null : (
          <motion.path
            d={lit}
            className="app-submenu__lit-path"
            // Drawn down from the section title as the section opens.
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.08 }}
          />
        )}
      </svg>
      <ul className="app-submenu__list">
        {items.map(({ href, label, icon: Icon }, i) => {
          const on = i === active
          return (
            <motion.li
              key={href}
              // Items settle in one after another as the section opens.
              initial={reduceMotion ? false : { opacity: 0, y: -4, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.05 + i * 0.04 }}
            >
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={on ? 'app-submenu__item is-active' : 'app-submenu__item'}
              >
                <Icon className="app-submenu__icon" size={17} strokeWidth={2} aria-hidden />
                <span className="app-submenu__label">{label}</span>
              </Link>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
