"use client";

import { ArrowDownToLine, ChevronDown, Command, FileText, Maximize2, Menu, Minimize2, Sparkles } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";
import type { Encounter, WorkspaceAction } from "../lib/workspace";
import { Composer } from "./composer";
import { MessageCard } from "./message-card";
import { ThinkingCard } from "./thinking-card";
import { WorkspaceGreeting } from "./workspace-greeting";

type ComposerProps = ComponentProps<typeof Composer>;

export function WorkspaceHeader({ hasMessages, name, patientName, encounterTitle, focusMode, documentCount, paneOpen, onPane, onExpand, onEncounter, onCommands, onFocus, onExport, onUpgrade }: { hasMessages: boolean; name: string; patientName?: string; encounterTitle?: string; focusMode: boolean; documentCount: number; paneOpen: boolean; onPane: () => void; onExpand: () => void; onEncounter: () => void; onCommands: () => void; onFocus: () => void; onExport: () => void; onUpgrade: () => void }) {
  return <header className="canvas-header">
    <div className="header-left">
      <button className="icon-button expand-sidebar" aria-label="Buka navigasi" onClick={onExpand}><Menu size={19}/></button>
      {hasMessages && <><WorkspaceGreeting name={name}/><span className="header-divider">/</span>{patientName !== undefined && <><span className="header-patient">{patientName}</span><span className="header-divider">/</span></>}<h1 className="canvas-title"><button className="encounter-title" onClick={onEncounter}><span>{encounterTitle}</span><ChevronDown size={12}/></button></h1></>}
    </div>
    <div className="header-right">
      <button className="icon-button" aria-label="Buka pusat perintah" title="Pusat perintah · Ctrl / ⌘ J" onClick={onCommands}><Command size={16}/></button>
      <button className="icon-button" aria-label={focusMode ? "Keluar Focus Mode" : "Aktifkan Focus Mode"} aria-pressed={focusMode} title="Focus Mode" onClick={onFocus}>{focusMode ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button>
      {hasMessages && documentCount > 0 && <button className="icon-button document-count" aria-label={`Dokumen encounter, ${documentCount} dokumen`} title="Dokumen encounter" aria-pressed={paneOpen} onClick={onPane}><FileText size={16}/><span>{documentCount}</span></button>}
      {hasMessages && <button className="button export-encounter" onClick={onExport}><ArrowDownToLine size={14}/> Ekspor</button>}
      <button className="upgrade-button" onClick={onUpgrade}><Sparkles size={15} fill="currentColor"/>Berlangganan</button>
    </div>
  </header>;
}

export function HomeView({ name, headline, pill, composer }: { name: string; headline: string; pill: string; composer: ComposerProps }) {
  return <div className="home-content">
    <div className="home-heading-row"><WorkspaceGreeting name={name}/></div>
    <div className="home-headline" aria-live="polite" aria-atomic="true"><div key={headline} className="headline-transition"><h1>{headline}</h1></div></div>
    <span className="home-pill">{pill}</span>
    <Composer {...composer}/>
  </div>;
}

const legalPages = ["Ketentuan layanan", "Kebijakan privasi", "Perjanjian kerja sama", "Keselamatan", "Preferensi cookie"];

export function HomeFooter({ onLegal }: { onLegal: (label: string) => void }) {
  return <div className="home-bottom"><footer className="site-footer">
    <span className="footer-brand"><strong>Sentrapedia — We empower You.</strong><span>Versi 0.2</span></span>
    <div>{legalPages.map((label) => <button key={label} onClick={() => onLegal(label)}>{label}</button>)}</div>
  </footer></div>;
}

// Like a chat: a growing conversation keeps the view at the bottom unless the reader has scrolled up; an answer that
// types out is read from its top instead.
export function Conversation({ encounter, pendingQuestion, dispatch, onToast, onReuse, onCancel, onOpenDocument }: { encounter?: Encounter; pendingQuestion: string | null; dispatch: (action: WorkspaceAction) => void; onToast: (text: string, tone?: "error") => void; onReuse: (content: string) => void; onCancel: () => void; onOpenDocument: (id: string) => void }) {
  const end = useRef<HTMLDivElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const conversationInner = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  // A new turn scrolls the bottom into view unless the reader has scrolled up; afterwards a growing conversation keeps
  // to the bottom. The answer itself lives in the pane, so nothing types in the chat any more.
  useEffect(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    stickToBottom.current = true;
    end.current?.scrollIntoView({ behavior, block: "nearest" });
  }, [encounter?.messages.length, pendingQuestion]);
  useEffect(() => {
    const inner = conversationInner.current, box = conversation.current;
    if (!inner || !box) return;
    const observer = new ResizeObserver(() => { if (stickToBottom.current) box.scrollTop = box.scrollHeight; });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  return <div className="conversation" ref={conversation} onScroll={(event) => { const box = event.currentTarget; stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80; }} aria-label="Percakapan Encounter">
    <div className="conversation-inner" ref={conversationInner}>
      {encounter?.messages.map((message) => <MessageCard key={message.id} message={message} onEdit={(content) => dispatch({ type: "message.edit", encounterId: encounter.id, messageId: message.id, content })} onToast={onToast} onReuse={onReuse} onOpenDocument={onOpenDocument}/>)}
      {pendingQuestion !== null && <><div className="user-message"><div>{pendingQuestion}</div></div><ThinkingCard onCancel={onCancel}/></>}
      <div ref={end}/>
    </div>
  </div>;
}

export function ChatComposer({ composer }: { composer: ComposerProps }) {
  return <div className="chat-composer">
    <Composer {...composer}/>
  </div>;
}
