'use client'

import { useEffect, type RefObject } from 'react'

// Focus mode: the section being filled stays clear and the ones below fade back,
// so the form reads one step at a time instead of all at once.
export function sectionsToDim<T>(sections: readonly T[], active: unknown): T[] {
  const index = sections.findIndex((section) => section === active)
  return index < 0 ? [] : sections.slice(index + 1)
}

const DIM_ATTRIBUTE = 'data-spotlight-dim'

export function useFocusSpotlight(containerRef: RefObject<HTMLElement | null>, selector: string): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const apply = (active: Element | null) => {
      const sections = Array.from(container.querySelectorAll(selector))
      // A section nested inside the active one is part of it, not "below" it.
      const dim = new Set(sectionsToDim(sections, active).filter((section) => !active?.contains(section)))
      for (const section of sections) section.toggleAttribute(DIM_ATTRIBUTE, dim.has(section))
    }
    const onFocusIn = (event: FocusEvent) => {
      apply(event.target instanceof Element ? event.target.closest(selector) : null)
    }
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && container.contains(event.relatedTarget))) apply(null)
    }

    container.addEventListener('focusin', onFocusIn)
    container.addEventListener('focusout', onFocusOut)
    return () => {
      container.removeEventListener('focusin', onFocusIn)
      container.removeEventListener('focusout', onFocusOut)
      apply(null)
    }
  }, [containerRef, selector])
}
