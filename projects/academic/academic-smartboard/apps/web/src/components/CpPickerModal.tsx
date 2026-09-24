"use client";

import { useEffect, useState } from "react";
import {
  type CurriculumOutcome,
  type CurriculumOutcomesPage,
  listCurriculumOutcomes,
} from "../lib/api.ts";
import { Button } from "./ui/button.tsx";

export function CpPickerModal({
  open,
  onClose,
  onPick,
  lockedPhase,
  lockedSubject,
  gradeLabel,
  subjectLabel,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (cp: CurriculumOutcome) => void;
  lockedPhase: string | null;
  lockedSubject: string | null;
  gradeLabel: string;
  subjectLabel: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [outcomes, setOutcomes] = useState<CurriculumOutcomesPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open || !lockedPhase || !lockedSubject) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listCurriculumOutcomes({
          phase: lockedPhase,
          subject: lockedSubject,
          q: q.trim() || undefined,
          page,
        });
        if (!cancelled) {
          setOutcomes(Array.isArray(data) ? { items: data } : data);
        }
      } catch {
        if (!cancelled) setError("Tidak dapat memuat data kurikulum.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, lockedPhase, lockedSubject, q, page]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items = outcomes?.items ?? [];
  const totalPages = outcomes?.total_cp
    ? Math.max(1, Math.ceil(outcomes.total_cp / (outcomes.page_size || 20)))
    : 1;

  return (
    <div
      className="fixed inset-0 z-(--z-drawer) flex items-center justify-center bg-black/40 p-(--space-4)"
      role="presentation"
      onClick={onClose}
      style={{ zIndex: 410 }}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-control border border-line-subtle bg-canvas p-(--space-5)"
        role="dialog"
        aria-modal="true"
        aria-label="Pilih Capaian Pembelajaran"
        data-testid="cp-picker-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-(--space-4) flex items-start justify-between gap-(--space-3)">
          <div>
            <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
              Pilih Capaian Pembelajaran
            </h2>
            <p className="mt-(--space-1) text-(length:--font-size-label) text-secondary">
              {subjectLabel} · {gradeLabel} · Fase {lockedPhase}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Tutup"
            onClick={onClose}
          >
            ✕
          </Button>
        </div>

        <input
          type="search"
          data-testid="cp-picker-search"
          placeholder="Cari kode / elemen / teks CP"
          className="mb-(--space-3) w-full rounded-control border border-line-subtle px-(--space-3) py-(--space-2)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        {error ? <p className="mb-(--space-3) text-critical">{error}</p> : null}

        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="w-full text-left text-(length:--font-size-body)">
            <thead className="bg-surface text-secondary">
              <tr>
                <th className="px-(--space-3) py-(--space-2)">Kode</th>
                <th className="px-(--space-3) py-(--space-2)">Elemen</th>
                <th className="px-(--space-3) py-(--space-2)" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Memuat…
                  </td>
                </tr>
              ) : null}
              {!loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-(--space-3) py-(--space-4) text-secondary"
                  >
                    Tidak ada CP untuk {lockedSubject} Fase {lockedPhase}.
                  </td>
                </tr>
              ) : null}
              {!loading &&
                items.map((cp) => (
                  <tr
                    key={cp.learning_outcome_code}
                    data-testid={`row-cp-${cp.learning_outcome_code}`}
                    className="border-t border-line-subtle"
                  >
                    <td className="px-(--space-3) py-(--space-2)">
                      {cp.learning_outcome_code}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <div>{cp.element_name}</div>
                      {cp.learning_outcome_text ? (
                        <div className="mt-(--space-1) text-(length:--font-size-label) text-secondary">
                          {cp.learning_outcome_text.length > 120
                            ? `${cp.learning_outcome_text.slice(0, 120)}…`
                            : cp.learning_outcome_text}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-(--space-3) py-(--space-2)">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid={`btn-pick-${cp.learning_outcome_code}`}
                        onClick={() => onPick(cp)}
                      >
                        Pilih →
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && outcomes && (outcomes.total_cp ?? 0) > 0 ? (
          <div className="mt-(--space-3) flex items-center justify-between gap-(--space-3)">
            <p className="text-(length:--font-size-label) text-secondary">
              Halaman {page} / {totalPages} · {outcomes.total_cp} CP
            </p>
            <div className="flex gap-(--space-2)">
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="cp-picker-prev"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="cp-picker-next"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-(--space-4) flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
