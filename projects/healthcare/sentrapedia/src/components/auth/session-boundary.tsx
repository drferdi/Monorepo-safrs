"use client";

import { UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PasskeyNudge } from "./passkey-nudge";

// Idle lock (tier 2 of the 2026-11-02 auth audit): a workspace left open on a shared Puskesmas computer signs itself out.
// Activity is any pointer, key, wheel or touch; the check runs on a coarse interval, so a tab the browser throttled still
// catches up on its next tick. Clerk's own inactivity timeout (a dashboard setting) is the server-side half of this.
export const idleLimitMs = 30 * 60_000;
const idleCheckMs = 30_000;
const activityEvents = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export function SessionBoundary({ userId, children }: { userId: string; children: ReactNode }) {
  const session = useAuth(); const clerk = useClerk(); const router = useRouter();
  const [locked, setLocked] = useState(false); const [failed, setFailed] = useState(false); const [idle, setIdle] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  // Stamped when the clock starts (the effect below), never during render.
  const lastActivity = useRef(0);
  useEffect(() => {
    const hide = () => { if (root.current) root.current.hidden = true; setLocked(true); };
    const show = () => { setLocked(true); router.refresh(); };
    window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
    return () => { window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show); };
  }, [router]);
  const eligible = session.isLoaded && session.userId === userId;
  const signOut = useCallback(async (reason: "user" | "idle") => {
    setLocked(true); setFailed(false); setIdle(reason === "idle");
    try { await clerk.signOut({ redirectUrl: "/sign-in" }); }
    catch { setFailed(true); }
  }, [clerk]);
  useEffect(() => {
    if (!eligible || locked) return;
    lastActivity.current = Date.now();
    const touch = () => { lastActivity.current = Date.now(); };
    for (const name of activityEvents) window.addEventListener(name, touch, { passive: true });
    // The clock stops itself first, so a tick that lands before React re-renders cannot sign out twice.
    const timer = setInterval(() => { if (Date.now() - lastActivity.current >= idleLimitMs) { clearInterval(timer); void signOut("idle"); } }, idleCheckMs);
    return () => { clearInterval(timer); for (const name of activityEvents) window.removeEventListener(name, touch); };
  }, [eligible, locked, signOut]);
  return <div className="authenticated-workspace">
    <header className="session-toolbar">
      <span>Sentrapedia beta</span>
      <PasskeyNudge/>
      <div className="session-actions">
        {/* Account, devices, passkeys and deletion live on Clerk's profile page, in full-page form (src/app/account). */}
        <UserButton userProfileMode="navigation" userProfileUrl="/account"/>
        <button type="button" onClick={() => signOut("user")}>Keluar</button>
      </div>
    </header>
    {failed && <p role="alert">Keluar belum berhasil. Workspace tetap terkunci. Coba kembali.</p>}
    {!eligible || locked ? <p role="status">{idle ? `Workspace terkunci setelah ${idleLimitMs / 60_000} menit tanpa aktivitas.` : "Workspace terkunci."} <Link href="/sign-in">Masuk kembali</Link></p> : <div className="session-content" ref={root}>{children}</div>}
  </div>;
}
