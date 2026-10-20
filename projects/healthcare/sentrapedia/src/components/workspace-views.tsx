"use client";

import { ArrowDownToLine, ChevronDown, Command, Maximize2, Menu, Minimize2, PanelRight, Sparkles } from "lucide-react";
import { useEffect, useRef, type ComponentProps } from "react";
import type { Encounter, WorkspaceAction } from "../lib/workspace";
import type { intentGroups } from "../lib/studio";
import { Composer } from "./composer";
import { MessageCard } from "./message-card";
import { ThinkingCard } from "./thinking-card";
import { WorkspaceGreeting } from "./workspace-greeting";

type ComposerProps = ComponentProps<typeof Composer>;

export function WorkspaceHeader({ hasMessages, name, patientName, encounterTitle, focusMode, panelPressed, onExpand, onEncounter, onCommands, onFocus, onPanel, onExport, onUpgrade }: { hasMessages: boolean; name: string; patientName?: string; encounterTitle?: string; focusMode: boolean; panelPressed: boolean; onExpand: () => void; onEncounter: () => void; onCommands: () => void; onFocus: () => void; onPanel: () => void; onExport: () => void; onUpgrade: () => void }) {
  return <header className="canvas-header">
    <div className="header-left">
      <button className="icon-button expand-sidebar" aria-label="Buka navigasi" onClick={onExpand}><Menu size={19}/></button>
      {hasMessages && <><WorkspaceGreeting name={name}/><span className="header-divider">/</span>{patientName !== undefined && <><span className="header-patient">{patientName}</span><span className="header-divider">/</span></>}<h1 className="canvas-title"><button className="encounter-title" onClick={onEncounter}><span>{encounterTitle}</span><ChevronDown size={12}/></button></h1></>}
    </div>
    <div className="header-right">
      <button className="icon-button" aria-label="Buka pusat perintah" title="Pusat perintah · Ctrl / ⌘ J" onClick={onCommands}><Command size={16}/></button>
      <button className="icon-button" aria-label={focusMode ? "Keluar Focus Mode" : "Aktifkan Focus Mode"} aria-pressed={focusMode} title="Focus Mode" onClick={onFocus}>{focusMode ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button>
      <button className="icon-button" aria-label="Konteks dan Timeline" title="Konteks dan Timeline" aria-pressed={panelPressed} onClick={onPanel}><PanelRight size={17}/></button>
      {hasMessages && <button className="button export-encounter" onClick={onExport}><ArrowDownToLine size={14}/> Ekspor</button>}
      <button className="upgrade-button" onClick={onUpgrade}><Sparkles size={15} fill="currentColor"/>Berlangganan</button>
    </div>
  </header>;
}

export function HomeView({ name, intent, composer }: { name: string; intent: (typeof intentGroups)[number]; composer: ComposerProps }) {
  return <div className="home-content">
    <div className="home-heading-row"><WorkspaceGreeting name={name}/></div>
    <div className="home-headline" aria-live="polite" aria-atomic="true"><div key={intent.id} className="headline-transition"><h1>{intent.headline}</h1><p>{intent.description}</p></div></div>
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
export function Conversation({ encounter, pendingQuestion, dispatch, onToast, onReuse, onReferral, onCancel }: { encounter?: Encounter; pendingQuestion: string | null; dispatch: (action: WorkspaceAction) => void; onToast: (text: string, tone?: "error") => void; onReuse: (content: string) => void; onReferral?: (text: string) => void; onCancel: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const conversationInner = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  // A fresh answer that types out (2026-10-20, measured on beta: 105 instant scroll jumps in one answer, "lompat"):
  // its start glides to the top once and the text then grows below the reader, who reads from the top as it arrives.
  // Where the card's header would push the text out of view (a phone, where the section list sits above the text),
  // the text's own start goes to the top instead. Like a chat reply, the text keeps a screen of room below its start
  // until the next message, so its start can reach the top while the text is still short.
  const reserved = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const card = conversationInner.current?.querySelector(".diagnosis-document[aria-busy=\"true\"]")?.closest<HTMLElement>(".assistant-message");
    const text = card?.querySelector<HTMLElement>(".diagnosis-sections"), box = conversation.current;
    if (reserved.current) reserved.current.style.minHeight = "";
    reserved.current = text && box ? text : null;
    if (text && box) text.style.minHeight = `${box.clientHeight}px`;
    const typing = card && text && box && text.getBoundingClientRect().top - card.getBoundingClientRect().top > box.clientHeight * .4 ? text : card;
    stickToBottom.current = !typing;
    (typing ?? end.current)?.scrollIntoView({ behavior, block: typing ? "start" : "nearest" });
    if (!card || !box || behavior === "auto") return;
    // Once the growing text nears the bottom, the view follows its edge like a critically damped spring: its speed
    // changes gradually, so neither a new line nor a whole block arriving at once jerks it, and it never scrolls back
    // (Gaffer, 2026-10-20: "stuck di point tertentu sedangkan text keluar terus"; a capped glide measured the edge below
    // the view in half the frames). It keeps the edge about 100 px above the bottom, less than the room the card's
    // actions leave below the text at the end of the scroll, and settles once the text ends. The reader's own wheel,
    // touch or key stops the following.
    let follow = true, frame = 0, last = performance.now(), speed = 0, rate = 0, reach = NaN, position = box.scrollTop;
    const stop = () => { follow = false; };
    const events = ["wheel", "touchstart", "keydown"] as const;
    for (const name of events) box.addEventListener(name, stop, { passive: true });
    frame = requestAnimationFrame(function tick(now) {
      const busy = card.querySelector(".diagnosis-document[aria-busy=\"true\"]");
      // The lowest line of the section being typed; the references, a folded section and a provenance arrive whole and
      // are not followed, so the view stays on the last typed line once the text ends.
      const edge = Math.max(0, ...[...card.querySelectorAll(".diagnosis-section[data-typing=\"true\"] .draft-content > *")].map(line => line.getBoundingClientRect().bottom));
      const gap = edge - (box.getBoundingClientRect().bottom - 100), elapsed = Math.min(50, Math.max(1, now - last));
      last = now;
      // The text's own pace down the page, so the view keeps up instead of trailing it; a block arriving whole is
      // left to the spring.
      rate += (Math.min(30, Math.max(0, edge + box.scrollTop - reach || 0)) / elapsed - rate) * Math.min(1, elapsed / 250);
      reach = edge + box.scrollTop;
      if (!speed) position = box.scrollTop;
      speed = Math.max(0, speed + (1e-4 * gap + 0.02 * (rate - speed)) * elapsed); // spring 0.01/ms, critically damped
      if (speed < 1e-3) speed = 0;
      if (follow && speed) { position += speed * elapsed; box.scrollTop = position; }
      if (follow && (busy || speed)) frame = requestAnimationFrame(tick);
    });
    return () => { cancelAnimationFrame(frame); for (const name of events) box.removeEventListener(name, stop); };
  }, [encounter?.messages.length, pendingQuestion]);
  useEffect(() => {
    const inner = conversationInner.current, box = conversation.current;
    if (!inner || !box) return;
    // While an answer types, the view never follows its growth; afterwards a growing conversation keeps to the bottom.
    const observer = new ResizeObserver(() => { if (stickToBottom.current && !inner.querySelector(".diagnosis-document[aria-busy=\"true\"]")) box.scrollTop = box.scrollHeight; });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);
  return <div className="conversation" ref={conversation} onScroll={(event) => { const box = event.currentTarget; stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80; }} aria-label="Percakapan Encounter">
    <div className="conversation-inner" ref={conversationInner}>
      {encounter?.messages.map((message) => <MessageCard encounterId={encounter.id} dispatch={dispatch} key={message.id} message={message} onEdit={(content) => dispatch({ type: "message.edit", encounterId: encounter.id, messageId: message.id, content })} onToast={onToast} onReuse={onReuse} onReferral={onReferral} onReview={(status) => dispatch({ type: "message.review", encounterId: encounter.id, messageId: message.id, status })}/>)}
      {pendingQuestion !== null && <><div className="user-message"><div>{pendingQuestion}</div></div><ThinkingCard onCancel={onCancel}/></>}
      <div ref={end}/>
    </div>
  </div>;
}

export function ChatComposer({ composer, onAbout }: { composer: ComposerProps; onAbout: () => void }) {
  return <div className="chat-composer">
    <Composer inChat {...composer}/>
    <p className="composer-hint">{composer.aadiEnabled ? "" : "Format lokal, siap untuk ditinjau. "}<button onClick={onAbout}>Tentang workspace ini</button></p>
  </div>;
}
