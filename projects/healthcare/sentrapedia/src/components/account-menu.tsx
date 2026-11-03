"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { DialogName } from "./sidebar";
import { useMenu } from "./use-menu";

interface Props { name: string; plan: "Lite"; usage?: { stepsToday: number; budgetUsd: number }; onOpen: (name: DialogName) => void; onSignOut?: () => void; children?: ReactNode }

const items: { label: string; dialog: DialogName }[] = [
  { label: "Pengaturan Agent", dialog: "settings" },
  { label: "Antrean kerja", dialog: "queue" },
  { label: "Referensi", dialog: "knowledge" },
  { label: "Tentang workspace", dialog: "account" },
];

// The account row at the foot of the sidebar. It opens upward as a menu so the work dialogs that Glass keeps out of the nav stay one tap away.
export function AccountMenu({ name, plan, usage, onOpen, onSignOut, children }: Props) {
  const { open, setOpen, root, trigger, move, leave, choose } = useMenu();
  return <div className="account-menu" ref={root} onBlur={leave}>
    <button ref={trigger} type="button" className="account" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}><span className="avatar">{name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</span><strong>{name}</strong><span className="lite-badge">{plan}</span><ChevronRight size={15}/></button>
    {open && <div className="account-menu-panel" role="menu" aria-label="Menu akun" onKeyDown={move}>
      {items.map((item) => <button key={item.dialog} type="button" role="menuitem" onClick={() => choose(() => onOpen(item.dialog))}>{item.label}</button>)}
      {usage && <p className="account-menu-usage" role="none">Hari ini {usage.stepsToday} langkah · anggaran USD {usage.budgetUsd}</p>}
      {children && <div className="account-menu-slot" role="none">{children}</div>}
      {onSignOut && <button type="button" role="menuitem" onClick={() => choose(onSignOut)}>Keluar</button>}
    </div>}
  </div>;
}
