"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { CurriculumOutcome } from "../lib/api.ts";
import {
  displayValue,
  isLicensedCp,
  isUnreviewedCp,
  pageRange,
} from "../lib/curriculumReading.ts";
import { Button } from "./ui/button.tsx";

export function CurriculumReadingPane({
  cp,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  cp: CurriculumOutcome | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  if (!cp) return null;

  const licensed = isLicensedCp(cp);
  const unreviewed = isUnreviewedCp(cp.verification_status);
  const objectives = cp.objectives ?? [];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "ArrowRight" && hasNext) {
      onNext();
    } else if (e.key === "ArrowLeft" && hasPrev) {
      onPrev();
    }
  }

  return (
    <aside
      className="rounded-control border border-line-subtle bg-canvas p-(--space-4)"
      data-testid="curriculum-reading-pane"
      aria-label={`Bacaan Capaian Pembelajaran ${cp.learning_outcome_code}`}
      aria-live="polite"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <header className="mb-(--space-4) flex items-start justify-between gap-(--space-3)">
        <div>
          <p className="text-(length:--font-size-label) text-secondary">
            {cp.subject} · Fase {cp.phase}
          </p>
          <p className="font-semibold text-primary">{cp.learning_outcome_code}</p>
          <p className="text-(length:--font-size-body) text-secondary">
            {cp.element_name}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="pane-close"
          aria-label={`Tutup bacaan ${cp.learning_outcome_code}`}
          onClick={onClose}
        >
          <X size={16} strokeWidth={1.5} aria-hidden />
        </Button>
      </header>

      <section
        className="mb-(--space-4)"
        aria-label="Asal dokumen"
        data-testid="pane-provenance"
      >
        <p className="mb-(--space-2) text-(length:--font-size-label) text-secondary">
          Asal Dokumen
        </p>
        <div className="grid gap-(--space-2) sm:grid-cols-2">
          <Kpi label="Dokumen sumber" value={displayValue(cp.source_document_title)} />
          <Kpi label="Halaman" value={displayValue(pageRange(cp))} mono />
          <Kpi label="Lisensi" value={displayValue(cp.license_category)} />
          <Kpi label="Berlaku sejak" value={displayValue(cp.effective_from)} mono />
          <Kpi
            label="Versi kurikulum"
            value={displayValue(cp.curriculum_version)}
            mono
          />
          <Kpi label="Tahun ajaran" value={displayValue(cp.academic_year)} mono />
        </div>
      </section>

      {unreviewed ? (
        <div
          className="mb-(--space-4) rounded-control border border-line-subtle bg-surface p-(--space-3)"
          role="note"
          data-testid="pane-verification"
        >
          <p className="mb-(--space-2) flex items-center gap-(--space-2) font-medium text-warning">
            <AlertTriangle size={16} strokeWidth={1.5} aria-hidden />
            Teks belum diverifikasi manusia
          </p>
          <p className="text-(length:--font-size-body) text-secondary">
            Teks di bawah diekstrak mesin dari dokumen resmi dan belum ditinjau orang.
            Periksa ke dokumen sumber sebelum dipakai untuk menyusun rencana atau
            penilaian.
          </p>
        </div>
      ) : null}

      <section
        className="mb-(--space-4)"
        aria-label="Teks Capaian Pembelajaran"
        data-testid="pane-text"
      >
        <p className="mb-(--space-2) text-(length:--font-size-label) text-secondary">
          Capaian Pembelajaran
        </p>
        {licensed ? (
          <p className="text-(length:--font-size-body) text-primary">
            {cp.learning_outcome_text}
          </p>
        ) : (
          <p className="text-(length:--font-size-body) text-secondary">
            Teks resmi menunggu konfirmasi lisensi dokumen. Silakan dibaca langsung dari
            sumber:{" "}
            {cp.official_source_url ? (
              <a
                href={cp.official_source_url}
                target="_blank"
                rel="noreferrer"
                className="text-accent-text underline"
              >
                Capaian Pembelajaran resmi Kemendikdasmen
              </a>
            ) : (
              "tautan sumber belum tersedia"
            )}
          </p>
        )}
      </section>

      <section
        className="mb-(--space-4)"
        aria-label="Tujuan Pembelajaran"
        data-testid="pane-objectives"
      >
        <p className="mb-(--space-2) text-(length:--font-size-label) text-secondary">
          Tujuan Pembelajaran
        </p>
        {objectives.length === 0 ? (
          <p className="text-(length:--font-size-body) text-secondary">
            Tujuan Pembelajaran belum tersedia untuk CP ini.
          </p>
        ) : (
          <ul className="list-disc space-y-(--space-2) pl-(--space-5)">
            {objectives.map((tp) => (
              <li key={tp.learning_objective_code}>
                <span className="font-mono text-(length:--font-size-label)">
                  {tp.learning_objective_code}
                </span>{" "}
                {"learning_objective_text" in tp && tp.learning_objective_text ? (
                  tp.learning_objective_text
                ) : (
                  <span className="text-secondary">
                    Teks mengikuti lisensi sumber. Lihat tautan resmi di atas.
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex flex-wrap items-center gap-(--space-2)">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="pane-prev"
          disabled={!hasPrev}
          onClick={onPrev}
        >
          <ChevronLeft size={16} strokeWidth={1.5} aria-hidden /> Sebelumnya
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="pane-next"
          disabled={!hasNext}
          onClick={onNext}
        >
          Berikutnya <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
        </Button>
        {cp.official_source_url ? (
          <a
            href={cp.official_source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-(--space-1) text-accent-text underline"
            data-testid="pane-source"
          >
            Buka sumber asli <ExternalLink size={14} strokeWidth={1.5} aria-hidden />
          </a>
        ) : null}
      </footer>
    </aside>
  );
}

function Kpi({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-control bg-surface px-(--space-3) py-(--space-2)">
      <p className="text-(length:--font-size-label) text-secondary">{label}</p>
      <p className={mono ? "font-mono text-primary" : "text-primary"}>{value}</p>
    </div>
  );
}
