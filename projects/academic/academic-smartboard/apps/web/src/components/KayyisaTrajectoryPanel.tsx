"use client";

import { useCallback, useState } from "react";
import { postProgressionSummaryDraft } from "../lib/api.ts";
import { Button } from "./ui/button.tsx";

const SENTRA_EDU_MODEL_LABEL = "Sentra Edu";

/**
 * Arsip KayyisaTrajectoryPanel — POST summary-draft, typewriter optional simplified.
 */
export function KayyisaTrajectoryPanel({
  studentId,
  subjectFilter,
  hasData,
}: {
  studentId: string;
  subjectFilter?: string;
  hasData: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [meta, setMeta] = useState<{
    source?: string;
    model?: string | null;
    ai_assisted?: boolean;
  } | null>(null);

  const ask = useCallback(async () => {
    if (!studentId || busy) return;
    setBusy(true);
    setError("");
    setSummary("");
    setMeta(null);
    try {
      const payload = await postProgressionSummaryDraft(
        studentId,
        subjectFilter,
      );
      setSummary(payload.summary || "");
      setMeta({
        source: payload.source,
        model:
          payload.ai_assisted || payload.source === "ai"
            ? SENTRA_EDU_MODEL_LABEL
            : null,
        ai_assisted: payload.ai_assisted,
      });
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data
              ?.detail
          : undefined;
      setError(
        detail ||
          "Kak Kayyisa belum dapat menulis rangkuman. Coba lagi sebentar.",
      );
    } finally {
      setBusy(false);
    }
  }, [studentId, subjectFilter, busy]);

  return (
    <section
      className="rounded-control border border-line-subtle bg-surface p-(--space-4)"
      data-testid="kayyisa-trajectory-panel"
    >
      <div className="mb-(--space-3) flex flex-wrap items-center justify-between gap-(--space-3)">
        <div>
          <p className="font-semibold text-primary">Kak Kayyisa</p>
          <p className="text-(length:--font-size-label) uppercase tracking-(--letter-spacing-label) text-secondary">
            Laporan trajektori
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void ask()}
          disabled={busy || !hasData}
          data-testid="btn-ask-kayyisa-trajectory"
        >
          {busy ? "Menyusun laporan…" : "Laporan Kak Kayyisa"}
        </Button>
      </div>

      {!summary && !error && !busy ? (
        <p className="text-(length:--font-size-body) text-secondary">
          Buat laporan ringkas dari tren skor di atas. Hasilnya draf untuk
          tinjauan staf — belum otomatis dibagikan ke orang tua.
        </p>
      ) : null}

      {busy && !summary ? (
        <p
          className="text-(length:--font-size-body) text-secondary"
          role="status"
        >
          Menyusun laporan…
        </p>
      ) : null}

      {error ? (
        <p className="text-critical" role="alert">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div data-testid="kayyisa-trajectory-text">
          <p className="whitespace-pre-wrap text-(length:--font-size-body) text-primary">
            {summary}
          </p>
          {meta?.model ? (
            <p className="mt-(--space-2) text-(length:--font-size-label) text-secondary">
              {meta.model}
              {meta.source ? ` · ${meta.source}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
