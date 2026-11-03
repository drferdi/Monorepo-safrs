"use client";

import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

// A menu button's behaviour (WAI-ARIA menu button): focus moves to the first item on open; arrows wrap, Home and End
// jump; Escape, a pointer outside or focus leaving the root closes it; Escape and choosing return focus to the trigger.
// Escape is stopped in the capture phase, so a menu inside a <dialog> closes without closing the dialog.
export function useMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key !== "Escape") return; event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape, true); };
  }, [open]);
  useEffect(() => { if (open) root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); }, [open]);
  const move = (event: ReactKeyboardEvent<HTMLElement>) => {
    const entries = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const at = entries.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (at + 1) % entries.length : event.key === "ArrowUp" ? (at <= 0 ? entries.length - 1 : at - 1) : event.key === "Home" ? 0 : event.key === "End" ? entries.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); entries[next].focus();
  };
  const leave = (event: FocusEvent<HTMLElement>) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); };
  const choose = (action: () => void) => { setOpen(false); trigger.current?.focus(); action(); };
  return { open, setOpen, root, trigger, move, leave, choose };
}
