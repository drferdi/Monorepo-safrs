"use client";

import { ArrowLeft, ChevronRight, Ellipsis, Folder, Plus, Search, SquarePen, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { Dialog } from "./dialog";
import { PatientAvatar } from "./patient-avatar";
import { encounterDate, encounterMeta, encounterTitle, filterEncounters, recentEncounters } from "../lib/nav-format";
import type { Encounter, Patient, Workspace } from "../lib/workspace";

const sexLabels: Record<string, string> = { Female: "Perempuan", Male: "Laki-laki", Other: "Lainnya" };
const patientFacts = (patient: Patient) => [patient.age && `${patient.age} th`, sexLabels[patient.sex]].filter(Boolean).join(" · ");
const encountersOf = (state: Workspace, patientId: string) => recentEncounters(state.encounters.filter((item) => item.patientId === patientId), Infinity);

function EncounterRows({ encounters, state, onSelect, onOptions }: { encounters: Encounter[]; state: Workspace; onSelect: (id: string) => void; onOptions: (id: string) => void }) {
  return <ul className="page-list">{encounters.map((encounter) => <li key={encounter.id} className="page-row">
    <button className="page-row-main" onClick={() => onSelect(encounter.id)}><span className="page-row-text"><strong>{encounterTitle(encounter)}</strong><small>{encounterDate(encounter)} · {encounterMeta(encounter, state.patients)}</small></span><span className="page-row-badge">{encounter.messages.length ? `${encounter.messages.length} pesan` : "Kosong"}</span></button>
    <button className="small-icon" aria-label={`Opsi untuk ${encounterTitle(encounter)}`} onClick={() => onOptions(encounter.id)}><Ellipsis size={14}/></button>
  </li>)}</ul>;
}

export function EncounterListPage({ state, onSelect, onOptions }: { state: Workspace; onSelect: (id: string) => void; onOptions: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [patientId, setPatientId] = useState("");
  const encounters = filterEncounters(state.encounters, state.patients, { query, patientId });
  return <section className="page" aria-labelledby="page-title">
    <header className="page-header"><div><h1 id="page-title">Semua Encounter</h1><p>{state.encounters.length} encounter, terbaru di atas.</p></div></header>
    <div className="page-filters"><label className="search-input"><Search size={16}/><input aria-label="Cari encounter" placeholder="Cari judul, konteks, atau pasien..." value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <select aria-label="Saring menurut pasien" value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Semua pasien</option><option value="none">Tanpa pasien</option>{state.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></div>
    {encounters.length ? <EncounterRows encounters={encounters} state={state} onSelect={onSelect} onOptions={onOptions}/> : <p className="page-empty">{state.encounters.length ? "Tidak ada encounter yang cocok." : "Belum ada encounter."}</p>}
  </section>;
}

export function PatientListPage({ state, onOpen, onNew }: { state: Workspace; onOpen: (id: string) => void; onNew: () => void }) {
  return <section className="page" aria-labelledby="page-title">
    <header className="page-header"><div><h1 id="page-title">Semua Pasien</h1><p>{state.patients.length} pasien di workspace ini.</p></div><button className="button" onClick={onNew}><UserRoundPlus size={14}/>Pasien baru</button></header>
    {state.patients.length ? <ul className="page-list">{state.patients.map((patient) => { const encounters = encountersOf(state, patient.id); return <li key={patient.id} className="page-row">
      <button className="page-row-main" onClick={() => onOpen(patient.id)}><PatientAvatar sex={patient.sex} size={22}/><span className="page-row-text"><strong>{patient.name}</strong><small>{[patientFacts(patient), `${encounters.length} encounter`, encounters[0] && `terakhir ${encounterDate(encounters[0])}`].filter(Boolean).join(" · ")}</small></span><ChevronRight size={15}/></button>
    </li>; })}</ul> : <p className="page-empty">Belum ada pasien.</p>}
  </section>;
}

export function PatientDetailPage({ state, patient, onBack, onEdit, onNewEncounter, onSelect, onOptions }: { state: Workspace; patient: Patient; onBack: () => void; onEdit: () => void; onNewEncounter: () => void; onSelect: (id: string) => void; onOptions: (id: string) => void }) {
  const encounters = encountersOf(state, patient.id);
  const lists = state.lists.filter((list) => list.patientIds.includes(patient.id));
  return <section className="page" aria-labelledby="page-title">
    <button className="text-button page-back" onClick={onBack}><ArrowLeft size={13}/>Semua Pasien</button>
    <header className="page-header"><div className="page-patient"><PatientAvatar sex={patient.sex} size={36}/><div><h1 id="page-title">{patient.name}</h1><p>{patientFacts(patient) || "Data dasar belum diisi."}</p></div></div><div className="page-actions"><button className="button" onClick={onEdit}><SquarePen size={14}/>Edit pasien</button><button className="button primary" onClick={onNewEncounter}><Plus size={14}/>Encounter baru</button></div></header>
    {patient.notes && <p className="page-notes">{patient.notes}</p>}
    {lists.length > 0 && <div className="page-chips">{lists.map((list) => <span key={list.id} className="action-chip"><Folder size={12}/>{list.name}</span>)}</div>}
    <h2 className="page-subtitle">Riwayat encounter <span>{encounters.length}</span></h2>
    {encounters.length ? <EncounterRows encounters={encounters} state={state} onSelect={onSelect} onOptions={onOptions}/> : <p className="page-empty">Belum ada encounter untuk pasien ini.</p>}
  </section>;
}

export function PatientCollectionsPage({ state, onOpen, onNew, onPatient }: { state: Workspace; onOpen: (id: string) => void; onNew: () => void; onPatient: (id: string) => void }) {
  return <section className="page" aria-labelledby="page-title">
    <header className="page-header"><div><h1 id="page-title">Koleksi Pasien</h1><p>Kelompokkan pasien yang sedang ditangani.</p></div><button className="button" onClick={onNew}><Plus size={14}/>Koleksi baru</button></header>
    {state.lists.length ? <ul className="page-list">{state.lists.map((list) => { const members = state.patients.filter((patient) => list.patientIds.includes(patient.id)); return <li key={list.id} className="page-card">
      <button className="page-row-main" onClick={() => onOpen(list.id)}><Folder size={16}/><span className="page-row-text"><strong>{list.name}</strong><small>{members.length} pasien</small></span><SquarePen size={14}/></button>
      {members.length > 0 && <div className="page-chips">{members.map((patient) => <button key={patient.id} className="action-chip" onClick={() => onPatient(patient.id)}><PatientAvatar sex={patient.sex} size={12}/>{patient.name}</button>)}</div>}
    </li>; })}</ul> : <p className="page-empty">Belum ada koleksi pasien.</p>}
  </section>;
}

/** The one way to start an encounter: choose its patient, add a new one, or go on without. */
export function NewEncounterDialog({ state, onPick, onNewPatient, onWithout, onClose }: { state: Workspace; onPick: (patientId: string) => void; onNewPatient: () => void; onWithout: () => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const patients = state.patients.filter((patient) => patient.name.toLowerCase().includes(term));
  return <Dialog title="Encounter Baru" subtitle="Pilih pasien untuk encounter ini." onClose={onClose}>
    <label className="search-input"><Search size={16}/><input aria-label="Cari pasien" autoFocus placeholder="Cari pasien..." value={query} onChange={(event) => setQuery(event.target.value)}/></label>
    <div className="search-results new-encounter-results">
      <button onClick={onNewPatient}><UserRoundPlus size={16}/><span>Pasien baru</span><span className="result-type">Buat lalu mulai</span></button>
      {patients.map((patient) => { const last = encountersOf(state, patient.id)[0]; return <button key={patient.id} onClick={() => onPick(patient.id)}><PatientAvatar sex={patient.sex} size={16}/><span>{patient.name}</span><span className="result-type">{last ? `terakhir ${encounterDate(last)}` : "Belum ada encounter"}</span></button>; })}
      {!patients.length && term && <p className="page-empty">Tidak ada pasien bernama “{query}”.</p>}
    </div>
    <div className="dialog-footer"><button className="text-button push-left" onClick={onWithout}>Lanjut tanpa pasien</button></div>
  </Dialog>;
}
