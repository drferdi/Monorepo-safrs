"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button.tsx";
import { activateOwner, previewOwnerInvitation } from "../../lib/api.ts";
import { useAuth } from "../../lib/auth.tsx";

function readTokenFromFragment(): string {
  if (typeof window === "undefined") return "";
  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  const value = new URLSearchParams(raw).get("token") || "";
  if (value) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
  return value;
}

export default function OwnerActivationPage() {
  const [token] = useState(readTokenFromFragment);
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [invite, setInvite] = useState<{
    name?: string;
    email?: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    previewOwnerInvitation(token)
      .then(setInvite)
      .catch((error: unknown) => {
        const detail =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { data?: { detail?: string } } }).response
                ?.data?.detail
            : undefined;
        toast.error(detail || "Undangan tidak valid");
      });
  }, [token]);

  async function activate(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Kata sandi minimal 8 karakter");
      return;
    }
    if (password !== confirmation) {
      toast.error("Konfirmasi kata sandi tidak sama");
      return;
    }
    setBusy(true);
    try {
      const data = await activateOwner({ token, password });
      acceptSession(data.user);
      toast.success("Akun pemilik aktif. Selamat datang.");
      router.replace("/pengumuman" as Route);
    } catch (error: unknown) {
      const detail =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : undefined;
      toast.error(detail || "Aktivasi gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-(--space-4)">
      <div className="w-full max-w-md space-y-(--space-4) rounded-control border border-line-subtle bg-surface p-(--space-5)">
        <p className="text-(length:--font-size-label) uppercase text-secondary">
          Aktivasi Akses Owner
        </p>
        <h1 className="text-(length:--font-size-title-page) font-semibold text-primary">
          Buat kata sandi
        </h1>
        {invite ? (
          <p className="text-(length:--font-size-body) text-secondary">
            Aktifkan akses untuk {invite.name} ({invite.email}).
          </p>
        ) : (
          <p className="text-(length:--font-size-body) text-secondary">
            Memeriksa undangan...
          </p>
        )}
        {invite ? (
          <form
            onSubmit={(e) => void activate(e)}
            className="space-y-(--space-3)"
          >
            <label className="block space-y-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Kata sandi baru
              </span>
              <input
                className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="block space-y-(--space-1)">
              <span className="text-(length:--font-size-label) text-secondary">
                Ulangi kata sandi
              </span>
              <input
                className="min-h-(--target-min) w-full rounded-control border border-line-subtle px-(--space-3)"
                type="password"
                minLength={8}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Mengaktifkan..." : "Aktifkan Akses"}
            </Button>
          </form>
        ) : null}
        <Button type="button" variant="outline" className="w-full" asChild>
          <Link href={"/login" as Route}>Kembali ke login</Link>
        </Button>
      </div>
    </div>
  );
}
