# Staged Diagnosis Page and Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Med Assist diagnosis page show each fact once, open later sections only after a diagnosis is chosen, and add calm motion (unfold, stagger, morphing transfer button, skeleton, progress stepper, transfer order tracker, audit-trail timeline).

**Architecture:** Presentation-only changes in `components/clinical/diagnosis/**` and one trajectory panel. A shared `StagedSection` wraps the four late sections in a native `<details>` whose `open` follows `isDiagnosisChosen(viewModel)`. All motion is CSS appended to `entrypoints/sidepanel/style.css`; no JavaScript animation and no new dependency.

**Tech Stack:** React 19 + TypeScript, WXT MV3, Vitest + Testing Library (jsdom), plain CSS with the capsule's `var(--*)` tokens.

**Spec:** `docs/specs/2026-09-27-diagnosis-page-staged-design.md` (D1–D8), commit `bd97f827`.

## Global Constraints

- Capsule root: `D:\DEV\monorepo\projects\healthcare\med-assist`. Run capsule commands from there
  with `node scripts/pnpm.mjs run <script>`; single test file: `node scripts/pnpm.mjs exec vitest run <path>`.
- `entrypoints/sidepanel/style.css` is protected: append new rules at the end only; never edit or
  remove an existing rule. No other protected file (`main.tsx`, `TTVInferenceUI.tsx`,
  `SentraAssistPanel.tsx`, `ApprovedSentraAssistApp.tsx`) is touched.
- No R3 path (`lib/clinical/**`, `lib/emergency-detector/**`, `lib/iskandar-diagnosis-engine/**`) is touched.
- Colours only through existing tokens (`var(--sentra-safe)`, `var(--sentra-danger)`,
  `var(--sentra-warning)`, `var(--text-main)`, `var(--text-muted)`, `var(--border-subtle)`,
  `var(--neu-inset-bg)`). No literal colours in new CSS.
- Motion: open 250 ms, close 200 ms, curve `cubic-bezier(0.23, 1, 0.32, 1)`; every new motion
  rule has a `@media (prefers-reduced-motion: reduce)` counterpart that keeps only opacity.
- No new dependency; no `framer-motion` use in this plan.
- "Diagnosis chosen" means `viewModel.therapy.selectedDiagnosisCount > 0`.
- Never use `@ts-ignore`, `eslint-disable`, or implicit `any`.
- Existing assertions change only where a task says so; each replaced assertion is named in that
  task's commit message. Commits: explicit paths only, message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No push.
- UI copy stays Indonesian except the existing English section titles ("Clinical Finding",
  "Therapy + Resep", "RME Transfer").

## Review Focus

1. A patient with more than three danger signs: every de-duplicated sign must still be visible
   somewhere (the old Safety-net list is gone) — pinned in Task 1.
2. A doctor removes the chosen diagnosis: staged sections close again and the stepper line
   unfills — pinned in Tasks 3 and 6.
3. A transfer that is `partial` or `cancelled`: the doctor still has a visible way to retry
   (`Ulangi` for `partial`; for `cancelled` the primary button is enabled again) — pinned in Task 4.
4. Buttons moved into a closed `<details>` (Kirim diagnosis/resep, Anamnesis) must keep their
   enable rules — pinned in Task 4.
5. Insufficient data (R69 primary): the page must not show "Pilih" on a non-diagnosis and the
   stepper must stay on Diagnosis — pinned in Tasks 2 and 6.

---

### Task 1: Danger signs once and uncapped; drop "Saran" and Safety-net

**Files:**
- Modify: `components/clinical/diagnosis/DiagnosisWorkspace.tsx` (`TriageSummarySection`, `EducationSection`, `getVisibleSafetyItems`)
- Test: `components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`

**Interfaces:**
- Produces: `getVisibleSafetyItems(redFlags, doNotMiss)` returns every cleaned, de-duplicated item (no cap).

- [ ] **Step 1: Write the failing tests** — in `describe('DiagnosisWorkspace triage section')`, replace the first test's summary assertion and add two tests:

```tsx
  it('keeps the headline visible and folds reasons, referral and red flags into dropdowns', () => {
    const props = makeProps({ triage });
    props.viewModel.evidence.redFlags = ['Penurunan kesadaran'];
    render(<DiagnosisWorkspace {...props} />);

    const section = screen.getByLabelText('Triase & Rujukan');
    const statusChip = section.querySelector('.form-group-header .field-extracted-indicator');
    expect(statusChip).toHaveTextContent('Pertimbangkan rujukan');
    const summaries = Array.from(section.querySelectorAll('details > summary')).map((s) => s.textContent);
    expect(summaries).toEqual(['Alasan', 'Indikasi rujukan', 'Tanda bahaya (2)']);
    section.querySelectorAll('details').forEach((d) => expect(d).not.toHaveAttribute('open'));
    expect(within(section).getByText('Bila komplikasi.')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Pemeriksaan Penunjang')).queryByText('Tanda bahaya')
    ).toBeNull();
  });

  it('shows every de-duplicated danger sign once, with no cap', () => {
    const props = makeProps({ triage });
    props.viewModel.evidence.redFlags = ['SpO2 < 90%', 'RR > 30x/menit', 'Penurunan kesadaran', 'Hemoptisis masif'];
    props.viewModel.evidence.doNotMiss = ['SpO2 < 90%', 'Tanda gagal napas'];
    render(<DiagnosisWorkspace {...props} />);

    const workspace = screen.getByTestId('diagnosis-workspace');
    const section = screen.getByLabelText('Triase & Rujukan');
    expect(within(section).getByText('Tanda bahaya (5)')).toBeInTheDocument();
    ['SpO2 < 90%', 'RR > 30x/menit', 'Penurunan kesadaran', 'Hemoptisis masif', 'Tanda gagal napas'].forEach(
      (item) => expect(within(workspace).getAllByText(item)).toHaveLength(1)
    );
    expect(workspace).not.toHaveTextContent(/Safety-net/);
    expect(workspace).not.toHaveTextContent(/Jangan lewatkan:/);
  });
```

Also change `expect(details).toHaveLength(4);` in the contrast test to `expect(details).toHaveLength(3);`.

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`
Expected: FAIL — summaries still start with `Saran`; Safety-net present; only 3 danger signs.

- [ ] **Step 3: Implement**

In `getVisibleSafetyItems` delete the trailing `.slice(0, 3)` so it ends with `)` after `dedupeSignals(...)`.

In `TriageSummarySection` delete the whole "Saran" `<details>` block, and change the danger-sign summary:

```tsx
      {safetyItems.length > 0 ? (
        <details className="diagnosis-details diagnosis-details--inline diagnosis-details--triage">
          <summary>{`Tanda bahaya (${safetyItems.length})`}</summary>
          <LineList title="Tanda bahaya" items={safetyItems} tone="danger" />
        </details>
      ) : null}
