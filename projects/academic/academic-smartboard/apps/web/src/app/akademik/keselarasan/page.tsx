"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "../../../components/AppShell.tsx";
import { ChipTabs } from "../../../components/ChipTabs.tsx";
import { CurriculumReadingPane } from "../../../components/CurriculumReadingPane.tsx";
import { EmptyState } from "../../../components/EmptyState.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  type CurriculumAlignmentCell,
  type CurriculumAlignmentGrade,
  type CurriculumAlignmentSubject,
  type CurriculumOutcome,
  getCurriculumAlignment,
  listCurriculumOutcomes,
} from "../../../lib/api.ts";
import {
  buildCellIndex,
  CELL_STATE,
  cellMeterFill,
  computeViewStats,
  coveragePct,
  filterByStageFilter,
  STAGES,
  type StageFilterId,
  stateFor,
} from "../../../lib/curriculumAlignment.ts";

type SelectedCell = {
  subject: CurriculumAlignmentSubject;
  grade: CurriculumAlignmentGrade;
  cell: CurriculumAlignmentCell;
};

function KeselarasanView() {
  const [stageFilter, setStageFilter] = useState<StageFilterId>("all");
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [cps, setCps] = useState<CurriculumOutcome[]>([]);
  const [cpIndex, setCpIndex] = useState(0);
  const [cpError, setCpError] = useState("");
  const [paneLoading, setPaneLoading] = useState(false);

  const alignQ = useQuery({
    queryKey: ["curriculum-alignment"],
    queryFn: getCurriculumAlignment,
  });

  const cellIndex = useMemo(
    () => buildCellIndex(alignQ.data?.cells),
    [alignQ.data?.cells],
  );

  const grades = useMemo(
    () => filterByStageFilter(alignQ.data?.grades ?? [], stageFilter),
    [alignQ.data?.grades, stageFilter],
  );

  const subjects = useMemo(
    () => filterByStageFilter(alignQ.data?.subjects ?? [], stageFilter),
    [alignQ.data?.subjects, stageFilter],
  );

  const viewStats = useMemo(
    () => computeViewStats(subjects, grades, cellIndex),
    [subjects, grades, cellIndex],
  );

  const globalPct = coveragePct(alignQ.data?.totals);

  async function openCell(
    subject: CurriculumAlignmentSubject,
    grade: CurriculumAlignmentGrade,
    cell: CurriculumAlignmentCell,
  ): Promise<void> {
    setSelected({ subject, grade, cell });
    setCps([]);
    setCpIndex(0);
    setCpError("");
    if (cell.cp_count === 0) {
      setCpError(
        `Panduan nasional untuk ${subject.name} pada Fase ${cell.phase || "—"} belum tersedia di korpus.`,
      );
      return;
    }
    setPaneLoading(true);
    try {
      const data = await listCurriculumOutcomes({
        phase: cell.phase,
        subject: subject.name,
      });
      const items = Array.isArray(data) ? data : (data.items ?? []);
      setCps(items);
    } catch {
      setCpError("Gagal memuat capaian pembelajaran untuk sel ini.");
    } finally {
      setPaneLoading(false);
    }
  }

  if (alignQ.isPending) {
    return (
      <div className="space-y-(--space-5)">
        <PageHead
          seq="AKA"
          eyebrow="Akademik"
          title="Keselarasan Kurikulum"
          lede="Peta cepat: mana penawaran bimbel yang sudah punya panduan nasional, mana yang masih kosong — per mata pelajaran dan jenjang."
        />
        <EmptyState
          title="Memuat peta keselarasan"
          lede="Menghitung sel penawaran bimbel terhadap korpus panduan nasional."
        />
      </div>
    );
  }

  if (alignQ.isError) {
    return (
      <div className="space-y-(--space-5)">
        <PageHead
          seq="AKA"
          eyebrow="Akademik"
          title="Keselarasan Kurikulum"
          lede="Peta cepat: mana penawaran bimbel yang sudah punya panduan nasional, mana yang masih kosong — per mata pelajaran dan jenjang."
        />
        <EmptyState
          title="Peta belum dapat dimuat"
          lede="Gagal memuat peta keselarasan."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => alignQ.refetch()}
            >
              Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  const grid = alignQ.data;
  if (!grid || (grid.cells?.length ?? 0) === 0) {
    return (
      <div className="space-y-(--space-5)">
        <PageHead
          seq="AKA"
          eyebrow="Akademik"
          title="Keselarasan Kurikulum"
          lede="Peta cepat: mana penawaran bimbel yang sudah punya panduan nasional, mana yang masih kosong — per mata pelajaran dan jenjang."
        />
        <EmptyState
          title="Belum ada penawaran yang dipetakan"
          lede="Aktifkan mata pelajaran di master bimbel agar dapat disandingkan dengan panduan nasional. Buka Master → Mata Pelajaran untuk menambah penawaran."
        />
      </div>
    );
  }

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="AKA"
        eyebrow="Akademik"
        title="Keselarasan Kurikulum"
        lede="Peta cepat: mana penawaran bimbel yang sudah punya panduan nasional, mana yang masih kosong — per mata pelajaran dan jenjang."
      />

      <section
        data-testid="align-thesis"
        aria-label="Ringkasan keselarasan"
        className="grid gap-(--space-4) rounded-control border border-line-subtle bg-surface p-(--space-4) md:grid-cols-[1.4fr_1fr]"
      >
        <div>
          <p className="text-(length:--font-size-label) uppercase text-secondary">
            Cakupan panduan pada filter ini
          </p>
          <p className="mt-(--space-2) text-(length:--font-size-title-section) font-semibold text-primary">
            {viewStats.pct}%
          </p>
          <p className="mt-(--space-2) text-(length:--font-size-body) text-secondary">
            {viewStats.withGuidance} dari {viewStats.cells} sel penawaran punya
            panduan nasional di korpus.
          </p>
          <div
            className="mt-(--space-3) h-2 overflow-hidden rounded-full bg-canvas"
            aria-hidden="true"
          >
            <div
              className="h-full bg-accent"
              style={{ width: `${viewStats.pct}%` }}
            />
          </div>
        </div>
        <ul className="space-y-(--space-3) text-(length:--font-size-body)">
          <li>
            <span className="text-secondary">Tanpa panduan</span>{" "}
            <strong className="text-primary">{viewStats.gaps}</strong>
            <span className="ml-(--space-2) text-secondary">
              Perlu perhatian
            </span>
          </li>
          <li>
            <span className="text-secondary">Panduan tipis</span>{" "}
            <strong className="text-primary">{viewStats.thin}</strong>
            <span className="ml-(--space-2) text-secondary">
              CP ada, elemen minim
            </span>
          </li>
          <li>
            <span className="text-secondary">Korpus CP</span>{" "}
            <strong className="text-primary">
              {grid.totals?.national_cp ?? "—"}
            </strong>
            <span className="ml-(--space-2) text-secondary">
              {grid.totals?.national_subjects ?? "—"} mapel · {globalPct}%
              global
            </span>
          </li>
        </ul>
      </section>

      {viewStats.gaps > 0 ? (
        <div
          role="status"
          className="rounded-control border border-line-subtle p-(--space-4)"
        >
          <p className="font-medium text-primary">
            ○ {viewStats.gaps} sel penawaran belum punya panduan nasional
          </p>
          <p className="mt-(--space-2) text-(length:--font-size-body) text-secondary">
            Klik sel kosong di matriks, atau pilih salah satu di bawah untuk
            membuka detail.
          </p>
          {viewStats.gapList.length > 0 ? (
            <ul className="mt-(--space-3) flex flex-wrap gap-(--space-2)">
              {viewStats.gapList.map(({ subject, grade, cell }) => (
                <li key={`${subject.subject_id}-${grade.grade_id}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void openCell(subject, grade, cell)}
                  >
                    {subject.name}
                    <span className="ml-(--space-2) text-secondary">
                      {grade.name}
                      {cell.phase ? ` · Fase ${cell.phase}` : ""}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p
          role="status"
          className="text-(length:--font-size-body) text-secondary"
        >
          Semua sel penawaran pada filter ini sudah punya panduan di korpus.
        </p>
      )}

      <div className="space-y-(--space-3)">
        <p className="text-(length:--font-size-label) uppercase text-secondary">
          Filter matriks
        </p>
        <ChipTabs
          ariaLabel="Jenjang"
          value={stageFilter}
          onChange={(id) => {
            setStageFilter(id as StageFilterId);
            setSelected(null);
            setCpError("");
          }}
          options={STAGES.map((st) => ({ id: st.id, label: st.label }))}
        />
        <ul
          aria-label="Legenda sel"
          className="flex flex-wrap gap-(--space-4) text-(length:--font-size-body) text-secondary"
        >
          {Object.entries(CELL_STATE).map(([key, s]) => (
            <li key={key}>
              <span aria-hidden="true">{s.glyph}</span> {s.word}
            </li>
          ))}
        </ul>
      </div>

      <section aria-label="Matriks keselarasan" className="space-y-(--space-3)">
        <div className="flex flex-wrap items-baseline gap-(--space-3)">
          <span className="text-(length:--font-size-label) text-secondary">
            01
          </span>
          <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
            Matriks penawaran × panduan
          </h2>
          <span className="text-(length:--font-size-body) text-secondary">
            {subjects.length} mapel · {grades.length} jenjang
          </span>
        </div>
        <div className="overflow-x-auto rounded-control border border-line-subtle">
          <table className="min-w-full border-collapse text-(length:--font-size-body)">
            <caption className="sr-only">
              Baris: mata pelajaran bimbel. Kolom: jenjang. Sel: ketersediaan
              panduan nasional pada fase jenjang tersebut. Klik sel untuk
              membuka bacaan CP.
            </caption>
            <thead>
              <tr className="border-b border-line-subtle bg-surface">
                <th
                  scope="col"
                  className="px-(--space-3) py-(--space-2) text-left"
                >
                  Mata pelajaran
                </th>
                {grades.map((g) => (
                  <th
                    key={g.grade_id}
                    scope="col"
                    className="px-(--space-3) py-(--space-2) text-left"
                  >
                    <span className="block font-medium text-primary">
                      {g.name}
                    </span>
                    <span className="block text-secondary">
                      Fase {g.phase || "—"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.subject_id} className="border-b border-line-subtle">
                  <th
                    scope="row"
                    className="px-(--space-3) py-(--space-2) text-left font-medium text-primary"
                  >
                    {s.name}
                    <span className="ml-(--space-2) text-secondary">
                      {s.stage}
                    </span>
                  </th>
                  {grades.map((g) => {
                    const cell = cellIndex[`${s.subject_id}|${g.grade_id}`];
                    if (!cell) {
                      return (
                        <td
                          key={g.grade_id}
                          className="px-(--space-3) py-(--space-2) text-secondary"
                        >
                          Tidak ditawarkan
                        </td>
                      );
                    }
                    const state = stateFor(cell);
                    const isCurrent =
                      selected?.subject.subject_id === s.subject_id &&
                      selected?.grade.grade_id === g.grade_id;
                    const fill = cellMeterFill(state);
                    return (
                      <td
                        key={g.grade_id}
                        className="px-(--space-2) py-(--space-2)"
                      >
                        <button
                          type="button"
                          data-testid={`align-cell-${s.subject_id}-${g.grade_id}`}
                          aria-current={isCurrent ? "true" : undefined}
                          onClick={() => void openCell(s, g, cell)}
                          className="min-h-(--target-min) w-full rounded-control border border-line-subtle bg-canvas px-(--space-2) py-(--space-2) text-left hover:bg-surface"
                        >
                          <span className="flex items-center gap-(--space-2)">
                            <span aria-hidden="true">
                              {CELL_STATE[state].glyph}
                            </span>
                            <span className="font-medium text-primary">
                              {CELL_STATE[state].short}
                            </span>
                          </span>
                          <span
                            className="mt-(--space-1) block h-1 overflow-hidden rounded-full bg-surface"
                            aria-hidden="true"
                          >
                            <span
                              className="block h-full bg-accent"
                              style={{ width: `${fill}%` }}
                            />
                          </span>
                          <span className="mt-(--space-1) block text-secondary">
                            {cell.cp_count} CP · {cell.element_count} elemen
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        cpError ? (
          <section
            aria-label="Detail keselarasan"
            className="rounded-control border border-line-subtle p-(--space-4)"
          >
            <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
              {selected.subject.name} · {selected.grade.name}
            </h2>
            <p className="mt-(--space-2) text-secondary">{cpError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-(--space-3)"
              onClick={() => setSelected(null)}
            >
              Tutup
            </Button>
          </section>
        ) : paneLoading ? (
          <p className="text-secondary">Memuat capaian…</p>
        ) : (
          <CurriculumReadingPane
            cp={cps[cpIndex] ?? null}
            onClose={() => setSelected(null)}
            onPrev={() => setCpIndex((i) => Math.max(0, i - 1))}
            onNext={() => setCpIndex((i) => Math.min(cps.length - 1, i + 1))}
            hasPrev={cpIndex > 0}
            hasNext={cpIndex < cps.length - 1}
          />
        )
      ) : (
        <p className="text-(length:--font-size-body) text-secondary">
          Pilih sel pada matriks untuk membuka teks Capaian Pembelajaran (jika
          tersedia pada korpus).
        </p>
      )}
    </div>
  );
}

export default function KeselarasanPage() {
  return (
    <ProtectedRoute
      roles={[
        "owner",
        "admin_akademik",
        "tentor",
        "murid_ortu",
        "finance",
        "content_manager",
      ]}
    >
      <AppShell>
        <KeselarasanView />
      </AppShell>
    </ProtectedRoute>
  );
}
