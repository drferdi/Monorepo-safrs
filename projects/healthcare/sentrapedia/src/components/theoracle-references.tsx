import type { ReactNode } from "react";
import { theOracleReferenceItems, type TheOracleReferenceItem } from "../lib/mira/presentation";

// Two source documents stay in view; the rest wait behind one disclosure (Gaffer, 2026-10-17).
const visible = 2;
// "infeksi-dengue-pada-dewasa.md" reads as "Infeksi dengue pada dewasa"; the file name stays in the opened reference.
const readable = (file: string) => { const name = file.replace(/\.(md|pdf)$/i, "").replace(/[-_]+/g, " ").trim(); return name.charAt(0).toUpperCase() + name.slice(1); };

// One line per source document; it opens to every passage taken from that document.
function Reference({ title, items }: { title: string; items: TheOracleReferenceItem[] }) {
  return <details className="oracle-reference">
    <summary title={title}><span>{readable(title)}</span>{items.length > 1 && <small>{items.length} kutipan</small>}</summary>
    {items.map(item => <div key={item.id}>
      <p className="oracle-reference-text">{item.text}</p>
      <p className="oracle-reference-meta">{item.title} · kemiripan {item.similarity} · {item.id}</p>
    </div>)}
  </details>;
}

/** A "Referensi TheOracle" section as one-line document titles that open to their passages; other text falls back to the plain view. */
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
