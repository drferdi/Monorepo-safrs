"use client";

import { useEffect, useRef, useState } from "react";
import { containsIdentity, emptyCase, validCase, validResult, type MiraAnalysis } from "../lib/mira/contract";
import type { CaseState } from "../lib/mira/types";
import { miraDraft } from "../lib/mira/presentation";
import { PixelLoader } from "./pixel-loader";


export type { MiraAnalysis } from "../lib/mira/contract";
const list = (value: string) => value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const vitalLabels: Record<keyof CaseState["vitals"], string> = { systolic: "Sistolik (mmHg)", diastolic: "Diastolik (mmHg)", heartRate: "Nadi / menit", respiratoryRate: "Napas / menit", temperature: "Suhu (°C)", spo2: "SpO₂ (%)", gcs: "GCS" };

export function MiraCaseForm({ initialCase, saveOnSuccess = false, onSave }: { initialCase?: CaseState; saveOnSuccess?: boolean; onSave: (analysis: MiraAnalysis) => void }) {
  const [caseData, setCase] = useState<CaseState>(() => initialCase ? structuredClone(initialCase) : emptyCase());
  const [listText, setListText] = useState(() => ({ physicalExam: initialCase?.physicalExam.join("\n") ?? "", currentMedications: initialCase?.currentMedications.join("\n") ?? "", knownConditions: initialCase?.knownConditions.join("\n") ?? "", allergies: initialCase?.allergies.join("\n") ?? "", facilityCapabilities: initialCase?.facilityCapabilities.join("\n") ?? "" }));
  const [synthetic, setSynthetic] = useState(false);
  const [connection, setConnection] = useState<{ reachable: boolean; configured: boolean; modelReady: boolean } | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [analysis, setAnalysis] = useState<MiraAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { const healthController = new AbortController(); fetch("/api/mira", { cache: "no-store", signal: healthController.signal }).then(async response => { const data: unknown = await response.json(); if (!response.ok || !data || typeof data !== "object" || !("reachable" in data) || !("configured" in data) || typeof data.reachable !== "boolean" || typeof data.configured !== "boolean" || !("modelReady" in data) || typeof data.modelReady !== "boolean") throw new Error("health"); setConnection({ reachable: data.reachable, configured: data.configured, modelReady: data.modelReady }); setConnectionError(""); }).catch(() => { if (!healthController.signal.aborted) { setConnection(null); setConnectionError("Status koneksi belum dapat diperiksa."); } }); return () => healthController.abort(); }, [refresh]);
  useEffect(() => () => controller.current?.abort(), []);
  function update(next: CaseState) { setCase(next); setAnalysis(null); setError(""); }
  async function analyze() {
    if (busy || !synthetic || !validCase(caseData) || !connection?.configured || !connection.modelReady) return;
    if (containsIdentity(JSON.stringify(caseData))) { setError("Hapus pola identitas dari input. Gunakan kasus fiktif tanpa nama, nomor identitas, kontak atau alamat."); return; }
    const snapshot = structuredClone(caseData);
    const abort = new AbortController(); controller.current = abort; setBusy(true); setError(""); setAnalysis(null);
    try {
      const response = await fetch("/api/mira", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case: snapshot, synthetic: true }), signal: abort.signal });
      const data: unknown = await response.json();
      if (!response.ok) { const message = data && typeof data === "object" && "error" in data && data.error && typeof data.error === "object" && "message" in data.error && typeof data.error.message === "string" ? data.error.message : "Analisis belum tersedia."; throw new Error(message); }
      if (!data || typeof data !== "object" || !("result" in data) || !validResult(data.result) || data.result.status !== "ok" || !("traceId" in data) || typeof data.traceId !== "string" || !("createdAt" in data) || typeof data.createdAt !== "string" || !Number.isFinite(Date.parse(data.createdAt))) throw new Error("Respons analisis tidak dapat diverifikasi.");
      if (abort.signal.aborted) return;
      const next = { case: snapshot, result: data.result, traceId: data.traceId, createdAt: data.createdAt };
      if (saveOnSuccess) onSave(next); else setAnalysis(next);
    } catch (reason) { if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : "Analisis belum tersedia."); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  return <div className="mira-form">
    <div className="notice"><span><strong>{connection ? connection.reachable ? "Layanan analisis merespons" : "Layanan analisis belum tersedia" : "Memeriksa koneksi analisis…"}</strong><p>{connection === null ? "Status konfigurasi belum tersedia." : connection.configured ? "Koneksi server dikonfigurasi. Pemeriksaan koneksi tidak menjalankan analisis." : "Token koneksi belum dikonfigurasi. Analisis belum dapat dijalankan."}</p>{connection && !connection.modelReady && <p>Layanan analisis belum siap. Tidak ada analisis dijalankan.</p>}{connectionError && <p>{connectionError}</p>}</span><button type="button" className="text-button" onClick={() => setRefresh(n => n + 1)}>Periksa lagi</button></div>
    <p className="panel-caption">{initialCase ? "Kasus dari kolom utama dimuat untuk ditinjau. Keluhan, usia, jenis kelamin dan konteks yang tercatat ditampilkan; nama dan ID Patient tidak disertakan. Periksa dan hapus identitas dari narasi sebelum mengonfirmasi data fiktif." : "Isi data kasus fiktif secara eksplisit. Identitas dan catatan Patient tidak disalin otomatis."} Kolom kosong berarti belum diberikan. Anggaran layanan US$0,10 per analisis dan US$1 per hari; biaya aktual tercatat pada hasil. Hasil belum tervalidasi klinis.</p>
    <form onSubmit={event => { event.preventDefault(); void analyze(); }}>
      <fieldset disabled={busy} className="workflow-form mira-fields">
        <label>Keluhan utama (wajib)<textarea aria-label="Keluhan utama kasus" rows={3} required maxLength={3000} value={caseData.chiefComplaint} onChange={e => update({ ...caseData, chiefComplaint: e.target.value })}/></label>
        {initialCase && <p className="panel-caption">Usia: {caseData.demographics.ageYears ?? "belum diberikan"} · Jenis kelamin: {caseData.demographics.sex === "M" ? "Laki-laki" : caseData.demographics.sex === "F" ? "Perempuan" : "belum diberikan"}<br/>Konteks: {caseData.anamnesis.freeText || "belum diberikan"}</p>}
        <details open={!initialCase}><summary>Data tambahan (opsional)</summary>
        <div className="mira-grid"><label>Usia (tahun)<input aria-label="Usia kasus" type="number" min={0} max={130} step="any" value={caseData.demographics.ageYears ?? ""} onChange={e => update({ ...caseData, demographics: { ...caseData.demographics, ageYears: e.target.value === "" ? null : Number(e.target.value) } })}/></label><label>Jenis kelamin<select aria-label="Jenis kelamin kasus" value={caseData.demographics.sex} onChange={e => update({ ...caseData, demographics: { ...caseData.demographics, sex: e.target.value as CaseState["demographics"]["sex"] } })}><option value="unknown">Belum diberikan</option><option value="M">Laki-laki</option><option value="F">Perempuan</option></select></label><label>Kehamilan<select aria-label="Kehamilan kasus" value={caseData.demographics.pregnant === undefined ? "unknown" : caseData.demographics.pregnant ? "yes" : "no"} onChange={e => { const demographics = { ...caseData.demographics }; if (e.target.value === "unknown") delete demographics.pregnant; else demographics.pregnant = e.target.value === "yes"; update({ ...caseData, demographics }); }}><option value="unknown">Belum diberikan</option><option value="yes">Hamil</option><option value="no">Tidak hamil</option></select></label></div>
        <label>Anamnesis<textarea aria-label="Anamnesis kasus" rows={3} maxLength={6000} value={caseData.anamnesis.freeText ?? ""} onChange={e => update({ ...caseData, anamnesis: { freeText: e.target.value } })}/></label>
        <details><summary>Tanda vital</summary><div className="mira-grid">{Object.entries(vitalLabels).map(([key, label]) => <label key={key}>{label}<input aria-label={label} type="number" step="any" value={caseData.vitals[key as keyof CaseState["vitals"]] ?? ""} onChange={e => { const vitals = { ...caseData.vitals }; if (e.target.value === "") delete vitals[key as keyof CaseState["vitals"]]; else vitals[key as keyof CaseState["vitals"]] = Number(e.target.value); update({ ...caseData, vitals }); }}/></label>)}</div></details>
        {([["physicalExam", "Pemeriksaan fisik"], ["currentMedications", "Obat saat ini"], ["knownConditions", "Kondisi yang diketahui"], ["allergies", "Alergi yang diketahui"], ["facilityCapabilities", "Kemampuan fasilitas"]] as const).map(([key, label]) => <label key={key}>{label} (satu per baris)<textarea aria-label={`${label} kasus`} rows={2} maxLength={2000} value={listText[key]} onChange={e => { setListText(previous => ({ ...previous, [key]: e.target.value })); update({ ...caseData, [key]: list(e.target.value) }); }}/></label>)}
        <details><summary>Hasil pemeriksaan penunjang ({caseData.results.length})</summary>{caseData.results.map((item, index) => <div className="mira-lab" key={index}><input aria-label={`Nama hasil ${index + 1}`} placeholder="Nama pemeriksaan" maxLength={100} value={item.name} onChange={e => update({ ...caseData, results: caseData.results.map((r, i) => i === index ? { ...r, name: e.target.value } : r) })}/><input aria-label={`Nilai hasil ${index + 1}`} placeholder="Nilai / laporan" maxLength={1000} value={item.value} onChange={e => update({ ...caseData, results: caseData.results.map((r, i) => i === index ? { ...r, value: e.target.value } : r) })}/><input aria-label={`Satuan hasil ${index + 1}`} placeholder="Satuan" maxLength={50} value={item.unit ?? ""} onChange={e => update({ ...caseData, results: caseData.results.map((r, i) => i === index ? { ...r, unit: e.target.value } : r) })}/><select aria-label={`Status hasil ${index + 1}`} value={item.flag ?? "unknown"} onChange={e => { const next = { ...item }; if (e.target.value === "unknown") delete next.flag; else next.flag = e.target.value as "normal" | "abnormal"; update({ ...caseData, results: caseData.results.map((r, i) => i === index ? next : r) }); }}><option value="unknown">Belum dinilai</option><option value="normal">Normal</option><option value="abnormal">Abnormal</option></select><button type="button" className="text-button" onClick={() => update({ ...caseData, results: caseData.results.filter((_, i) => i !== index) })}>Hapus hasil</button></div>)}<button type="button" className="button" disabled={caseData.results.length >= 20} onClick={() => update({ ...caseData, results: [...caseData.results, { name: "", value: "" }] })}>Tambah hasil</button></details>
        </details>
        <label className="mira-confirm"><input type="checkbox" checked={synthetic} onChange={e => { setSynthetic(e.target.checked); setAnalysis(null); }}/>Saya menggunakan data fiktif tanpa identitas pribadi.</label>
      </fieldset>
      <div className="workflow-actions"><button className="button primary" disabled={busy || !synthetic || !validCase(caseData) || !connection?.configured || !connection.reachable || !connection.modelReady}>{saveOnSuccess ? "Analisis dan tambahkan draf" : "Analisis kasus"}</button>{busy && <><PixelLoader label="Sedang menganalisis kasus…"/><button type="button" className="button" onClick={() => { controller.current?.abort(); setBusy(false); setError("Analisis dibatalkan. Tidak ada hasil disimpan."); }}>Batalkan analisis</button></>}</div>
    </form>
    {error && <p className="form-warning" role="alert">{error}</p>}
    {analysis && <section className="mira-result"><h3>Hasil analisis · belum ditinjau</h3><p className="panel-caption">Tingkat keyakinan berasal dari model. Kutipan halaman PNPK belum tersedia. Pertimbangan rujukan perlu dinilai klinisi.</p><pre>{miraDraft(analysis.result, analysis.traceId, analysis.createdAt, analysis.case)}</pre><button className="button primary" onClick={() => onSave(analysis)}>Simpan sebagai draf untuk ditinjau</button></section>}
  </div>;
}
