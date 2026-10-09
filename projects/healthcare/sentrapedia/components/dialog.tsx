"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={ref} className={`dialog ${wide ? "wide" : ""}`} aria-labelledby="dialog-title" onCancel={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="dialog-inner"><header className="dialog-header"><div><h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Tutup dialog" onClick={onClose}><X size={18}/></button></header>{children}</div></dialog>;
}
