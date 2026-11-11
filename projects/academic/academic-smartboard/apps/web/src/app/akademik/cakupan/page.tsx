"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../../components/AppShell.tsx";
import { CurriculumReadingPane } from "../../../components/CurriculumReadingPane.tsx";
import { EmptyState } from "../../../components/EmptyState.tsx";
import { PageHead } from "../../../components/PageHead.tsx";
import { ProtectedRoute } from "../../../components/ProtectedRoute.tsx";
import { Button } from "../../../components/ui/button.tsx";
import {
  type CurriculumOutcome,
  getCurriculumCoverage,
  getCurriculumStructure,
  listCurriculumOutcomes,
  listGradeLevels,
} from "../../../lib/api.ts";
import {
  coverageProgressPct,
  formatTaughtAt,
  isCoverageComplete,
  isCoveragePartial,
  ROW_STATE,
  rowStateFor,
  taughtCountSuffix,
} from "../../../lib/curriculumCoverage.ts";
import { phaseForGrade } from "../../../lib/curriculumPhase.ts";
import { getNationalSubjects } from "../../../lib/curriculumStructure.ts";

function CakupanView() {
  const [gradeId, setGradeId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [cps, setCps] = useState<CurriculumOutcome[]>([]);
  const [cpIndex, setCpIndex] = useState(0);
  const [cpError, setCpError] = useState("");
  const [paneLoading, setPaneLoading] = useState(false);

  const gradesQ = useQuery({ queryKey: ["grades"], queryFn: listGradeLevels });
  const structureQ = useQuery({
    queryKey: ["curriculum-structure"],
    queryFn: getCurriculumStructure,
  });

  const selectedGrade =
    gradesQ.data?.find((g) => g.grade_id === gradeId) ?? null;
  const phase = selectedGrade
    ? phaseForGrade(selectedGrade.stage, selectedGrade.order)
    : null;

  const nationalSubjects = useMemo(
    () => getNationalSubjects(structureQ.data, phase),
    [structureQ.data, phase],
  );

  // Changing grade or subject invalidates the outcome open in the reading pane.
  function resetOutcome(): void {
    setSelectedCode(null);
    setCps([]);
    setCpError("");
  }

  useEffect(() => {
    if (
      subjectName &&
      nationalSubjects.length > 0 &&
      !nationalSubjects.includes(subjectName)
    ) {
      setSubjectName("");
      setSelectedCode(null);
      setCps([]);
      setCpError("");
    }
  }, [subjectName, nationalSubjects]);

  const coverageQ = useQuery({
    queryKey: ["curriculum-coverage", subjectName, gradeId],
    queryFn: () =>
      getCurriculumCoverage({
        subject: subjectName || undefined,
        grade_id: gradeId || undefined,
      }),
    enabled: Boolean(subjectName && gradeId),
  });

  async function openCp(code: string): Promise<void> {
    const coverage = coverageQ.data;
    if (!coverage?.grade?.phase || !coverage.subject?.name) return;
    setSelectedCode(code);
    setCps([]);
    setCpIndex(0);
    setCpError("");
    setPaneLoading(true);
    try {
      const data = await listCurriculumOutcomes({
        phase: coverage.grade.phase,
        subject: coverage.subject.name,
      });
      const items = Array.isArray(data) ? data : (data.items ?? []);
      setCps(items);
      const idx = items.findIndex((it) => it.learning_outcome_code === code);
      if (idx >= 0) {
        setCpIndex(idx);
      } else if (items.length === 0) {
        setCpError(
          "Teks capaian tidak tersedia untuk CP ini (lisensi tertutup atau belum ada di korpus).",
        );
      } else {
        setCpIndex(0);
        setCpError(
          `Capaian ${code} tidak ditemukan pada hasil baca fase ${coverage.grade.phase}.`,
        );
      }
    } catch {
      setCpError("Gagal memuat Capaian Pembelajaran.");
    } finally {
      setPaneLoading(false);
    }
  }

  const metaLoading = gradesQ.isPending || structureQ.isPending;
  const metaError = gradesQ.isError || structureQ.isError;
  const coverage = coverageQ.data;
  const totals = coverage?.totals ?? { cp_total: 0, cp_taught: 0 };
  const progressComplete = isCoverageComplete(totals);
  const progressPartial = isCoveragePartial(totals);
  const progressPct = coverageProgressPct(totals);

  return (
    <div className="space-y-(--space-5)">
      <PageHead
        seq="AKA"
        eyebrow="Akademik"
        title="Cakupan Kurikulum"
        lede="Daftar mata pelajaran nasional pada fase jenjang yang dipilih. Menunjukkan Capaian Pembelajaran yang telah ditandai diajarkan pada sesi bimbel, serta yang belum."
      />

      {metaLoading ? (
        <p className="text-secondary">Memuat filter.</p>
      ) : metaError && !gradeId ? (
        <p role="alert" className="text-critical">
          Gagal memuat jenjang dan daftar mata pelajaran nasional.
        </p>
      ) : (
        <>
          <div className="space-y-(--space-3)">
            <div className="flex flex-wrap items-center gap-(--space-3)">
              <span className="text-(length:--font-size-label) uppercase text-secondary">
                Ruang lingkup
              </span>
              {phase ? (
                <span
                  data-testid="coverage-phase-chip"
                  className="text-accent-text"
                >
                  Fase {phase}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-(--space-3)">
              <label className="flex min-w-48 flex-col gap-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Jenjang
                </span>
                <select
                  id="coverage-grade"
                  data-testid="coverage-grade"
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2)"
                  value={gradeId}
                  onChange={(e) => {
                    setGradeId(e.target.value);
                    resetOutcome();
                  }}
                >
                  <option value="">Pilih jenjang</option>
                  {(gradesQ.data ?? []).map((g) => {
                    const gPhase = phaseForGrade(g.stage, g.order);
                    return (
                      <option key={g.grade_id} value={g.grade_id}>
                        {g.name}
                        {gPhase ? ` · Fase ${gPhase}` : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex min-w-56 flex-col gap-(--space-1)">
                <span className="text-(length:--font-size-label) text-secondary">
                  Mata pelajaran nasional
                </span>
                <select
                  id="coverage-subject"
                  data-testid="coverage-subject"
                  className="min-h-(--target-min) rounded-control border border-line-subtle bg-canvas px-(--space-3) py-(--space-2)"
                  value={subjectName}
                  onChange={(e) => {
                    setSubjectName(e.target.value);
                    resetOutcome();
                  }}
                  disabled={!gradeId || !phase}
                >
                  <option value="">
                    {!gradeId
                      ? "Pilih jenjang terlebih dahulu"
                      : !phase
                        ? "Jenjang ini belum terpetakan ke fase kurikulum"
                        : nationalSubjects.length === 0
                          ? "Tidak ada mata pelajaran pada fase ini"
                          : `Pilih mata pelajaran (${nationalSubjects.length})`}
                  </option>
                  {nationalSubjects.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {!gradeId || !subjectName ? (
            <EmptyState
              testId="coverage-prompt"
              title="Pilih ruang lingkup cakupan"
              lede="Pilih jenjang terlebih dahulu, kemudian pilih mata pelajaran nasional pada fase tersebut."
            />
          ) : coverageQ.isPending ? (
            <EmptyState
              title="Memuat cakupan kurikulum"
              lede="Mengambil capaian dan penandaan sesi untuk ruang lingkup yang dipilih."
            />
          ) : coverageQ.isError ? (
            <EmptyState
              title="Cakupan belum dapat dimuat"
              lede="Gagal memuat data cakupan kurikulum."
            />
          ) : !coverage ? (
            <EmptyState
              title="Data cakupan belum tersedia"
              lede="Ruang lingkup ini belum memiliki capaian yang dapat dipetakan di korpus."
            />
          ) : (
            <div className="space-y-(--space-5)">
              <section
                data-testid="coverage-thesis"
                aria-label="Ringkasan cakupan"
                className="grid gap-(--space-4) rounded-control border border-line-subtle bg-surface p-(--space-4) md:grid-cols-[1.4fr_1fr]"
              >
                <div>
                  <p className="text-(length:--font-size-label) uppercase text-secondary">
                    Sudah diajarkan
                  </p>
                  <p
                    className={`mt-(--space-2) text-(length:--font-size-title-section) font-semibold ${
                      progressComplete
                        ? "text-success"
                        : progressPartial
                          ? "text-warning"
                          : "text-primary"
                    }`}
                  >
                    {totals.cp_taught} / {totals.cp_total}
                  </p>
                  <p className="mt-(--space-2) text-(length:--font-size-body) text-secondary">
                    Capaian Pembelajaran yang sudah ditandai diajarkan pada sesi
                    bimbel, dibanding total CP pada fase ini.
                  </p>
                  <div
                    className="mt-(--space-3) h-2 overflow-hidden rounded-full bg-canvas"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                <ul className="space-y-(--space-3) text-(length:--font-size-body)">
                  <li>
                    <span className="text-secondary">Mata pelajaran</span>{" "}
                    <strong className="text-primary">
                      {coverage.subject?.name ?? "—"}
                    </strong>
                  </li>
                  <li>
                    <span className="text-secondary">Jenjang</span>{" "}
                    <strong className="text-primary">
                      {coverage.grade?.name ?? "—"}
                    </strong>
                  </li>
                  <li>
                    <span className="text-secondary">Fase</span>{" "}
                    <strong className="text-primary">
                      {coverage.grade?.phase || "—"}
                    </strong>
                  </li>
                </ul>
              </section>

              <ul
                aria-label="Legenda status cakupan"
                className="flex flex-wrap gap-(--space-4) text-(length:--font-size-body) text-secondary"
              >
                <li>
                  <span aria-hidden="true">{ROW_STATE.taught.glyph}</span>{" "}
                  {ROW_STATE.taught.word}
                </li>
                <li>
                  <span aria-hidden="true">{ROW_STATE.untaught.glyph}</span>{" "}
                  {ROW_STATE.untaught.word}
                </li>
              </ul>

              {coverage.subject?.offered === false ? (
                <p className="rounded-control border border-line-subtle p-(--space-3) text-(length:--font-size-body) text-secondary">
                  Mata pelajaran ini tercantum pada panduan nasional, namun
                  belum terdaftar pada master bimbel. Perhitungan status
                  mengikuti penandaan Capaian Pembelajaran pada sesi di jenjang
                  ini.
                </p>
              ) : null}

              {(coverage.cps?.length ?? 0) === 0 ? (
                <p className="text-secondary">
                  Belum tersedia Capaian Pembelajaran nasional untuk{" "}
                  {coverage.subject?.name} pada fase{" "}
                  {coverage.grade?.phase || "—"}.
                </p>
              ) : (
                <section
                  aria-label="Daftar capaian"
                  className="space-y-(--space-3)"
                >
                  <div className="flex flex-wrap items-baseline gap-(--space-3)">
                    <span className="text-(length:--font-size-label) text-secondary">
                      01
                    </span>
                    <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
                      Capaian Pembelajaran
                    </h2>
                    <span className="text-(length:--font-size-body) text-secondary">
                      {totals.cp_taught} dari {totals.cp_total} telah ditandai
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-control border border-line-subtle">
                    <table className="min-w-full border-collapse text-(length:--font-size-body)">
                      <caption className="sr-only">
                        Daftar Capaian Pembelajaran pada fase jenjang. Status
                        mengikuti evaluasi yang menandai kode CP.
                      </caption>
                      <thead>
                        <tr className="border-b border-line-subtle bg-surface">
                          <th
                            scope="col"
                            className="px-(--space-3) py-(--space-2) text-left"
                          >
                            Kode CP
                          </th>
                          <th
                            scope="col"
                            className="px-(--space-3) py-(--space-2) text-left"
                          >
                            Elemen
                          </th>
                          <th
                            scope="col"
                            className="px-(--space-3) py-(--space-2) text-left"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-(--space-3) py-(--space-2) text-left"
                          >
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(coverage.cps ?? []).map((cp) => {
                          const state = rowStateFor(cp);
                          const when = formatTaughtAt(cp.last_taught_at);
                          const suffix = taughtCountSuffix(cp.taught_count);
                          return (
                            <tr
                              key={cp.learning_outcome_code}
                              className="border-b border-line-subtle"
                            >
                              <th
                                scope="row"
                                className="px-(--space-3) py-(--space-2) text-left font-medium text-primary"
                              >
                                {cp.learning_outcome_code}
                              </th>
                              <td className="px-(--space-3) py-(--space-2) text-secondary">
                                {cp.element_name || "—"}
                              </td>
                              <td className="px-(--space-3) py-(--space-2)">
                                <span aria-hidden="true">
                                  {ROW_STATE[state].glyph}
                                </span>{" "}
                                {ROW_STATE[state].word}
                                {suffix}
                                {cp.taught_count > 0 && when
                                  ? ` · Terakhir ${when}`
                                  : null}
                              </td>
                              <td className="px-(--space-3) py-(--space-2)">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  data-testid={`coverage-cp-${cp.learning_outcome_code}`}
                                  onClick={() =>
                                    void openCp(cp.learning_outcome_code)
                                  }
                                >
                                  Buka capaian
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <p className="text-(length:--font-size-body) text-secondary">
                Cakupan diukur per Capaian Pembelajaran. Penandaan per elemen
                belum tersedia. Daftar mata pelajaran diambil dari korpus
                nasional per fase, bukan hanya dari master bimbel.
              </p>

              {selectedCode ? (
                cpError ? (
                  <section
                    aria-label="Detail cakupan"
                    className="rounded-control border border-line-subtle p-(--space-4)"
                  >
                    <h2 className="text-(length:--font-size-title-section) font-semibold text-primary">
                      {selectedCode}
                    </h2>
                    <p className="mt-(--space-2) text-secondary">{cpError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-(--space-3)"
                      onClick={() => setSelectedCode(null)}
                    >
                      Tutup
                    </Button>
                  </section>
                ) : paneLoading ? (
                  <p className="text-secondary">Memuat capaian…</p>
                ) : (
                  <CurriculumReadingPane
                    cp={cps[cpIndex] ?? null}
                    onClose={() => setSelectedCode(null)}
                    onPrev={() => setCpIndex((i) => Math.max(0, i - 1))}
                    onNext={() =>
                      setCpIndex((i) => Math.min(cps.length - 1, i + 1))
                    }
                    hasPrev={cpIndex > 0}
                    hasNext={cpIndex < cps.length - 1}
                  />
                )
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CakupanPage() {
  return (
    <ProtectedRoute roles={["owner", "admin_akademik", "tentor"]}>
      <AppShell>
        <CakupanView />
      </AppShell>
    </ProtectedRoute>
  );
}
