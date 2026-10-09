"use client";

import { ArrowRight, ChevronRight, Ellipsis, ListPlus, PanelLeft, Plus, Search, SlidersHorizontal, SquarePen, UserRoundPlus, AudioLines, Command, BookOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { SidebarSubmenu } from "./sidebar-submenu";
import { PatientAvatar } from "./patient-avatar";
import type { Workspace } from "../lib/workspace";

export type DialogName = "patient" | "list" | "settings" | "search" | "context" | "scribe" | "upgrade" | "account" | "feedback" | "encounter" | "legal" | "clinical" | "commands" | "templates" | "queue" | "knowledge" | null;
interface Props { state: Workspace; open: boolean; mobile: boolean; onToggle: () => void; onDialog: (name: DialogName, id?: string) => void; onNew: (patientId?: string) => void; onSelect: (id: string) => void; onToast: (text: string) => void }

export function Sidebar({ state, open, mobile, onToggle, onDialog, onNew, onSelect, onToast }: Props) {
  const [feedback, setFeedback] = useState("");
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobile || !open) return;
    const previous = document.activeElement;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handler = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") { event.preventDefault(); onToggle(); }
      if (event.key === "Tab") {
        const controls = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)") ?? []).filter((control) => !control.closest("[inert]"));
        if (!controls?.length) return;
        const first = controls[0]; const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); if (previous instanceof HTMLElement && !document.querySelector("dialog[open]")) previous.focus(); };
  }, [mobile, open, onToggle]);
  return <>
    {open && <button className="sidebar-scrim" aria-label="Tutup navigasi" onClick={onToggle} />}
    <aside ref={ref} className={`sidebar ${open ? "is-open" : ""}`} inert={!open} aria-hidden={!open} aria-label="Navigasi workspace">
      <div className="sidebar-brand"><Brand /><button className="icon-button" aria-label="Tutup sidebar" title="Tutup sidebar" onClick={onToggle}><PanelLeft size={16}/></button></div>
      <nav className="main-nav" aria-label="Navigasi utama">
        <div className="nav-group" role="group" aria-labelledby="nav-group-start"><span className="nav-group-title" id="nav-group-start">Mulai</span>
          <button onClick={() => onNew()}><Plus/><span>Baru</span><kbd>⌘ K</kbd></button>
          <button onClick={() => onDialog("patient")}><UserRoundPlus/><span>Buat Pasien</span></button>
          <button onClick={() => onDialog("list")}><ListPlus/><span>Buat daftar Pasien</span></button>
        </div>
        <div className="nav-group" role="group" aria-labelledby="nav-group-tools"><span className="nav-group-title" id="nav-group-tools">Alat kerja</span>
          <button onClick={() => { if (mobile) onToggle(); onDialog("queue"); }}><ListPlus/><span>Antrean kerja</span></button>
          <button onClick={() => { if (mobile) onToggle(); onDialog("templates"); }}><SquarePen/><span>Templat dan favorit</span></button>
          <button onClick={() => { if (mobile) onToggle(); onDialog("knowledge"); }}><BookOpen/><span>Pustaka Klinis</span></button>
          <button onClick={() => onDialog("scribe")}><AudioLines/><span>Voice mode</span></button>
        </div>
        <div className="nav-group" role="group" aria-labelledby="nav-group-system"><span className="nav-group-title" id="nav-group-system">Sistem</span>
          <button onClick={() => { if (mobile) onToggle(); onDialog("commands"); }}><Command/><span>Command Center</span><kbd>⌘ J</kbd></button>
          <button onClick={() => onDialog("search")}><Search/><span>Cari</span><kbd>⌘ /</kbd></button>
          <button onClick={() => onDialog("settings")}><SlidersHorizontal/><span>Pengaturan Agent</span></button>
        </div>
      </nav>
      <div className="sidebar-content"><SidebarSubmenu initialSection="encounters" sections={[
        { id: "lists", title: "Daftar Pasien", action: <button className="small-icon" aria-label="Tambah daftar Pasien" onClick={() => onDialog("list")}><Plus size={12}/></button>, items: state.lists.map((list) => ({ id: list.id, label: <><ListPlus size={14}/><span>{list.name}</span><span className="count">{list.patientIds.length}</span></>, onSelect: () => onDialog("list", list.id) })), empty: <button className="empty-list" onClick={() => onDialog("list")}>Buat daftar Pasien</button> },
        { id: "patients", title: "Semua Pasien", selectedId: state.encounters.find((e) => e.id === state.activeEncounterId)?.patientId, items: state.patients.map((patient) => ({ id: patient.id, label: <><PatientAvatar sex={patient.sex} size={14}/><span>{patient.name}</span></>, onSelect: () => onDialog("patient", patient.id), actions: <><button className="small-icon" aria-label={`Edit ${patient.name}`} onClick={() => onDialog("patient", patient.id)}><Ellipsis size={13}/></button><button className="small-icon" aria-label={`Encounter baru untuk ${patient.name}`} title="Encounter baru" onClick={() => onNew(patient.id)}><SquarePen size={12}/></button></> })), empty: <button className="empty-text" onClick={() => onDialog("patient")}>Tambah Pasien pertama <Plus size={12}/></button> },
        { id: "encounters", title: "Semua Encounter", selectedId: state.activeEncounterId, items: state.encounters.map((encounter) => ({ id: encounter.id, label: <span title={encounter.title}>{encounter.title}</span>, onSelect: () => onSelect(encounter.id), actions: <button className="small-icon" aria-label={`Opsi untuk ${encounter.title}`} onClick={() => onDialog("encounter", encounter.id)}><Ellipsis size={13}/></button> })), empty: <span className="empty-text">Belum ada Encounter</span> },
      ]}/></div>
      <div className="sidebar-bottom"><form className="feedback" onSubmit={(event) => { event.preventDefault(); if (feedback.trim()) { onToast("Masukan tersimpan secara lokal. Terima kasih telah membantu mengembangkan workspace."); sessionStorage.setItem("sentrapedia-feedback", feedback); setFeedback(""); } }}><input aria-label="Masukan" placeholder="Tulis masukan di sini..." value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000}/><button aria-label="Simpan masukan" disabled={!feedback.trim()}><ArrowRight size={13}/></button></form>
        <button className="account" onClick={() => onDialog("account")}><span className="avatar">FI</span><strong>Sentrapedia</strong><span className="lite-badge">Lite</span><ChevronRight size={15}/></button>
      </div>
    </aside>
  </>;
}
