"use client";

import { useMemo } from "react";
import { VizCardShell } from "./VizCardShell.tsx";

interface TutorEvalCardProps {
  data?: {
    period?: string;
    top_tutors?: Array<{ tutor_name: string; evals_filled?: number }>;
    evals_filled_month?: number;
    awaiting_evaluation?: number;
    completion_rate?: number;
    sessions_with_eval_month?: number;
    sessions_completed_month?: number;
  };
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

const RAMP_STEPS = 4;

export function TutorEvalCard({
  data,
  loading = false,
  error = "",
  onRetry,
}: TutorEvalCardProps) {
  const top = data?.top_tutors || [];
  const empty =
    !loading &&
    !error &&
    (data?.evals_filled_month || 0) === 0 &&
    (data?.awaiting_evaluation || 0) === 0 &&
    top.length === 0;

  const rate = Number(data?.completion_rate) || 0;
  const ranked = useMemo(
    () =>
      [...top]
        .sort((a, b) => (b.evals_filled || 0) - (a.evals_filled || 0))
        .slice(0, RAMP_STEPS),
    [top],
  );
  const peak = ranked[0]?.evals_filled || 1;

  return (
    <VizCardShell
      title="Pola Pengajaran (Guru & Metode)"
      subtitle={`Periode ${data?.period || "—"}`}
      href="/evaluasi"
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={empty}
      emptyMessage="Belum ada aktivitas evaluasi pengajar bulan ini."
      testId="card-tutor-eval"
    >
      <div className="grid grid-cols-2 gap-(--space-3)">
        <div>
          <div className="text-xs text-secondary">Menunggu evaluasi</div>
          <div className="font-semibold text-primary">
            {data?.awaiting_evaluation ?? 0}
          </div>
        </div>
        <div>
          <div className="text-xs text-secondary">Eval terisi bulan ini</div>
          <div className="font-semibold text-primary">
            {data?.evals_filled_month ?? 0}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-secondary">
          Kelengkapan evaluasi sesi · {rate}%
        </div>
        <div
          className="h-2 overflow-hidden rounded-control bg-surface"
          aria-label={`Kelengkapan evaluasi ${rate} persen`}
        >
          <i
            className="block h-full bg-accent"
            style={{ width: `${Math.min(100, rate)}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-secondary">
          {data?.sessions_with_eval_month ?? 0} /{" "}
          {data?.sessions_completed_month ?? 0} sesi selesai
        </div>
      </div>

      {ranked.length > 0 ? (
        <div className="space-y-(--space-2)">
          <div className="text-xs text-secondary">
            Pengajar paling aktif mengisi evaluasi
          </div>
          {ranked.map((tutor, index) => (
            <div
              key={tutor.tutor_name}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-(--space-2) text-sm"
            >
              <span className="truncate text-primary">{tutor.tutor_name}</span>
              <span
                className="h-2 rounded-control"
                style={{
                  width: `${Math.max(2, Math.round(((tutor.evals_filled || 0) / peak) * 100))}px`,
                  background: `var(--color-data-${index + 1}, #1d4ed8)`,
                }}
              />
              <span className="font-medium">{tutor.evals_filled}</span>
            </div>
          ))}
        </div>
      ) : null}
    </VizCardShell>
  );
}
