"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { betaPolicyVersion } from "../../lib/auth/policy";

export function ConsentForm() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"session" | "retry" | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accepted || request.current) return;
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/onboarding/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: betaPolicyVersion, accepted: true, syntheticOnly: true }), signal: controller.signal });
      if (!response.ok) { setError(response.status === 401 ? "session" : "retry"); return; }
      router.replace("/"); router.refresh();
    } catch { setError("retry"); }
    finally { clearTimeout(timeout); request.current = null; setPending(false); }
  }
  return <form onSubmit={submit}>
    <p>Beta ini hanya untuk evaluasi dengan kasus sintetis. Jangan masukkan identitas, rekam medis, atau data pasien nyata. Keluaran tetap memerlukan penilaian klinisi.</p>
    <p><a href="https://sentrapedia.vercel.app/ketentuan/">Ketentuan beta</a> · <a href="https://sentrapedia.vercel.app/privasi/">Kebijakan privasi</a></p>
    <label className="auth-consent"><input type="checkbox" required checked={accepted} disabled={pending} onChange={event => setAccepted(event.target.checked)}/>Saya memahami batasan beta dan setuju hanya menggunakan data sintetis.</label>
    {pending && <p role="status">Menyimpan persetujuan…</p>}
    {error && <p role="alert">{error === "session" ? <>Sesi berakhir. <Link href="/sign-in">Masuk kembali</Link> untuk melanjutkan.</> : "Persetujuan belum tersimpan. Coba kembali."}</p>}
    <button className="auth-primary" type="submit" disabled={!accepted || pending}>Setuju dan buka workspace</button>
  </form>;
}
