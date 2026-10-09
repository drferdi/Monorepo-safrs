"use client";

import { ArrowRight, AudioLines, BookOpen, ChevronRight, Command, Ellipsis, Folder, House, ListTodo, PanelLeft, Plus, Search, SlidersHorizontal, SquarePen, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { SidebarSubmenu } from "./sidebar-submenu";
import { encounterMeta, encounterTitle, recentEncounters } from "../lib/nav-format";
import type { View } from "../lib/nav-tree";
import type { Workspace } from "../lib/workspace";

export type DialogName = "patient" | "list" | "settings" | "search" | "context" | "scribe" | "upgrade" | "account" | "feedback" | "encounter" | "legal" | "clinical" | "commands" | "templates" | "queue" | "knowledge" | "new-encounter" | null;
interface Props { state: Workspace; activeItem: string; open: boolean; mobile: boolean; onToggle: () => void; onDialog: (name: DialogName, id?: string) => void; onHome: () => void; onPage: (view: View) => void; onSelect: (id: string) => void; onToast: (text: string) => void }

export function Sidebar({ state, activeItem, open, mobile, onToggle, onDialog, onHome, onPage, onSelect, onToast }: Props) {
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
  // On a phone the drawer gives way to whatever the reader chose.
  const go = (action: () => void) => () => { if (mobile) onToggle(); action(); };
  const recent = recentEncounters(state.encounters);
  return <>
    {open && <button className="sidebar-scrim" aria-label="Tutup navigasi" onClick={onToggle} />}
    <aside ref={ref} className={`sidebar ${open ? "is-open" : ""}`} inert={!open} aria-hidden={!open} aria-label="Navigasi workspace">
      <div className="sidebar-brand"><Brand /><button className="icon-button" aria-label="Tutup sidebar" title="Tutup sidebar" onClick={onToggle}><PanelLeft size={16}/></button></div>
      <div className="sidebar-actions">
        <button className="button primary new-encounter" onClick={go(() => onDialog("new-encounter"))}><Plus size={15}/>Encounter Baru</button>
        <button className="sidebar-search" onClick={go(() => onDialog("search"))}><Search size={14}/><span>Cari pasien atau encounter...</span><kbd>⌘K</kbd></button>
      </div>
      <nav className="main-nav sidebar-content" aria-label="Navigasi utama">
        <div className="nav-label">RUANG KERJA</div>
        <button className="nav-leaf" aria-current={activeItem === "home" ? "page" : undefined} onClick={go(onHome)}><House/><span>Beranda</span></button>
        <SidebarSubmenu initialOpen={["patients", "encounters"]} activeItemId={activeItem} memoryKey="sentrapedia-nav-v2" sections={[
          { id: "patients", title: "Pasien", count: state.patients.length, action: <button className="small-icon" aria-label="Tambah pasien" title="Tambah pasien" onClick={go(() => onDialog("patient"))}><Plus size={12}/></button>, items: [
            { id: "all-patients", label: <><Users/><span>Semua Pasien</span></>, onSelect: go(() => onPage({ page: "patients" })) },
            { id: "lists", label: <><Folder/><span>Koleksi Pasien</span><span className="count">{state.lists.length}</span></>, onSelect: go(() => onPage({ page: "lists" })), actions: <button className="small-icon" aria-label="Buat koleksi pasien" title="Buat koleksi pasien" onClick={go(() => onDialog("list"))}><Plus size={12}/></button> },
          ] },
          { id: "encounters", title: "Encounter", count: state.encounters.length, row: 46, caption: <div className="submenu-caption">{recent.length ? "TERBARU" : "Belum ada encounter"}</div>, items: [
            ...recent.map((encounter) => ({ id: encounter.id, label: <span className="encounter-label"><strong title={encounterTitle(encounter)}>{encounterTitle(encounter)}</strong><small>{encounterMeta(encounter, state.patients)}</small></span>, onSelect: go(() => onSelect(encounter.id)), actions: <button className="small-icon" aria-label={`Opsi untuk ${encounterTitle(encounter)}`} onClick={go(() => onDialog("encounter", encounter.id))}><Ellipsis size={13}/></button> })),
            { id: "all-encounters", label: <><ArrowRight/><span>Lihat semua encounter</span></>, onSelect: go(() => onPage({ page: "encounters" })) },
          ] },
          { id: "tools", title: "Alat Klinis", items: [
            { id: "knowledge", label: <><BookOpen/><span>Referensi</span></>, onSelect: go(() => onDialog("knowledge")) },
            { id: "queue", label: <><ListTodo/><span>Antrean kerja</span></>, onSelect: go(() => onDialog("queue")) },
            { id: "templates", label: <><SquarePen/><span>Templat dan favorit</span></>, onSelect: go(() => onDialog("templates")) },
            { id: "scribe", label: <><AudioLines/><span>Voice mode</span></>, onSelect: go(() => onDialog("scribe")) },
          ] },
        ]}/>
      </nav>
      <div className="sidebar-bottom">
        <nav className="main-nav" aria-label="Pengaturan"><SidebarSubmenu initialOpen={[]} activeItemId={activeItem} sections={[
          { id: "settings-group", title: "Pengaturan", items: [
            { id: "settings", label: <><SlidersHorizontal/><span>Pengaturan Agent</span></>, onSelect: go(() => onDialog("settings")) },
            { id: "commands", label: <><Command/><span>Command Center</span><kbd>⌘J</kbd></>, onSelect: go(() => onDialog("commands")) },
          ] },
        ]}/></nav>
        <form className="feedback" onSubmit={(event) => { event.preventDefault(); if (feedback.trim()) { onToast("Masukan tersimpan secara lokal. Terima kasih telah membantu mengembangkan workspace."); sessionStorage.setItem("sentrapedia-feedback", feedback); setFeedback(""); } }}><input aria-label="Masukan" placeholder="Tulis masukan di sini..." value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000}/><button aria-label="Simpan masukan" disabled={!feedback.trim()}><ArrowRight size={13}/></button></form>
        <button className="account" onClick={() => onDialog("account")}><span className="avatar">FI</span><strong>Sentrapedia</strong><span className="lite-badge">Lite</span><ChevronRight size={15}/></button>
      </div>
    </aside>
  </>;
}
