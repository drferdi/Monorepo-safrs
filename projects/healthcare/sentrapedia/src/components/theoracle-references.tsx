import type { ReactNode } from "react";
import { readableSource, theOracleReferenceItems, type TheOracleReferenceItem } from "../lib/aadi/presentation";

// Two source documents stay in view; the rest wait behind one disclosure (Gaffer, 2026-10-17).
const visible = 2;

// One line per source document; it opens to every passage under its file name (the ID and similarity stay in the stored source).
function Reference({ title, items }: { title: string; items: TheOracleReferenceItem[] }) {
  return <details className="oracle-reference">
    <summary title={title}><span>{readableSource(title)}</span>{items.length > 1 && <small>{items.length} kutipan</small>}</summary>
    {items.map(item => <div key={item.id}>
      <p className="oracle-reference-text">{item.text}</p>
      <p className="oracle-reference-meta">{item.title}</p>
    </div>)}
  </details>;
}

/** A "Kutipan pedoman" section as one-line document titles that open to their passages; other text falls back to the plain view. */
export function TheOracleReferences({ body, fallback }: { body: string; fallback: ReactNode }) {
  const documents = new Map<string, TheOracleReferenceItem[]>();
  for (const item of theOracleReferenceItems(body)) documents.set(item.title, [...(documents.get(item.title) ?? []), item]);
  if (!documents.size) return fallback;
  const all = [...documents].map(([title, items]) => <Reference key={title} title={title} items={items}/>);
  const rest = all.slice(visible);
  return <div className="oracle-references">
    {all.slice(0, visible)}
    {rest.length > 0 && <details className="oracle-more"><summary><span>{rest.length} referensi lainnya</span></summary>{rest}</details>}
  </div>;
}
