"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useSyncExternalStore } from "react";

// A doctor without a passkey is asked once per browser to add one: phishing-resistant sign-in kept beside the email code
// (tier 2 of the 2026-11-02 auth audit). Enrolment is Clerk's own WebAuthn ceremony on this device. When the instance has
// passkeys switched off (tier 1, a dashboard step for Gaffer), Clerk refuses and the doctor is told so, not shown nothing.
const dismissedKey = (userId: string) => `sentrapedia-passkey-nudge:${userId}`;
const subscribe = (notify: () => void) => { window.addEventListener("storage", notify); return () => window.removeEventListener("storage", notify); };

export function PasskeyNudge() {
  const { isLoaded, user } = useUser();
  const userId = user?.id;
  // This browser's earlier "Nanti saja", read as an external store so the bar never flashes before the answer is known;
  // on the server it counts as dismissed.
  const dismissedBefore = useSyncExternalStore(subscribe, () => { try { return !!userId && localStorage.getItem(dismissedKey(userId)) === "1"; } catch { return false; } }, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "done" | "failed">("idle");
  if (!isLoaded || !user || dismissedBefore || dismissedNow || (user.passkeys.length > 0 && state !== "done")) return null;
  async function enrol() {
    setState("pending");
    try { await user!.createPasskey(); setState("done"); } catch { setState("failed"); }
  }
  function later() {
    try { localStorage.setItem(dismissedKey(user!.id), "1"); } catch { /* A browser without storage asks again next time. */ }
    setDismissedNow(true);
  }
  if (state === "done") return <p className="passkey-nudge" role="status">Passkey tersimpan. Masuk berikutnya bisa tanpa kode email.</p>;
  return <div className="passkey-nudge">
    <span>Amankan akun dengan passkey: masuk tanpa kode email dan tahan phishing.</span>
    <button type="button" onClick={enrol} disabled={state === "pending"}>{state === "pending" ? "Menunggu perangkat…" : "Daftarkan passkey"}</button>
    <button type="button" className="passkey-later" onClick={later}>Nanti saja</button>
    {state === "failed" && <span role="alert">Passkey belum bisa didaftarkan dari perangkat atau akun ini. Coba dari halaman akun.</span>}
  </div>;
}
