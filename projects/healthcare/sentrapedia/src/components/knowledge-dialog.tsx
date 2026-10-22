"use client";

import { useRef, useState } from "react";
import { theOracleCategories, theOracleDiseases, theOracleSample, theOracleSource, searchDiseases } from "../lib/theoracle";
import { Dialog } from "./dialog";
import { AadiCaseForm, type AadiAnalysis } from "./aadi-case-form";

export function KnowledgeDialog({ initialTab, onClose, onSave }: { initialTab?: string; onClose: () => void; onSave: (analysis: AadiAnalysis) => void }) {
  const [tab, setTab] = useState(initialTab === "aadi" ? "aadi" : "theoracle");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const detail = useRef<HTMLElement>(null);
  const items = searchDiseases(query, category);
  const disease = theOracleDiseases.find(d => d.id === selected);
  if (initialTab === "aadi") return <Dialog title="Analisis kasus" subtitle="Tinjau keluhan lalu mulai analisis. Data tambahan bersifat opsional." onClose={onClose}><AadiCaseForm onSave={onSave}/></Dialog>;
  return <Dialog title="Pustaka Klinis" subtitle="Katalog penyakit lokal dan analisis kasus untuk ditinjau klinisi." wide onClose={onClose}>
    <div className="workflow-tabs" role="group" aria-label="Sumber pengetahuan"><button aria-pressed={tab === "theoracle"} onClick={() => setTab("theoracle")}>Penyakit · {theOracleDiseases.length} entri</button><button aria-pressed={tab === "aadi"} onClick={() => setTab("aadi")}>Analisis kasus</button></div>
    {tab === "aadi" ? <AadiCaseForm onSave={onSave}/> : <div className="theoracle-catalog">
      <p className="panel-caption">{theOracleSample ? "Katalog contoh fiktif: database klinis Sentrapedia tidak terpasang. " : ""}Isi referensi belum diverifikasi klinis. Setiap baris dosis menyebut sumber dan halaman pedomannya. {theOracleCategories.length} kategori pada entri; metadata sumber mendefinisikan {theOracleSource.declaredCategories} kategori.</p>
      <div className="queue-filters"><label>Cari penyakit<input aria-label="Cari penyakit" value={query} placeholder="Nama, kode, atau kategori…" onChange={e => { setQuery(e.target.value); setSelected(null); }}/></label><label>Kategori<select aria-label="Kategori Oracle" value={category} onChange={e => { setCategory(e.target.value); setSelected(null); }}><option value="all">Semua kategori</option>{theOracleCategories.map(c => <option key={c}>{c}</option>)}</select></label></div>
      <p role="status">{items.length} entri ditemukan</p>
      <div className="theoracle-list">{items.map(d => <button key={d.id} aria-pressed={selected === d.id} onClick={() => { setSelected(d.id); requestAnimationFrame(() => detail.current?.scrollIntoView({ block: "nearest" })); }}><strong>{d.nama}</strong><span>{d.kode} · {d.kategori}</span></button>)}{!items.length && <p className="panel-empty">Tidak ada entri yang cocok.</p>}</div>
      {disease && <article ref={detail} key={disease.id} className="theoracle-detail"><h3>{disease.nama}</h3><p>{disease.kode} · {disease.kategori} · Record {disease.id}</p><p className="form-warning">Referensi belum ditinjau. Narasi terapi di bawah adalah isi sumber, bukan resep untuk kasus tertentu.</p>{([["definisi", "Definisi"], ["gejala", "Gejala"], ["diagnosis", "Diagnosis (narasi sumber)"], ["terapi", "Terapi (narasi sumber)"], ["rujukan", "Rujukan (narasi sumber)"]] as const).map(([key, title]) => <section key={key}><h4>{title}</h4>{key === "gejala" ? <ul>{disease.gejala.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p>{disease[key]}</p>}</section>)}<details><summary>Sumber dan batas kelengkapan</summary><p>{theOracleSource.file} · ID {disease.id} · versi {theOracleSource.version}</p><p className="source-hash">SHA-256: {theOracleSource.hash}</p><p>Pemeriksaan fisik, diagnosis banding, kriteria diagnosis, penunjang dan KIE belum tersedia sebagai bidang terpisah yang terverifikasi. Daftar referensi umum bukan kutipan per penyakit.</p></details></article>}
    </div>}
  </Dialog>;
}