```

In `EducationSection` delete the `safetyItems` constant and the `{safetyItems.length > 0 ? (<LineList title="Safety-net" … />) : null}` block.

- [ ] **Step 4: Run to verify pass** — same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.tsx projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.test.tsx
git commit -m "fix(med-assist): show each danger sign once and uncapped; drop the Saran dropdown and Safety-net

Replaced assertions: triage summaries ['Saran','Alasan','Indikasi rujukan','Tanda bahaya']
-> ['Alasan','Indikasi rujukan','Tanda bahaya (2)']; triage details count 4 -> 3.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Diagnosis cards — Utama above Banding, one confidence, one action each

**Files:**
- Modify: `components/clinical/diagnosis/DiagnosisWorkspace.tsx` (`DiagnosisWorkspace` body order, `MainDiagnosisSection`, `CandidateRow`, `SupportingExamSection`)
- Test: `components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`, `components/clinical/ClinicalDifferential.final-page.test.tsx`

**Interfaces:**
- Produces: `section[data-testid="clinical-diagnosis-primary-card"]` carries `data-selected="true|false"`; `article[data-testid="diagnosis-candidate-row"]` carries `data-selected`. Task 7 styles both.

- [ ] **Step 1: Write the failing tests** — replace the order test in `describe('DiagnosisWorkspace')` and add three tests:

```tsx
  it('renders sections in clinical order with Diagnosis Utama above Diagnosis Banding', () => {
    render(<DiagnosisWorkspace {...makeProps()} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    const labels = Array.from(workspace.querySelectorAll(':scope > section[aria-label]')).map((s) =>
      s.getAttribute('aria-label')
    );
    expect(labels).toEqual([
      'Clinical Finding',
      'Diagnosis Utama',
      'Diagnosis Banding',
      'Pemeriksaan Penunjang',
      'Therapy + Resep',
      'Edukasi',
      'RME Transfer',
    ]);
  });

  it('states confidence once per card, without a confidence rail', () => {
    render(<DiagnosisWorkspace {...makeProps()} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(workspace.querySelector('.diagnosis-confidence-rail')).toBeNull();
    const primary = screen.getByTestId('clinical-diagnosis-primary-card');
    expect(within(primary).getAllByText('Tinggi')).toHaveLength(1);
    const row = screen.getByTestId('diagnosis-candidate-row');
    expect(within(row).getAllByText('Sedang')).toHaveLength(1);
  });

  it('gives each card one action and moves the primary evidence into the primary card', () => {
    const onToggleCandidate = vi.fn();
    const onToggleManualDiagnosisInput = vi.fn();
    render(<DiagnosisWorkspace {...makeProps({ onToggleCandidate, onToggleManualDiagnosisInput })} />);

    const row = screen.getByTestId('diagnosis-candidate-row');
    fireEvent.click(within(row).getByRole('button', { name: 'Pilih' }));
    expect(onToggleCandidate).toHaveBeenCalledWith('2-J06.9');
    expect(screen.queryByText(/Pilih sebagai diagnosis utama/i)).toBeNull();

    const primary = screen.getByTestId('clinical-diagnosis-primary-card');
    fireEvent.click(within(primary).getByRole('button', { name: /Diagnosis manual/ }));
    expect(onToggleManualDiagnosisInput).toHaveBeenCalledTimes(1);
    expect(within(primary).getByText('Alasan')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Pemeriksaan Penunjang')).queryByText('Alasan')).toBeNull();
  });

  it('marks the selected cards for the selection style', () => {
    const viewModel = makeViewModel();
    viewModel.candidates = [
      { ...viewModel.candidates[0], id: '1-J18.9', rank: 1, code: 'J18.9', isSelected: true },
      { ...viewModel.candidates[0], isSelected: true },
    ];
    render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    expect(screen.getByTestId('clinical-diagnosis-primary-card')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('diagnosis-candidate-row')).toHaveAttribute('data-selected', 'true');
  });
```

In the existing test `keeps insufficient data unmistakable without presenting R69 as confirmed`, add
after `expect(workspace).not.toHaveTextContent(/R69/i);`:

```tsx
    expect(within(workspace).queryByRole('button', { name: 'Pilih' })).toBeNull();
```

In `ClinicalDifferential.final-page.test.tsx` change:
- line ~347 and ~588 and ~590: `{ name: /Buka Diagnosis Manual/i }` → `{ name: /Diagnosis manual/i }`;
- line ~359: `within(differentialSection).getAllByText(/Pilih sebagai diagnosis utama/i).length` →
  `within(differentialSection).getAllByRole('button', { name: 'Pilih' }).length`.

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/DiagnosisWorkspace.test.tsx components/clinical/ClinicalDifferential.final-page.test.tsx`
Expected: FAIL (order, rail present, old labels).

- [ ] **Step 3: Implement**

In `DiagnosisWorkspace` render `<MainDiagnosisSection …/>` before `<DifferentialDiagnosisSection …/>` (swap the two blocks, props unchanged).

`MainDiagnosisSection`: compute selection and replace the JSX from the `<section>` opening tag through the manual-diagnosis action bar:

```tsx
  const primarySelected =
    viewModel.candidates.find((candidate) => candidate.rank === 1)?.isSelected === true;

  return (
    <section
      className="form-group diagnosis-block"
      data-testid="clinical-diagnosis-primary-card"
      data-selected={primarySelected ? 'true' : 'false'}
      aria-label="Diagnosis Utama"
    >
      <SectionHeader title="Diagnosis Utama" status={statusLabel} />
      <ReadOnlyPanel tone={primary.isInsufficient ? 'warning' : 'primary'}>
        <strong>{primaryTitle}</strong>
        {!primary.isInsufficient ? (
          <EvidenceTally
            supports={viewModel.evidence.supports}
            against={viewModel.evidence.against}
            missing={viewModel.evidence.missing}
          />
        ) : null}
        {primary.safestNextAction ? (
          <span>{formatClinicalText(primary.safestNextAction)}</span>
        ) : null}
      </ReadOnlyPanel>

      {primary.isInsufficient && primary.missingEvidence.length > 0 ? (
        <LineList title="Perlu dilengkapi" items={primary.missingEvidence} tone="warning" />
      ) : null}

      <div className="diagnosis-primary-actions">
        <button
          type="button"
          className="action-btn action-btn--primary"
          onClick={primary.isInsufficient ? onCompleteData : onTogglePrimaryCandidate}
          disabled={!primary.isInsufficient && !primary.canLock}
        >
          {primary.primaryCtaLabel}
        </button>
        <button
          type="button"
          className="diagnosis-text-button"
          onClick={onToggleManualDiagnosisInput}
        >
          {showManualDiagnosisInput ? 'Tutup diagnosis manual' : 'Diagnosis manual ›'}
        </button>
      </div>

      {!primary.isInsufficient ? (
        <details className="diagnosis-details diagnosis-details--inline">
          <summary>Alasan</summary>
          <div className="diagnosis-evidence-grid">
            <LineList title="Mendukung" items={viewModel.evidence.supports} />
            <LineList title="Yang tidak mendukung" items={viewModel.evidence.against} />
            <LineList title="Catatan" items={viewModel.evidence.review} />
          </div>
        </details>
      ) : null}
```

(the manual-diagnosis form block and `</section>` stay as they are).

`CandidateRow`: add `data-selected={candidate.isSelected ? 'true' : 'false'}` to the `<article>`, delete `<ConfidenceRail label={candidate.confidenceLabel} />`, and change the button text `Pilih sebagai diagnosis utama` → `Pilih`.

`SupportingExamSection`: delete its `<details className="diagnosis-details diagnosis-details--inline">…Alasan…</details>` block.

Delete the now-unused `ConfidenceRail` and `resolveConfidenceTier` functions and the `ConfidenceTier` type (own litter).

- [ ] **Step 4: Run to verify pass** — Step 2 command, then `node scripts/pnpm.mjs exec vitest run components/clinical`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.tsx projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.test.tsx projects/healthcare/med-assist/components/clinical/ClinicalDifferential.final-page.test.tsx
git commit -m "feat(med-assist): put Diagnosis Utama above Banding with one confidence and one action per card

Replaced assertions: section order test (textContent indexOf of four labels) -> direct
section aria-label order; final-page /Buka Diagnosis Manual/i -> /Diagnosis manual/i (3x);
final-page getAllByText(/Pilih sebagai diagnosis utama/i) -> getAllByRole('button', {name: 'Pilih'}).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Staged sections — collapsed until a diagnosis is chosen

**Files:**
- Create: `components/clinical/diagnosis/StagedSection.tsx`
- Modify: `components/clinical/diagnosis/diagnosisDisplayUtils.ts` (add `isDiagnosisChosen`)
- Modify: `components/clinical/diagnosis/DiagnosisWorkspace.tsx` (`SupportingExamSection`, `EducationSection`)
- Modify: `components/clinical/diagnosis/TherapyReviewPanel.tsx`, `components/clinical/diagnosis/RMETransferPanel.tsx` (outer wrapper only)
- Test: `components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`

**Interfaces:**
- Produces: `isDiagnosisChosen(viewModel: DiagnosisPageViewModel): boolean` in `diagnosisDisplayUtils.ts`.
- Produces: `StagedSection({ label, stageIndex, open, header, children }: { label: string; stageIndex: 1 | 2 | 3 | 4; open: boolean; header: ReactNode; children: ReactNode })` rendering
  `<section className="form-group diagnosis-block diagnosis-stage diagnosis-stage--i{n}" aria-label={label}><details className="diagnosis-stage__details" open={open}><summary className="diagnosis-stage__summary">{header}</summary><div className="diagnosis-stage__body">{children}</div></details></section>`.

- [ ] **Step 1: Write the failing tests** — add to `describe('DiagnosisWorkspace')`:

```tsx
  const STAGED = ['Pemeriksaan Penunjang', 'Therapy + Resep', 'Edukasi', 'RME Transfer'];

  it('keeps the late sections collapsed with a one-line summary until a diagnosis is chosen', () => {
    const viewModel = makeViewModel();
    viewModel.therapy = { ...viewModel.therapy, selectedDiagnosisCount: 0, selectedMedicationCount: 0 };
    const { rerender } = render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);

    STAGED.forEach((label) => {
      const details = screen.getByLabelText(label).querySelector('details.diagnosis-stage__details');
      expect(details).not.toHaveAttribute('open');
    });
    expect(
      within(screen.getByLabelText('Therapy + Resep')).getByText('pilih diagnosis dulu')
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Pemeriksaan Penunjang')).getByText('1 disarankan')
    ).toBeInTheDocument();

    const chosen = makeViewModel();
    rerender(<DiagnosisWorkspace {...makeProps({ viewModel: chosen })} />);
    STAGED.forEach((label) => {
      const details = screen.getByLabelText(label).querySelector('details.diagnosis-stage__details');
      expect(details).toHaveAttribute('open');
    });

    rerender(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    STAGED.forEach((label) => {
      const details = screen.getByLabelText(label).querySelector('details.diagnosis-stage__details');
      expect(details).not.toHaveAttribute('open');
    });
  });

  it('numbers the staged sections for the opening stagger', () => {
    render(<DiagnosisWorkspace {...makeProps()} />);
    STAGED.forEach((label, index) =>
      expect(screen.getByLabelText(label)).toHaveClass(`diagnosis-stage--i${index + 1}`)
    );
  });

  it('drops the repeated therapy notices', () => {
    const viewModel = makeViewModel();
    viewModel.therapy = { ...viewModel.therapy, selectedDiagnosisCount: 0, groups: [] };
    render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    const therapy = screen.getByLabelText('Therapy + Resep');
    expect(therapy).not.toHaveTextContent(/Hanya untuk ditinjau/);
    expect(therapy).not.toHaveTextContent(/Pilih diagnosis terlebih dahulu/);
  });

  it('does not repeat supporting-exam items in Edukasi', () => {
    const viewModel = makeViewModel();
    viewModel.evidence = {
      ...viewModel.evidence,
      missing: ['SpO2 dan auskultasi paru'],
      review: ['SpO2 dan auskultasi paru', 'Minum cukup air'],
    };
    render(<DiagnosisWorkspace {...makeProps({ viewModel })} />);
    const education = screen.getByLabelText('Edukasi');
    expect(within(education).queryByText('SpO2 dan auskultasi paru')).toBeNull();
    expect(within(education).getByText('Minum cukup air')).toBeInTheDocument();
    expect(within(education).getByText('1 catatan')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`
Expected: FAIL (no `diagnosis-stage__details`).

- [ ] **Step 3: Implement**

`diagnosisDisplayUtils.ts` — append (import the type at the top: `import type { DiagnosisPageViewModel } from './diagnosisViewModel';` if not already imported):

```ts
export function isDiagnosisChosen(viewModel: DiagnosisPageViewModel): boolean {
  return viewModel.therapy.selectedDiagnosisCount > 0;
}
```

`StagedSection.tsx`:

```tsx
import type { ReactNode } from 'react';

export function StagedSection({
  label,
  stageIndex,
  open,
  header,
  children,
}: {
  label: string;
  stageIndex: 1 | 2 | 3 | 4;
  open: boolean;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`form-group diagnosis-block diagnosis-stage diagnosis-stage--i${stageIndex}`}
      aria-label={label}
    >
      <details className="diagnosis-stage__details" open={open}>
        <summary className="diagnosis-stage__summary">{header}</summary>
        <div className="diagnosis-stage__body">{children}</div>
      </details>
    </section>
  );
}
```

`SupportingExamSection` — replace its outer `<section …>` and `<SectionHeader … />` with:

```tsx
  const examStatus = isInsufficient
    ? 'menunggu diagnosis'
    : needsExam
      ? `${examItems.length} disarankan`
      : 'Tidak rutin';

  return (
    <StagedSection
      label="Pemeriksaan Penunjang"
      stageIndex={1}
      open={isDiagnosisChosen(viewModel)}
      header={<SectionHeader title="Pemeriksaan Penunjang" status={examStatus} />}
    >
      {/* existing body: insufficient panel / LineList / fallback Tanda bahaya list */}
    </StagedSection>
  );
```

`EducationSection` — de-duplicate against the exam list and wrap:

```tsx
function EducationSection({ viewModel }: { viewModel: DiagnosisPageViewModel }) {
  const isInsufficient = viewModel.primary.isInsufficient;
  const examKeys = new Set(
    getVisibleExamItems(viewModel.evidence.missing).map((item) => item.toLowerCase())
  );
  const reviewItems = viewModel.evidence.review.filter(
    (item) => !examKeys.has(cleanClinicalSummary(item).toLowerCase())
  );
  const educationItems =
    reviewItems.length > 0
      ? reviewItems.slice(0, 3)
      : ['Edukasi disesuaikan setelah diagnosis utama dipilih.'];
  const status = isInsufficient
    ? 'menunggu diagnosis'
    : reviewItems.length > 0
      ? `${reviewItems.length} catatan`
      : 'belum ada';

  return (
    <StagedSection
      label="Edukasi"
      stageIndex={3}
      open={isDiagnosisChosen(viewModel)}
      header={<SectionHeader title="Edukasi" status={status} />}
    >
      {isInsufficient ? (
        <ReadOnlyPanel>
          Edukasi final mengikuti diagnosis utama setelah data dilengkapi.
        </ReadOnlyPanel>
      ) : (
        <LineList title="Edukasi pasien" items={educationItems} />
      )}
      {reviewItems.length > educationItems.length ? (
        <details className="diagnosis-details diagnosis-details--inline">
          <summary>Rincian edukasi</summary>
          <LineList title="Catatan tambahan" items={reviewItems.slice(educationItems.length)} />
        </details>
      ) : null}
    </StagedSection>
  );
}
```

Add imports in `DiagnosisWorkspace.tsx`: `import { StagedSection } from './StagedSection';` and `import { isDiagnosisChosen } from './diagnosisDisplayUtils';`.

`TherapyReviewPanel.tsx` — compute `const chosen = isDiagnosisChosen(viewModel);` and
`const status = !chosen ? 'pilih diagnosis dulu' : viewModel.therapy.state === 'loading' ? 'Memuat terapi' : hasDiagnosisBasis ? \`${viewModel.therapy.selectedMedicationCount}/${viewModel.therapy.candidateMedicationCount} obat dipilih\` : 'belum ada rekomendasi';`
Replace the outer `<section className="form-group diagnosis-block" aria-label="Therapy + Resep">` + `<SectionHeader …/>` with
`<StagedSection label="Therapy + Resep" stageIndex={2} open={chosen} header={<SectionHeader title="Therapy + Resep" status={status} />}>` (closing `</StagedSection>`).
Delete the `<ReadOnlyPanel>Hanya untuk ditinjau…</ReadOnlyPanel>` line. Change the `hasDiagnosisBasis ? (…list…) : (<ReadOnlyPanel tone="warning">Pilih diagnosis terlebih dahulu…</ReadOnlyPanel>)` to `hasDiagnosisBasis ? (…list…) : null`.

`RMETransferPanel.tsx` — replace the outer `<section className="form-group diagnosis-block" aria-label="RME Transfer">` + its `<SectionHeader …/>` with
`<StagedSection label="RME Transfer" stageIndex={4} open={isDiagnosisChosen(viewModel)} header={<SectionHeader title="RME Transfer" status={formatTransferState(transfer.state)} />}>`; body unchanged in this task.

- [ ] **Step 4: Run to verify pass**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis components/clinical/ClinicalDifferential.final-page.test.tsx components/clinical/ClinicalDifferential.logic-contract.test.tsx components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx`
Expected: PASS (buttons inside a closed `<details>` stay in the DOM and keep their roles).

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/components/clinical/diagnosis/StagedSection.tsx projects/healthcare/med-assist/components/clinical/diagnosis/diagnosisDisplayUtils.ts projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.tsx projects/healthcare/med-assist/components/clinical/diagnosis/TherapyReviewPanel.tsx projects/healthcare/med-assist/components/clinical/diagnosis/RMETransferPanel.tsx projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.test.tsx
git commit -m "feat(med-assist): collapse supporting exams, therapy, education and transfer until a diagnosis is chosen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: RME Transfer — one status line, one primary action, morphing button

**Files:**
- Modify: `components/clinical/diagnosis/RMETransferPanel.tsx`
- Modify: `entrypoints/sidepanel/style.css` (append)
- Test: `components/clinical/diagnosis/RMETransferPanel.test.tsx`

**Interfaces:**
- Consumes: `StagedSection`, `isDiagnosisChosen` (Task 3).
- Produces: `.diagnosis-autofill-btn[data-state]` markup; the "Rincian transfer" `<details>` holds `.diagnosis-transfer-secondary` (three buttons) followed by the step list (Task 5 replaces the step list).

- [ ] **Step 1: Write the failing tests** — replace the running test and add three:

```tsx
  it('while running shows only the morphing primary button and Batal', () => {
    const onCancelTransfer = vi.fn();
    render(<RMETransferPanel {...makeProps({ onCancelTransfer }, makeViewModel({ state: 'running' }))} />);

    const panel = screen.getByLabelText('RME Transfer');
    const primary = within(panel).getByRole('button', { name: /Isi otomatis RME/i });
    expect(primary).toBeDisabled();
    expect(primary).toHaveAttribute('data-state', 'running');
    expect(within(panel).getByRole('button', { name: /Kirim diagnosis/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Kirim resep/i })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Anamnesis/i })).toBeDisabled();
    expect(within(panel).queryByRole('button', { name: /Ulangi/i })).toBeNull();

    fireEvent.click(within(panel).getByRole('button', { name: /Batal/i }));
    expect(onCancelTransfer).toHaveBeenCalledTimes(1);
  });

  it.each(['failed', 'error', 'partial'])('offers Ulangi beside the primary button when %s', (state) => {
    const onRetryTransfer = vi.fn();
    render(<RMETransferPanel {...makeProps({ onRetryTransfer }, makeViewModel({ state }))} />);
    const panel = screen.getByLabelText('RME Transfer');
    fireEvent.click(within(panel).getByRole('button', { name: /Ulangi/i }));
    expect(onRetryTransfer).toHaveBeenCalledTimes(1);
    expect(within(panel).queryByRole('button', { name: /Batal/i })).toBeNull();
  });

  it.each(['idle', 'success', 'cancelled'])('shows neither Ulangi nor Batal when %s', (state) => {
    render(<RMETransferPanel {...makeProps({}, makeViewModel({ state }))} />);
    const panel = screen.getByLabelText('RME Transfer');
    expect(within(panel).queryByRole('button', { name: /Ulangi/i })).toBeNull();
    expect(within(panel).queryByRole('button', { name: /Batal/i })).toBeNull();
    expect(within(panel).getByRole('button', { name: /Isi otomatis RME/i })).toBeEnabled();
  });

  it('puts the readiness in one line and the single-payload actions inside Rincian transfer', () => {
    render(<RMETransferPanel {...makeProps({}, makeViewModel())} />);
    const panel = screen.getByLabelText('RME Transfer');
    expect(panel.querySelector('.diagnosis-transfer-status')).toHaveTextContent(
      'Diagnosis siap · Resep siap · Obat 1/1'
    );
    expect(panel.querySelectorAll('.diagnosis-static-field')).toHaveLength(0);
    const details = within(panel).getByText('Rincian transfer').closest('details');
    expect(details).not.toBeNull();
    ['Kirim diagnosis', 'Kirim resep', 'Anamnesis'].forEach((name) =>
      expect(within(details as HTMLElement).getByRole('button', { name })).toBeInTheDocument()
    );
  });
```

The existing "shows readiness and step details" test stays unchanged.

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/RMETransferPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** — inside `<StagedSection …>` replace the body up to (not including) the `<details>` "Rincian transfer" block:

```tsx
      <p className="diagnosis-transfer-status">
        {[
          diagnosisReady ? 'Diagnosis siap' : 'Diagnosis belum siap',
          resepReady ? 'Resep siap' : 'Resep belum siap',
          `Obat ${transfer.medicationSelectionLabel}`,
        ].join(' · ')}
      </p>

      {transfer.error ? <ReadOnlyPanel tone="danger">{transfer.error}</ReadOnlyPanel> : null}
      {transfer.reasonLabels.length > 0 ? (
        <ReadOnlyPanel>
          {`Alasan: ${transfer.reasonLabels.map(formatClinicalText).join(' | ')}`}
        </ReadOnlyPanel>
      ) : null}
      {transfer.resultSummary ? (
        <ReadOnlyPanel>{formatClinicalText(transfer.resultSummary)}</ReadOnlyPanel>
      ) : null}

      <div className="diagnosis-transfer-primary">
        <button
          type="button"
          className="action-btn action-btn--primary diagnosis-autofill-btn"
          data-state={transfer.state}
          disabled={!canAutoFill || isRunning}
          onClick={onAutoFillRME}
        >
          <span className="diagnosis-autofill-btn__label">Isi otomatis RME</span>
          <span className="diagnosis-autofill-btn__icon" aria-hidden="true" />
        </button>
        {isRunning ? (
          <button type="button" className="action-btn action-btn--secondary" onClick={onCancelTransfer}>
            Batal
          </button>
        ) : null}
        {canRetry ? (
          <button type="button" className="action-btn action-btn--secondary" onClick={onRetryTransfer}>
            Ulangi
          </button>
        ) : null}
      </div>
```

with `const canRetry = ['failed', 'error', 'partial'].includes(transfer.state);` next to `isRunning`.
Inside the "Rincian transfer" `<details>`, directly after `<summary>`, add:

```tsx
        <div className="diagnosis-transfer-secondary">
          <button type="button" className="action-btn action-btn--secondary" disabled={!diagnosisReady || isRunning} onClick={onTransferDiagnosis}>
            Kirim diagnosis
          </button>
          <button type="button" className="action-btn action-btn--secondary" disabled={!resepReady || isRunning} onClick={onTransferResep}>
            Kirim resep
          </button>
          <button type="button" className="action-btn action-btn--secondary" disabled={!canAutoFill || isRunning} onClick={onTransferAnamnesa}>
            Anamnesis
          </button>
        </div>
```

Delete the two old `action-bar action-bar--tri-tabs` blocks and the now-unused `StaticField` function.

Append to `style.css`:

```css
/* ── Diagnosis page: RME transfer status line and morphing autofill button (2026-09-27) ── */
.diagnosis-transfer-status {
  margin: 0;
  font-size: 11px;
  color: var(--text-main);
}

.diagnosis-transfer-primary,
.diagnosis-transfer-secondary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.diagnosis-autofill-btn {
  position: relative;
  max-width: 100%;
  transition: max-width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

.diagnosis-autofill-btn__label {
  transition: opacity 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.diagnosis-autofill-btn[data-state='running'] {
  max-width: 44px;
}

.diagnosis-autofill-btn[data-state='running'] .diagnosis-autofill-btn__label {
  opacity: 0;
}

.diagnosis-autofill-btn[data-state='running'] .diagnosis-autofill-btn__icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--sentra-safe);
  border-radius: 50%;
  animation: diagnosis-autofill-spin 700ms linear infinite;
}

.diagnosis-autofill-btn[data-state='success'] .diagnosis-autofill-btn__icon::before {
  content: '✓';
  margin-left: 6px;
  color: var(--sentra-safe);
  display: inline-block;
  animation: diagnosis-autofill-check 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

.diagnosis-autofill-btn[data-state='failed'],
.diagnosis-autofill-btn[data-state='error'] {
  animation: diagnosis-autofill-shake 300ms cubic-bezier(0.23, 1, 0.32, 1) 1;
}

@keyframes diagnosis-autofill-spin {
  to { transform: rotate(360deg); }
}

@keyframes diagnosis-autofill-check {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes diagnosis-autofill-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@media (prefers-reduced-motion: reduce) {
  .diagnosis-autofill-btn,
  .diagnosis-autofill-btn[data-state='failed'],
  .diagnosis-autofill-btn[data-state='error'] {
    transition: none;
    animation: none;
  }

  .diagnosis-autofill-btn[data-state='running'] .diagnosis-autofill-btn__icon {
    animation: none;
  }

  .diagnosis-autofill-btn[data-state='success'] .diagnosis-autofill-btn__icon::before {
    animation: none;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis components/clinical/ClinicalDifferential.logic-contract.test.tsx components/clinical/ClinicalDifferential.rme-transfer.e2e.test.tsx components/clinical/ClinicalDifferential.final-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/components/clinical/diagnosis/RMETransferPanel.tsx projects/healthcare/med-assist/components/clinical/diagnosis/RMETransferPanel.test.tsx projects/healthcare/med-assist/entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): one status line and one primary action in RME Transfer, with a morphing autofill button

Replaced assertion: the running test no longer expects a disabled Ulangi button; Ulangi now
renders only for failed, error or partial.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Order tracker for transfer steps

**Files:**
- Create: `components/clinical/diagnosis/TransferStepTracker.tsx`
- Create: `components/clinical/diagnosis/TransferStepTracker.test.tsx`
- Modify: `components/clinical/diagnosis/RMETransferPanel.tsx` (step list inside "Rincian transfer")
- Modify: `entrypoints/sidepanel/style.css` (append)

**Interfaces:**
- Produces: `resolveStepMark(state: string): 'done' | 'failed' | 'running' | 'skipped' | 'waiting'` and `TransferStepTracker({ steps }: { steps: DiagnosisTransferStepView[] })` (use the step type exported by `diagnosisViewModel.ts`; if only the `…ViewModelInput` type is exported, use `DiagnosisPageViewModel['transfer']['steps']`).

- [ ] **Step 1: Write the failing test** (`TransferStepTracker.test.tsx`):

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DiagnosisPageViewModel } from './diagnosisViewModel';
import { TransferStepTracker, resolveStepMark } from './TransferStepTracker';

type Step = DiagnosisPageViewModel['transfer']['steps'][number];

const step = (key: string, state: string): Step => ({
  key,
  label: key,
  state,
  detail: 'ok:0 fail:0 skip:0',
  reason: null,
  message: null,
});

describe('resolveStepMark', () => {
  it.each([
    ['success', 'done'],
    ['failed', 'failed'],
    ['error', 'failed'],
    ['running', 'running'],
    ['skipped', 'skipped'],
    ['cancelled', 'skipped'],
    ['idle', 'waiting'],
    ['pending', 'waiting'],
    ['ready', 'waiting'],
    ['unknown', 'waiting'],
  ])('%s -> %s', (state, mark) => expect(resolveStepMark(state)).toBe(mark));
});

describe('TransferStepTracker', () => {
  it('marks each node and fills the line up to the last finished step', () => {
    render(
      <TransferStepTracker
        steps={[step('anamnesa', 'success'), step('diagnosa', 'failed'), step('resep', 'idle')]}
      />
    );
    const list = screen.getByRole('list', { name: 'Langkah transfer' });
    expect(list).toHaveAttribute('data-filled', '2');
    const items = Array.from(list.querySelectorAll(':scope > li'));
    expect(items.map((li) => li.getAttribute('data-mark'))).toEqual(['done', 'failed', 'waiting']);
    expect(items[0]).toHaveTextContent('anamnesa');
    expect(items[0]).toHaveTextContent('Berhasil');
  });

  it('renders nothing for an empty step list', () => {
    const { container } = render(<TransferStepTracker steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/TransferStepTracker.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** (`TransferStepTracker.tsx`):

```tsx
import { formatClinicalText, formatTransferState } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

type TransferStep = DiagnosisPageViewModel['transfer']['steps'][number];
export type TransferStepMark = 'done' | 'failed' | 'running' | 'skipped' | 'waiting';

export function resolveStepMark(state: string): TransferStepMark {
  if (state === 'success') return 'done';
  if (state === 'failed' || state === 'error') return 'failed';
  if (state === 'running') return 'running';
  if (state === 'skipped' || state === 'cancelled') return 'skipped';
  return 'waiting';
}

export function TransferStepTracker({ steps }: { steps: TransferStep[] }) {
  if (steps.length === 0) return null;

  const marks = steps.map((step) => resolveStepMark(step.state));
  const filled =
    marks.reduce((last, mark, index) => (mark === 'done' || mark === 'failed' || mark === 'skipped' ? index + 1 : last), 0);

  return (
    <ol className="transfer-tracker" aria-label="Langkah transfer" data-filled={filled}>
      {steps.map((step, index) => (
        <li
          key={step.key}
          className={`transfer-tracker__step${index < filled ? ' transfer-tracker__step--reached' : ''}`}
          data-mark={marks[index]}
        >
          <span className="transfer-tracker__node" aria-hidden="true" />
          <div className="transfer-tracker__body">
            <div className="diagnosis-row-title">{formatClinicalText(step.label)}</div>
            <div className="diagnosis-row-meta">
              {formatTransferState(step.state)} | {formatClinicalText(step.detail)}
            </div>
            {step.reason ? <div className="diagnosis-warning">{formatClinicalText(step.reason)}</div> : null}
            {step.message ? <div className="diagnosis-row-meta">{formatClinicalText(step.message)}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
```

In `RMETransferPanel.tsx`, replace the `<div className="diagnosis-list">{transfer.steps.map(…)}</div>` inside "Rincian transfer" with `<TransferStepTracker steps={transfer.steps} />` and import it.

Append to `style.css`:

```css
/* ── Diagnosis page: transfer step order tracker (2026-09-27) ── */
.transfer-tracker {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.transfer-tracker__step {
  position: relative;
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 8px;
}

.transfer-tracker__step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 16px;
  bottom: -10px;
  width: 2px;
  background: var(--border-subtle);
  transition: background-color 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

.transfer-tracker__step--reached:not(:last-child)::after {
  background: var(--sentra-safe);
}

.transfer-tracker__node {
  width: 14px;
  height: 14px;
  margin-top: 1px;
  border-radius: 50%;
  border: 2px solid var(--border-subtle);
  display: grid;
  place-items: center;
  font-size: 9px;
  line-height: 1;
}

.transfer-tracker__step[data-mark='done'] .transfer-tracker__node,
.transfer-tracker__step[data-mark='failed'] .transfer-tracker__node,
.transfer-tracker__step[data-mark='skipped'] .transfer-tracker__node {
  animation: transfer-tracker-stamp 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.transfer-tracker__step[data-mark='done'] .transfer-tracker__node {
  border-color: var(--sentra-safe);
  color: var(--sentra-safe);
}

.transfer-tracker__step[data-mark='done'] .transfer-tracker__node::before {
  content: '✓';
}

.transfer-tracker__step[data-mark='failed'] .transfer-tracker__node {
  border-color: var(--sentra-danger);
  color: var(--sentra-danger);
}

.transfer-tracker__step[data-mark='failed'] .transfer-tracker__node::before {
  content: '✕';
}

.transfer-tracker__step[data-mark='skipped'] .transfer-tracker__node::before {
  content: '–';
  color: var(--text-muted);
}

.transfer-tracker__step[data-mark='running'] .transfer-tracker__node {
  border-color: var(--sentra-warning);
  animation: transfer-tracker-pulse 1s ease-in-out infinite;
}

@keyframes transfer-tracker-stamp {
  from { transform: scale(0.8); opacity: 0.4; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes transfer-tracker-pulse {
  50% { opacity: 0.45; }
}

@media (prefers-reduced-motion: reduce) {
  .transfer-tracker__step:not(:last-child)::after {
    transition: none;
  }

  .transfer-tracker__step[data-mark] .transfer-tracker__node {
    animation: none;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis`
Expected: PASS (the existing readiness test still finds the step detail text).

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/components/clinical/diagnosis/TransferStepTracker.tsx projects/healthcare/med-assist/components/clinical/diagnosis/TransferStepTracker.test.tsx projects/healthcare/med-assist/components/clinical/diagnosis/RMETransferPanel.tsx projects/healthcare/med-assist/entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): show RME transfer steps as an order tracker with stamped nodes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Progress stepper and loading skeleton

**Files:**
- Create: `components/clinical/diagnosis/DiagnosisProgressStepper.tsx`
- Modify: `components/clinical/diagnosis/DiagnosisWorkspace.tsx` (render stepper first; loading branch)
- Modify: `entrypoints/sidepanel/style.css` (append)
- Test: `components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`

**Interfaces:**
- Consumes: `isDiagnosisChosen` (Task 3).
- Produces: `resolveDiagnosisSteps(phase: 'loading' | 'error' | 'ready', viewModel: DiagnosisPageViewModel): Array<{ key: 'finding' | 'diagnosis' | 'therapy' | 'rme'; label: string; done: boolean }>` and `DiagnosisProgressStepper({ phase, viewModel })`.

- [ ] **Step 1: Write the failing tests** — in `DiagnosisWorkspace.test.tsx` (reuses its full
`makeViewModel`, so no cast is needed), add `import { DiagnosisProgressStepper, resolveDiagnosisSteps } from './DiagnosisProgressStepper';` and:

```tsx
function stepperModel(selectedDiagnosisCount: number, selectedMedicationCount: number, state: string) {
  const viewModel = makeViewModel();
  viewModel.therapy = { ...viewModel.therapy, selectedDiagnosisCount, selectedMedicationCount };
  viewModel.transfer = { ...viewModel.transfer, state };
  return viewModel;
}

describe('resolveDiagnosisSteps', () => {
  it('marks steps done from phase, diagnosis, medication and transfer state', () => {
    expect(resolveDiagnosisSteps('ready', stepperModel(1, 1, 'success')).map((s) => s.done)).toEqual([true, true, true, true]);
    expect(resolveDiagnosisSteps('ready', stepperModel(1, 0, 'idle')).map((s) => s.done)).toEqual([true, true, false, false]);
    expect(resolveDiagnosisSteps('loading', stepperModel(0, 0, 'idle')).map((s) => s.done)).toEqual([false, false, false, false]);
    expect(resolveDiagnosisSteps('ready', stepperModel(0, 0, 'idle')).map((s) => s.label)).toEqual(['Temuan', 'Diagnosis', 'Terapi', 'RME']);
  });
});

describe('DiagnosisProgressStepper', () => {
  it('marks the first unfinished step as current and fills the line to it', () => {
    const { rerender } = render(<DiagnosisProgressStepper phase="ready" viewModel={stepperModel(0, 0, 'idle')} />);
    const nav = screen.getByRole('navigation', { name: 'Langkah diagnosis' });
    expect(within(nav).getByText('Diagnosis').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(nav.querySelector('.diagnosis-stepper__fill')).toHaveAttribute('data-filled', '1');

    rerender(<DiagnosisProgressStepper phase="ready" viewModel={stepperModel(1, 1, 'idle')} />);
    expect(within(nav).getByText('RME').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(nav.querySelector('.diagnosis-stepper__fill')).toHaveAttribute('data-filled', '3');

    rerender(<DiagnosisProgressStepper phase="ready" viewModel={stepperModel(0, 1, 'idle')} />);
    expect(within(nav).getByText('Diagnosis').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(nav.querySelector('.diagnosis-stepper__fill')).toHaveAttribute('data-filled', '1');
  });
});
```

Also add to `describe('DiagnosisWorkspace')`:

```tsx
  it('shows the stepper first and a skeleton while loading', () => {
    render(<DiagnosisWorkspace {...makeProps({ phase: 'loading' })} />);
    const workspace = screen.getByTestId('diagnosis-workspace');
    expect(workspace.firstElementChild).toHaveAttribute('aria-label', 'Langkah diagnosis');
    expect(workspace.querySelectorAll('.diagnosis-skeleton__card')).toHaveLength(2);
    expect(screen.getByText('Menyusun diagnosis banding...')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** (`DiagnosisProgressStepper.tsx`):

```tsx
import { isDiagnosisChosen } from './diagnosisDisplayUtils';
import type { DiagnosisPageViewModel } from './diagnosisViewModel';

type StepKey = 'finding' | 'diagnosis' | 'therapy' | 'rme';

export function resolveDiagnosisSteps(
  phase: 'loading' | 'error' | 'ready',
  viewModel: DiagnosisPageViewModel
): Array<{ key: StepKey; label: string; done: boolean }> {
  return [
    { key: 'finding', label: 'Temuan', done: phase === 'ready' },
    { key: 'diagnosis', label: 'Diagnosis', done: isDiagnosisChosen(viewModel) },
    { key: 'therapy', label: 'Terapi', done: viewModel.therapy.selectedMedicationCount > 0 },
    { key: 'rme', label: 'RME', done: viewModel.transfer.state === 'success' },
  ];
}

export function DiagnosisProgressStepper({
  phase,
  viewModel,
}: {
  phase: 'loading' | 'error' | 'ready';
  viewModel: DiagnosisPageViewModel;
}) {
  const steps = resolveDiagnosisSteps(phase, viewModel);
  const firstOpen = steps.findIndex((step) => !step.done);
  const current = firstOpen === -1 ? steps.length - 1 : firstOpen;
  const filled = firstOpen === -1 ? steps.length - 1 : firstOpen;

  return (
    <nav className="diagnosis-stepper" aria-label="Langkah diagnosis">
      <span className="diagnosis-stepper__track" aria-hidden="true">
        <span className="diagnosis-stepper__fill" data-filled={filled} />
      </span>
      <ol className="diagnosis-stepper__list">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="diagnosis-stepper__step"
            data-done={step.done ? 'true' : 'false'}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="diagnosis-stepper__dot" aria-hidden="true" />
            <span className="diagnosis-stepper__label">{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

In `DiagnosisWorkspace` render `<DiagnosisProgressStepper phase={phase} viewModel={viewModel} />` as the first child of the workspace `<div>` (before `<ClinicalContextPanel … />`), and replace the loading branch with:

```tsx
      {phase === 'loading' ? (
        <section className="form-group diagnosis-block" aria-live="polite" aria-busy="true">
          <SectionHeader title="Diagnosis Utama" />
          <span className="sr-only">Menyusun diagnosis banding...</span>
          <div className="diagnosis-skeleton" aria-hidden="true">
            {[0, 1].map((index) => (
              <div key={index} className="diagnosis-skeleton__card">
                <span className="diagnosis-skeleton__bar diagnosis-skeleton__bar--title" />
                <span className="diagnosis-skeleton__bar diagnosis-skeleton__bar--tally" />
                <span className="diagnosis-skeleton__bar diagnosis-skeleton__bar--button" />
              </div>
            ))}
          </div>
        </section>
      ) : null}
```

Append to `style.css`:

```css
/* ── Diagnosis page: progress stepper (2026-09-27) ── */
.diagnosis-stepper {
  position: relative;
  padding: 4px 0;
}

.diagnosis-stepper__track {
  position: absolute;
  left: 12.5%;
  right: 12.5%;
  top: 9px;
  height: 2px;
  background: var(--border-subtle);
}

.diagnosis-stepper__fill {
  display: block;
  height: 100%;
  width: 0;
  background: var(--sentra-safe);
  transition: width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

.diagnosis-stepper__fill[data-filled='1'] { width: 33.333%; }
.diagnosis-stepper__fill[data-filled='2'] { width: 66.667%; }
.diagnosis-stepper__fill[data-filled='3'] { width: 100%; }

.diagnosis-stepper__list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.diagnosis-stepper__step {
  display: grid;
  justify-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted);
}

.diagnosis-stepper__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--border-subtle);
  background: var(--neu-inset-bg);
  transition: border-color 150ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.diagnosis-stepper__step[data-done='true'] .diagnosis-stepper__dot {
  border-color: var(--sentra-safe);
  background: var(--sentra-safe);
}

.diagnosis-stepper__step[aria-current='step'] {
  color: var(--text-main);
  font-weight: 700;
}

.diagnosis-stepper__step[aria-current='step'] .diagnosis-stepper__dot {
  border-color: var(--sentra-safe);
}

/* ── Diagnosis page: loading skeleton (2026-09-27) ── */
.diagnosis-skeleton {
  display: grid;
  gap: 8px;
}

.diagnosis-skeleton__card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-chip);
}

.diagnosis-skeleton__bar {
  display: block;
  height: 10px;
  border-radius: var(--radius-chip);
  background: var(--neu-inset-bg);
  animation: diagnosis-skeleton-pulse 1.2s ease-in-out infinite;
}

.diagnosis-skeleton__bar--title { width: 70%; height: 12px; }
.diagnosis-skeleton__bar--tally { width: 45%; }
.diagnosis-skeleton__bar--button { width: 100%; height: 24px; }

@keyframes diagnosis-skeleton-pulse {
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .diagnosis-stepper__fill,
  .diagnosis-stepper__dot {
    transition: none;
  }

  .diagnosis-skeleton__bar {
    animation: none;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis components/clinical/ClinicalDifferential.final-page.test.tsx`
Expected: PASS. (The Task 2 section-order test uses `:scope > section[aria-label]`, so the `<nav>` does not affect it.)

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisProgressStepper.tsx projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.tsx projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.test.tsx projects/healthcare/med-assist/entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): add a diagnosis progress stepper and a loading skeleton

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Shared motion — unfold, chevrons, stagger, selection

**Files:**
- Modify: `entrypoints/sidepanel/style.css` (append)
- Test: `components/clinical/diagnosis/DiagnosisWorkspace.test.tsx` (stylesheet contract, same pattern as the existing contrast test)

**Interfaces:**
- Consumes: `.diagnosis-stage__details` / `.diagnosis-stage__summary` / `.diagnosis-stage--i1..i4` (Task 3), `[data-selected]` (Task 2), `.diagnosis-text-button` and `.diagnosis-primary-actions` (Task 2).

- [ ] **Step 1: Write the failing test**

```tsx
describe('diagnosis page motion stylesheet', () => {
  const css = readFileSync(resolve(process.cwd(), 'entrypoints/sidepanel/style.css'), 'utf8');

  it('unfolds details content with the shared curve and staggers the staged sections', () => {
    expect(css).toMatch(/\.diagnosis-content\s*\{[^}]*interpolate-size:\s*allow-keywords/);
    expect(css).toMatch(/\.diagnosis-stage__details::details-content/);
    expect(css).toMatch(/\.diagnosis-details::details-content/);
    expect(css).toMatch(/cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
    expect(css).toMatch(/\.diagnosis-stage--i2[^{]*\{[^}]*transition-delay:\s*40ms/);
    expect(css).toMatch(/\.diagnosis-stage--i4[^{]*\{[^}]*transition-delay:\s*120ms/);
    expect(css).toMatch(/\[data-selected='true'\][^{]*\{[^}]*var\(--sentra-safe\)/);
  });

  it('keeps only opacity under reduced motion for the unfold', () => {
    const reduced = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    expect(reduced).toMatch(/\.diagnosis-stage__details::details-content/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** — append to `style.css`:

```css
/* ── Diagnosis page: unfold motion, chevrons, staged stagger, selection (2026-09-27) ── */
.diagnosis-content {
  interpolate-size: allow-keywords;
}

.diagnosis-stage__details > .diagnosis-stage__summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.diagnosis-stage__summary > .form-group-header {
  flex: 1;
}

.diagnosis-stage__details > .diagnosis-stage__summary::-webkit-details-marker,
.diagnosis-details > summary::-webkit-details-marker {
  display: none;
}

.diagnosis-details > summary {
  list-style: none;
}

.diagnosis-stage__details > .diagnosis-stage__summary::before,
.diagnosis-details > summary::before {
  content: '▸';
  display: inline-block;
  margin-right: 6px;
  transition: rotate 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

.diagnosis-stage__details[open] > .diagnosis-stage__summary::before,
.diagnosis-details[open] > summary::before {
  rotate: 90deg;
}

.diagnosis-stage__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.diagnosis-stage__details::details-content,
.diagnosis-details::details-content {
  block-size: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    block-size 200ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 150ms cubic-bezier(0.23, 1, 0.32, 1),
    content-visibility 200ms allow-discrete;
}

.diagnosis-stage__details[open]::details-content,
.diagnosis-details[open]::details-content {
  block-size: auto;
  opacity: 1;
  transition-duration: 250ms, 250ms, 250ms;
}

.diagnosis-stage--i2 > .diagnosis-stage__details[open]::details-content {
  transition-delay: 40ms;
}

.diagnosis-stage--i3 > .diagnosis-stage__details[open]::details-content {
  transition-delay: 80ms;
}

.diagnosis-stage--i4 > .diagnosis-stage__details[open]::details-content {
  transition-delay: 120ms;
}

.diagnosis-primary-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.diagnosis-text-button {
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.diagnosis-candidate-row,
.diagnosis-block[data-selected] .diagnosis-readonly-field--primary {
  transition: border-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.diagnosis-candidate-row[data-selected='true'],
.diagnosis-block[data-selected='true'] .diagnosis-readonly-field--primary {
  border-color: var(--sentra-safe);
}

@media (prefers-reduced-motion: reduce) {
  .diagnosis-stage__details::details-content,
  .diagnosis-details::details-content {
    block-size: auto;
    transition:
      opacity 150ms linear,
      content-visibility 150ms allow-discrete;
    transition-delay: 0ms;
  }

  .diagnosis-stage__details > .diagnosis-stage__summary::before,
  .diagnosis-details > summary::before,
  .diagnosis-candidate-row,
  .diagnosis-block[data-selected] .diagnosis-readonly-field--primary {
    transition: none;
  }
}
```

- [ ] **Step 4: Run to verify pass** — same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/entrypoints/sidepanel/style.css projects/healthcare/med-assist/components/clinical/diagnosis/DiagnosisWorkspace.test.tsx
git commit -m "feat(med-assist): unfold motion, chevrons, staged stagger and selection style on the diagnosis page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Activity timeline for the Clinical Trajectory audit trail

**Files:**
- Modify: `components/clinical/trajectory/v2/ClinicalReasoningDifferentialPanel.tsx` (`renderAuditTrail`)
- Modify: `entrypoints/sidepanel/style.css` (append)
- Test: `components/clinical/trajectory/v2/ClinicalTrajectoryV2.test.tsx` (add assertions to the test that reads `clinical-reasoning-audit-trail`, ~line 240)

**Interfaces:** none new.

- [ ] **Step 1: Write the failing assertions** — after `const auditTrail = screen.getByTestId('clinical-reasoning-audit-trail');` add:

```tsx
    const timeline = auditTrail.querySelector('ol.ct-audit-timeline');
    expect(timeline).not.toBeNull();
    const events = Array.from((timeline as HTMLElement).querySelectorAll(':scope > li.ct-audit-timeline__event'));
    expect(events.length).toBeGreaterThan(0);
    expect(events.length).toBe(within(auditTrail).getAllByText(/^Step \d+$/).length);
    events.forEach((event) => expect(event.querySelector('.ct-audit-timeline__node')).not.toBeNull());
```

- [ ] **Step 2: Run to verify failure**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/trajectory/v2/ClinicalTrajectoryV2.test.tsx`
Expected: FAIL (no `ol.ct-audit-timeline`).

- [ ] **Step 3: Implement** — replace `renderAuditTrail`:

```tsx
function renderAuditTrail(auditTrail: ClinicalReasoningWorkflowAuditEvent[]) {
  return (
    <ol className="ct-audit-timeline">
      {auditTrail.map((event) => (
        <li key={event.id} className="ct-audit-timeline__event">
          <span className="ct-audit-timeline__node" aria-hidden="true" />
          <div className="ct-v2-detail-card px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-platinum">
                Step {event.sequence}
              </span>
              <span className="text-[10px] uppercase tracking-[0.04em] text-muted">
                {sentenceCase(event.stage)} · {sentenceCase(event.status)}
              </span>
            </div>
            <div className="mt-1 text-small leading-relaxed text-muted">
              {sentenceCase(event.summary)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

Append to `style.css`:

```css
/* ── Clinical Trajectory: audit trail activity timeline (2026-09-27) ── */
.ct-audit-timeline {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0 0 0 18px;
  display: grid;
  gap: 8px;
}

.ct-audit-timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--border-subtle);
  transform-origin: top;
}

.ct-audit-timeline__event {
  position: relative;
}

.ct-audit-timeline__node {
  position: absolute;
  left: -17px;
  top: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--sentra-safe);
  background: var(--neu-inset-bg);
}

details[open] .ct-audit-timeline::before {
  animation: ct-audit-line-grow 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

details[open] .ct-audit-timeline__event {
  animation: ct-audit-event-in 200ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

details[open] .ct-audit-timeline__event:nth-child(2) { animation-delay: 40ms; }
details[open] .ct-audit-timeline__event:nth-child(3) { animation-delay: 80ms; }
details[open] .ct-audit-timeline__event:nth-child(4) { animation-delay: 120ms; }
details[open] .ct-audit-timeline__event:nth-child(5) { animation-delay: 160ms; }
details[open] .ct-audit-timeline__event:nth-child(n + 6) { animation-delay: 200ms; }

@keyframes ct-audit-line-grow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}

@keyframes ct-audit-event-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  details[open] .ct-audit-timeline::before {
    animation: none;
  }

  details[open] .ct-audit-timeline__event {
    animation: ct-audit-event-fade 150ms linear both;
    animation-delay: 0ms;
  }

  @keyframes ct-audit-event-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/trajectory components/clinical/ClinicalTrajectory.safety.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/healthcare/med-assist/components/clinical/trajectory/v2/ClinicalReasoningDifferentialPanel.tsx projects/healthcare/med-assist/components/clinical/trajectory/v2/ClinicalTrajectoryV2.test.tsx projects/healthcare/med-assist/entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): render the trajectory audit trail as an activity timeline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Gates, docs and handoff

**Files:**
- Modify: `DECISIONS.md` (new entries at the top: order reversal to Utama above Banding; danger signs uncapped and single; therapy disclaimer removed because the global footer states physician authority)
- Modify: `.agents/HANDOFF.md` (overwrite: this batch, commits, verification, open items)
- Modify: `docs/specs/2026-09-27-diagnosis-page-staged-design.md` (add "Updated after implementation" line only if behaviour differs from the spec)

- [ ] **Step 1: Run all gates** from the capsule root:

```bash
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run run:check
```

Expected: all exit 0; test count ≥ 1175 passed plus the new tests.

- [ ] **Step 2: Run token-guard and safrs-auditor** on the range `ff193e0e..HEAD`; fix findings in place.

- [ ] **Step 3: Write DECISIONS.md entries and overwrite HANDOFF.md**, then commit:

```bash
git add projects/healthcare/med-assist/DECISIONS.md projects/healthcare/med-assist/.agents/HANDOFF.md
git commit -m "docs(med-assist): hand off the staged diagnosis page and motion batch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
