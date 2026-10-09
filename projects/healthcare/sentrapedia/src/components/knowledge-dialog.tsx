"use client";

import { useRef, useState } from "react";
import { oracleCategories, oracleDiseases, oracleSource, searchDiseases } from "../lib/oracle";
import { Dialog } from "./dialog";
import { MiraCaseForm, type MiraAnalysis } from "./mira-case-form";
import type { CaseState } from "../lib/mira/types";

export function KnowledgeDialog({ initialTab, initialCase, saveOnSuccess, onClose, onSave }: { initialTab?: string; initialCase?: CaseState; saveOnSuccess?: boolean; onClose: () => void; onSave: (analysis: MiraAnalysis) => void }) {
  const [tab, setTab] = useState(initialTab === "mira" ? "mira" : "oracle");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const detail = useRef<HTMLElement>(null);
  const items = searchDiseases(query, category);
  const disease = oracleDiseases.find(d => d.id === selected);
  if (initialCase || initialTab === "mira") return <Dialog title="Analisis kasus" subtitle="Tinjau keluhan lalu mulai analisis. Data tambahan bersifat opsional." onClose={onClose}><MiraCaseForm initialCase={initialCase} saveOnSuccess={saveOnSuccess} onSave={onSave}/></Dialog>;
  return <Dialog title="Pustaka Klinis" subtitle="Katalog penyakit lokal dan analisis kasus untuk ditinjau klinisi." wide onClose={onClose}>
    <div className="workflow-tabs" role="group" aria-label="Sumber pengetahuan"><button aria-pressed={tab === "oracle"} onClick={() => setTab("oracle")}>Penyakit · {oracleDiseases.length} entri</button><button aria-pressed={tab === "mira"} onClick={() => setTab("mira")}>Analisis kasus</button></div>
    {tab === "mira" ? <MiraCaseForm initialCase={initialCase} saveOnSuccess={saveOnSuccess} onSave={onSave}/> : <div className="oracle-catalog">
      <p className="panel-caption">Isi referensi belum diverifikasi klinis. Kutipan halaman PNPK belum tersedia. {oracleCategories.length} kategori pada entri; metadata sumber mendefinisikan {oracleSource.declaredCategories} kategori.</p>
      <div className="queue-filters"><label>Cari penyakit<input aria-label="Cari penyakit" value={query} placeholder="Nama, kode, atau kategori…" onChange={e => { setQuery(e.target.value); setSelected(null); }}/></label><label>Kategori<select aria-label="Kategori Oracle" value={category} onChange={e => { setCategory(e.target.value); setSelected(null); }}><option value="all">Semua kategori</option>{oracleCategories.map(c => <option key={c}>{c}</option>)}</select></label></div>
      <p role="status">{items.length} entri ditemukan</p>
      <div className="oracle-list">{items.map(d => <button key={d.id} aria-pressed={selected === d.id} onClick={() => { setSelected(d.id); requestAnimationFrame(() => detail.current?.scrollIntoView({ block: "nearest" })); }}><strong>{d.nama}</strong><span>{d.kode} · {d.kategori}</span></button>)}{!items.length && <p className="panel-empty">Tidak ada entri yang cocok.</p>}</div>
      {disease && <article ref={detail} className="oracle-detail"><h3>{disease.nama}</h3><p>{disease.kode} · {disease.kategori} · Record {disease.id}</p><p className="form-warning">Referensi belum ditinjau. Narasi terapi di bawah adalah isi sumber, bukan resep untuk kasus tertentu.</p>{([["definisi", "Definisi"], ["gejala", "Gejala"], ["diagnosis", "Diagnosis (narasi sumber)"], ["terapi", "Terapi (narasi sumber)"], ["rujukan", "Rujukan (narasi sumber)"]] as const).map(([key, title]) => <section key={key}><h4>{title}</h4>{key === "gejala" ? <ul>{disease.gejala.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p>{disease[key]}</p>}</section>)}<details><summary>Sumber dan batas kelengkapan</summary><p>{oracleSource.file} · ID {disease.id} · versi {oracleSource.version}</p><p className="source-hash">SHA-256: {oracleSource.hash}</p><p>Pemeriksaan fisik, diagnosis banding, kriteria diagnosis, penunjang dan KIE belum tersedia sebagai bidang terpisah yang terverifikasi. Daftar referensi umum bukan kutipan per penyakit.</p></details></article>}
    </div>}
  </Dialog>;
}
