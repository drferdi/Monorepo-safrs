"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createBrowserApiClient,
  type DemoSubmission,
  submitDemo,
} from "../lib/api-client";

export function DemoForm() {
  const router = useRouter();
  const [result, setResult] = useState<DemoSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    setSubmitting(true);
    setResult(null);

    try {
      const client = createBrowserApiClient(window.location.origin);
      const nextResult = await submitDemo(
        (demoName) => client.api.demos.$post({ json: { name: demoName } }),
        name,
      );
      setResult(nextResult);
      if (nextResult.status === "success") {
        router.refresh();
      }
    } catch {
      setResult({
        message: "Koneksi tidak tersedia. Coba lagi setelah API siap.",
        status: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="demo-form">
      <label htmlFor="demo-name">Nama contoh</label>
      <div className="demo-form__controls">
        <input
          autoComplete="off"
          id="demo-name"
          maxLength={80}
          name="name"
          placeholder="Misalnya Atlas"
          required
          aria-label="Nama contoh"
        />
        <button disabled={submitting} type="submit">
          {submitting ? "Menyimpan…" : "Simpan contoh"}
        </button>
      </div>
      <p aria-live="polite" className="demo-form__result">
        {result?.status === "success"
          ? `Contoh ${result.name} tersimpan.`
          : null}
        {result?.status === "error" ? result.message : null}
      </p>
    </form>
  );
}
