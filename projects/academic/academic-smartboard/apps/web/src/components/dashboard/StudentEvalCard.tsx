"use client";

import { useMemo } from "react";
import { COMPETENCE_LABEL } from "../../lib/labels.ts";
import { VizCardShell } from "./VizCardShell.tsx";

interface StudentEvalCardProps {
  data?: {
    period?: string;
    score_distribution?: Array<{ score: number; count: number }>;
    competence?: Array<{ name: string; count: number }>;
    total_evaluations?: number;
    avg_score?: number;
  };
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function StudentEvalCard({
  data,
  loading = false,
  error = "",
  onRetry,
}: StudentEvalCardProps) {
  const dist = data?.score_distribution || [];
  const competence = useMemo(
    () =>
      (data?.competence || []).map((c) => ({
        ...c,
        label:
          COMPETENCE_LABEL[c.name as keyof typeof COMPETENCE_LABEL] || c.name,
      })),
    [data],
  );
  const empty = !loading && !error && (data?.total_evaluations || 0) === 0;
  const maxComp = Math.max(...competence.map((c) => c.count), 1);
  const scores = useMemo(
    () => [...dist].sort((a, b) => a.score - b.score),
    [dist],
  );
  const peakScore = Math.max(...scores.map((s) => s.count), 1);

  return (
    <VizCardShell
      title="Evaluasi Siswa"
      subtitle={`Periode ${data?.period || "—"}`}
      href="/akademik/perkembangan"
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={empty}
      emptyMessage="Belum ada evaluasi siswa bulan ini."
      testId="card-student-eval"
    >
      <div className="grid grid-cols-2 gap-(--space-3)">
        <div>
          <div className="text-xs text-secondary">Jumlah evaluasi</div>
          <div className="font-semibold text-primary">
            {data?.total_evaluations ?? 0}
          </div>
        </div>
        <div>
          <div className="text-xs text-secondary">Rata-rata skor</div>
          <div className="font-semibold text-primary">
            {data?.avg_score ?? 0}
            <span className="font-normal text-secondary"> / 5</span>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs text-secondary">
          Distribusi skor keseluruhan
        </div>
        <ScoreLine scores={scores} peak={peakScore} />
      </div>

      {competence.length > 0 ? (
        <div className="space-y-(--space-2)">
          <div className="text-xs text-secondary">Status kompetensi</div>
          {competence.map((c) => (
            <div
              key={c.name}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-(--space-2) text-sm"
            >
              <span className="truncate">{c.label}</span>
              <span
                className="h-2 rounded-control bg-accent"
                style={{
                  width: `${Math.max(2, Math.round((c.count / maxComp) * 100))}px`,
                }}
              />
              <span className="font-medium">{c.count}</span>
            </div>
          ))}
        </div>
      ) : null}
    </VizCardShell>
  );
}

function ScoreLine({
  scores,
  peak,
}: {
  scores: Array<{ score: number; count: number }>;
  peak: number;
}) {
  if (!scores.length) return null;
  const W = 320;
  const H = 96;
  const PAD = 10;
  const step = W / scores.length;
  const points = scores.map((bucket, i) => ({
    ...bucket,
    x: (i + 0.5) * step,
    y: PAD + (1 - bucket.count / peak) * (H - PAD * 2),
  }));

  return (
    <div>
      <svg
        className="h-24 w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={scores
          .map((b) => `Skor ${b.score}: ${b.count}`)
          .join(", ")}
      >
        <line
          x1="0"
          y1={H - PAD}
          x2={W}
          y2={H - PAD}
          stroke="var(--color-border-subtle, #e5e5e5)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="var(--color-data-1, #1d4ed8)"
          strokeWidth="1.5"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className="mt-1 grid text-center text-xs"
        style={{ gridTemplateColumns: `repeat(${scores.length}, minmax(0, 1fr))` }}
      >
        {points.map((p) => (
          <div key={p.score}>
            <div className="font-medium">{p.count}</div>
            <div className="text-secondary">Skor {p.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
