"use client";

import { useState } from "react";
import { readableSource, type TheOracleReferenceItem } from "../lib/aadi/presentation";

// Two passages stay in view; the rest wait behind one count (Gaffer, 2026-10-17, kept in the Glass shape).
const visible = 2;

/** The "Kutipan pedoman" passages as numbered cards that in-text `[n]` markers link to. */
export function GuidelineCitations({ items, idPrefix }: { items: TheOracleReferenceItem[]; idPrefix: string }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const shown = open ? items : items.slice(0, visible);
  const rest = items.length - visible;
  return <section className="guideline-citations" aria-label="Kutipan pedoman">
    <h3>Kutipan pedoman</h3>
    <ol>{shown.map((item, index) => <li key={item.id} id={`${idPrefix}-${index + 1}`} className="guideline-citation">
      <p className="guideline-citation-head"><strong>{readableSource(item.title)}</strong><code>{item.id.slice(0, 8)}</code><span className="guideline-citation-tag">Terverifikasi</span></p>
      <p className="guideline-citation-text">{item.text}</p>
    </li>)}</ol>
    {rest > 0 && <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Lipat kutipan" : `Tampilkan ${rest} kutipan lagi`}</button>}
  </section>;
}
