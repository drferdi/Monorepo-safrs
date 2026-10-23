"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function SessionBoundary({ userId, children }: { userId: string; children: ReactNode }) {
  const session = useAuth(); const clerk = useClerk(); const router = useRouter();
  const [locked, setLocked] = useState(false); const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hide = () => { if (root.current) root.current.hidden = true; setLocked(true); };
    const show = () => { setLocked(true); router.refresh(); };
    window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
    return () => { window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show); };
  }, [router]);
  const eligible = session.isLoaded && session.userId === userId;
  async function signOut() {
    setLocked(true); setFailed(false);
    try { await clerk.signOut({ redirectUrl: "/sign-in" }); }
    catch { setFailed(true); }
  }
  return <div className="authenticated-workspace">
    <header className="session-toolbar"><span>Sentrapedia beta · data sintetis</span><button type="button" onClick={signOut}>Keluar</button></header>
    {failed && <p role="alert">Keluar belum berhasil. Workspace tetap terkunci. Coba kembali.</p>}
    {!eligible || locked ? <p role="status">Workspace terkunci. <Link href="/sign-in">Masuk kembali</Link></p> : <div className="session-content" ref={root}>{children}</div>}
  </div>;
}
