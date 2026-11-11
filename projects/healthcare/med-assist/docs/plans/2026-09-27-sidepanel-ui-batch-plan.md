# Side panel UI batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the six side panel changes Chief approved on 2026-09-27 (WP1–WP6).

**Architecture:** Small, local edits to existing React components (trajectory, diagnosis workspace,
TTV pregnancy header, emergency verdict card), one new side panel component (Send to Doctors), one
new medboard route with a pure helper, and a session-driven practitioner resolver applied in the
background worker before each RME fill step, with exact-match autocomplete selection.

**Tech Stack:** React 19 + TypeScript, WXT (MV3), Vitest + Testing Library (jsdom); medboard is
Next.js with `node:test` via `tsx`.

**Spec:** `docs/specs/2026-09-27-sidepanel-ui-batch-design.md` (read it first).

## Global Constraints

- Capsule root: `D:\DEV\monorepo\projects\healthcare\med-assist`. Run capsule commands from there
  with `node scripts/pnpm.mjs run <script>`; single test file: `node scripts/pnpm.mjs exec vitest run <path>`.
- Protected files may change only where Chief approved: `entrypoints/sidepanel/main.tsx` (the
  `EmergencyDashboard` verdict card only), `components/clinical/TTVInferenceUI.tsx` (Status
  Kehamilan header only), `entrypoints/sidepanel/style.css` (append new classes only; never edit or
  remove an existing rule).
- The action bar keeps exactly three buttons (`ui-authority.smoke.test.tsx` must stay green).
- Colours only through existing tokens (`var(--sentra-safe)`, `var(--text-muted)`, `var(--border-subtle)`, ...). No literal colours in new CSS.
- No phone number, token, or patient identifier in tracked files, tests, logs, or commit messages.
  Test fixtures use obviously fake numbers such as `6280000000001`.
- Never use `@ts-ignore`, `eslint-disable`, or implicit `any`.
- Existing assertions are changed only where a task says so; each replaced assertion is named in
  that task's commit message.
- Commits: explicit paths only, message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No push.
- UI copy in Bahasa Indonesia except the names Chief chose: "Clinical Finding", "Open", "Close",
  "Send to Doctors".

## Review Focus

- Referral text whose lines are PDF line-wraps (no bullet or number) must stay one item, not be cut mid-sentence (Task 2 test).
- With no triage result the red flags ("Tanda bahaya") must still show, in Pemeriksaan Penunjang (Task 2 test).
- A practitioner name carrying degrees ("Ns. Dian Sunardi, S.Kep") must match a plain menu item, and two menu items sharing the name must select nothing (Task 7 tests).
- Crew API unauthorised or zero contacts must show a message and open no tab (Task 6 test).
- A local account (id `local:...`) or an unknown profession must keep the constant names (Task 8 test).

---

### Task 1: Trajectory "Hasil" dropdown and green Open/Close hints (WP1)

**Files:**
- Create: `components/clinical/trajectory/v2/DisclosureHint.tsx`
- Modify: `components/clinical/trajectory/charts/chart-shared.tsx:190-195` (Hasil card)
- Modify: `components/clinical/trajectory/v2/ClinicalTrajectoryV2.tsx:312-316` (Review details summary)
- Modify: `components/clinical/trajectory/v2/ClinicalEvidenceDrawer.tsx:159-168` (Evidence map summary)
- Modify: `components/clinical/trajectory/v2/ClinicalReasoningDifferentialPanel.tsx:192-201` (Audit trail summary)
- Modify: `entrypoints/sidepanel/style.css` (append at end of file)
- Test: `components/clinical/trajectory/v2/DisclosureHint.test.tsx` (new), `components/clinical/trajectory/v2/TrajectoryClinicalCorePanels.test.tsx`

**Interfaces:**
- Produces: `DisclosureHint(): JSX.Element` — renders `<span class="ct-disclosure-hint" aria-hidden="true"><span class="ct-disclosure-hint__open">Open</span><span class="ct-disclosure-hint__close">Close</span></span>`.

- [ ] **Step 1: Write the failing tests**

`components/clinical/trajectory/v2/DisclosureHint.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { DisclosureHint } from './DisclosureHint';

describe('DisclosureHint', () => {
  it('renders both words, hidden from assistive technology', () => {
    const { container } = render(<DisclosureHint />);
    const hint = container.querySelector('.ct-disclosure-hint');
    expect(hint?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Open')).toHaveClass('ct-disclosure-hint__open');
    expect(screen.getByText('Close')).toHaveClass('ct-disclosure-hint__close');
  });

  it('is styled green through the safe token and switches words on details[open]', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../../../entrypoints/sidepanel/style.css'), 'utf8');
    expect(css).toMatch(/\.ct-disclosure-hint\s*\{[^}]*color:\s*var\(--sentra-safe\)/);
    expect(css).toMatch(/details\[open\]\s*>\s*summary\s+\.ct-disclosure-hint__open\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/details\[open\]\s*>\s*summary\s+\.ct-disclosure-hint__close\s*\{[^}]*display:\s*inline/);
  });
});
```

Append to the existing `it` block in `TrajectoryClinicalCorePanels.test.tsx` that checks the timeline panel (after line 131):

```tsx
    const timelineResult = within(timelinePanel).getByTestId('trajectory-simple-result');
    expect(timelineResult.tagName).toBe('DETAILS');
    expect(timelineResult).not.toHaveAttribute('open');
    expect(within(timelineResult).getByText('Hasil')).toBeInTheDocument();
    expect(within(timelineResult).getByText('Open')).toBeInTheDocument();
```

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/trajectory/v2/DisclosureHint.test.tsx components/clinical/trajectory/v2/TrajectoryClinicalCorePanels.test.tsx`
Expected: FAIL (module `./DisclosureHint` not found; `DIV` is not `DETAILS`).

- [ ] **Step 3: Implement**

`DisclosureHint.tsx`:

```tsx
export function DisclosureHint() {
  return (
    <span className="ct-disclosure-hint" aria-hidden="true">
      <span className="ct-disclosure-hint__open">Open</span>
      <span className="ct-disclosure-hint__close">Close</span>
    </span>
  );
}
```

`chart-shared.tsx` Hasil card becomes (import `DisclosureHint` from `../v2/DisclosureHint`):

```tsx
      <details className="neu-card-inset p-4 md:p-5" data-testid="trajectory-simple-result">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div className="ttv-label text-tertiary">Hasil</div>
            <DisclosureHint />
          </div>
        </summary>
        <div className="mt-3">{result}</div>
      </details>
```

In each of the three summaries, add `<DisclosureHint />` as the last child of `.ct-v2-panel-head`
(for Review details the head currently holds only the title; add it after the title div).

Append to the end of `style.css`:

```css
/* ── Disclosure hint: green Open/Close on trajectory dropdowns (2026-09-27) ── */
.ct-disclosure-hint {
  color: var(--sentra-safe);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
}

.ct-disclosure-hint__close {
  display: none;
}

details[open] > summary .ct-disclosure-hint__open {
  display: none;
}

details[open] > summary .ct-disclosure-hint__close {
  display: inline;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command, then the whole trajectory folder:
`node scripts/pnpm.mjs exec vitest run components/clinical/trajectory components/clinical/ClinicalTrajectory.safety.test.tsx entrypoints/sidepanel/main.workbench-runtime.test.tsx`
Expected: PASS. If an existing test asserts the exact text of a summary (e.g. `getByText('Evidence map')`), it still passes because the title text is unchanged.

- [ ] **Step 5: Token check and commit** (Tasks 1, 3, 4 and 6 change rendered UI: run the
  token-guard agent over the task's diff before committing and fix what it flags)

```bash
git add components/clinical/trajectory/v2/DisclosureHint.tsx components/clinical/trajectory/v2/DisclosureHint.test.tsx components/clinical/trajectory/charts/chart-shared.tsx components/clinical/trajectory/v2/ClinicalTrajectoryV2.tsx components/clinical/trajectory/v2/ClinicalEvidenceDrawer.tsx components/clinical/trajectory/v2/ClinicalReasoningDifferentialPanel.tsx components/clinical/trajectory/v2/TrajectoryClinicalCorePanels.test.tsx entrypoints/sidepanel/style.css
git commit -m "feat(med-assist): fold trajectory results into a dropdown with green Open hints (R2)"
```

---

### Task 2: Diagnosis page — Clinical Finding and triage dropdowns (WP2)

**Files:**
- Modify: `components/clinical/diagnosis/DiagnosisWorkspace.tsx` (ClinicalContextPanel ~210-230, TriageSummarySection ~455-473, SupportingExamSection ~475-510, layout ~178-179)
- Test: `components/clinical/diagnosis/DiagnosisWorkspace.test.tsx`, `components/clinical/ClinicalDifferential.final-page.test.tsx`

**Interfaces:**
- Produces (module-internal, exported for tests): `splitReferralGuidance(text: string): string[]`.
- `DiagnosisTriageView` is unchanged.

- [ ] **Step 1: Write the failing tests** (append to `DiagnosisWorkspace.test.tsx`; the file already has `makeProps`/`makeViewModel`)

```tsx
import { splitReferralGuidance } from './DiagnosisWorkspace';

describe('splitReferralGuidance', () => {
  it('splits numbered items and joins wrapped lines', () => {
    expect(
      splitReferralGuidance(
        '1. Bila tidak membaik maka dirujuk ke fasilitas sekunder\nyang memiliki dokter spesialis saraf.\n2. Bila depresi berat.'
      )
    ).toEqual([
      'Bila tidak membaik maka dirujuk ke fasilitas sekunder yang memiliki dokter spesialis saraf.',
      'Bila depresi berat.',
    ]);
  });

  it('treats a leading space as a lost bullet', () => {
    expect(
      splitReferralGuidance('Apabila kejang tidak membaik.\n Apabila kejang demam sering berulang.')
    ).toEqual(['Apabila kejang tidak membaik.', 'Apabila kejang demam sering berulang.']);
  });

  it('keeps a wrapped paragraph as one item', () => {
    expect(
      splitReferralGuidance('Pasien perlu dirujuk jika migren berlanjut dan tidak hilang dengan\nanalgesik.')
    ).toEqual(['Pasien perlu dirujuk jika migren berlanjut dan tidak hilang dengan analgesik.']);
  });
});

describe('DiagnosisWorkspace triage section', () => {
  const triage = {
    outcome: 'refer' as const,
    headline: 'Pertimbangkan rujukan',
    tone: 'warning' as const,
    firedCriteria: ['Kompetensi SKDI 3A'],
    referralGuidance: '1. Bila tidak membaik.\n2. Bila komplikasi.',
  };

  it('keeps the headline visible and folds advice, reasons, referral and red flags into dropdowns', () => {
    const props = makeProps({ triage });
    props.viewModel.evidence.redFlags = ['Penurunan kesadaran'];
    render(<DiagnosisWorkspace {...props} />);

    const section = screen.getByLabelText('Triase & Rujukan');
    expect(within(section).getAllByText('Pertimbangkan rujukan').length).toBeGreaterThan(0);
    const summaries = Array.from(section.querySelectorAll('details > summary')).map((s) => s.textContent);
    expect(summaries).toEqual(['Saran', 'Alasan', 'Indikasi rujukan', 'Tanda bahaya']);
    section.querySelectorAll('details').forEach((d) => expect(d).not.toHaveAttribute('open'));
    expect(within(section).getByText('Bila komplikasi.')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Pemeriksaan Penunjang')).queryByText('Tanda bahaya')
    ).toBeNull();
  });

  it('keeps red flags in Pemeriksaan Penunjang when there is no triage result', () => {
    const props = makeProps({ triage: null });
    props.viewModel.evidence.redFlags = ['Penurunan kesadaran'];
    render(<DiagnosisWorkspace {...props} />);
    expect(
      within(screen.getByLabelText('Pemeriksaan Penunjang')).getByText('Tanda bahaya')
    ).toBeInTheDocument();
  });
});
```

If `makeProps` does not accept `triage` or the view model lacks `evidence.redFlags`, adapt the
fixture keys to the real `DiagnosisWorkspaceProps` shape (read `makeViewModel` first); do not
change what is asserted.

Change the existing order test at `DiagnosisWorkspace.test.tsx:161-176`: replace `'Konteks Klinis'`
with `'Clinical Finding'` in `orderedLabels`. Same replacement in
`ClinicalDifferential.final-page.test.tsx` at the order list (~297) and every
`getByLabelText('Konteks Klinis')` (~306, ~423, ~469). Change the English-label ban regex at
~377-379 only if it matches "Clinical Finding" (it lists `Clinical Context`, which does not).

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/diagnosis/DiagnosisWorkspace.test.tsx components/clinical/ClinicalDifferential.final-page.test.tsx`
Expected: FAIL (`splitReferralGuidance` not exported; label "Clinical Finding" not found).

- [ ] **Step 3: Implement**

In `ClinicalContextPanel`: `aria-label="Clinical Finding"` and `<SectionHeader title="Clinical Finding" />`.

Add and export:

```ts
const REFERRAL_ITEM_START = /^(\s+\S|\s*\d+[.)]\s|\s*[-•·]\s)/;

export function splitReferralGuidance(text: string): string[] {
  const items: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const cleaned = line.replace(/^\s*(\d+[.)]|[-•·])\s*/, '').trim();
    if (index === 0 || REFERRAL_ITEM_START.test(line) || items.length === 0) {
      items.push(cleaned);
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${cleaned}`;
    }
  });
  return items;
}
```

`TriageSummarySection` takes `safetyItems: string[]` and renders:

```tsx
    <section className="form-group diagnosis-block" aria-label="Triase & Rujukan">
      <SectionHeader title="Triase & Rujukan" status={triage.headline} />
      <details className="diagnosis-details diagnosis-details--inline">
        <summary>Saran</summary>
        <ReadOnlyPanel tone={triage.tone}>
          <strong>{triage.headline}</strong>
        </ReadOnlyPanel>
      </details>
      {triage.firedCriteria.length > 0 ? (
        <details className="diagnosis-details diagnosis-details--inline">
          <summary>Alasan</summary>
          <LineList title="Dasar keputusan" items={triage.firedCriteria} tone={listTone} />
        </details>
      ) : null}
      {triage.referralGuidance ? (
        <details className="diagnosis-details diagnosis-details--inline">
          <summary>Indikasi rujukan</summary>
          <LineList title="Indikasi rujukan" items={splitReferralGuidance(triage.referralGuidance)} />
        </details>
      ) : null}
      {safetyItems.length > 0 ? (
        <details className="diagnosis-details diagnosis-details--inline">
          <summary>Tanda bahaya</summary>
          <LineList title="Tanda bahaya" items={safetyItems} tone="danger" />
        </details>
      ) : null}
    </section>
```

In the layout compute `const safetyItems = getVisibleSafetyItems(viewModel.evidence.redFlags, viewModel.evidence.doNotMiss);`
once, pass it to `TriageSummarySection`, and pass `showSafetyItems={!triage}` to
`SupportingExamSection`, which renders its "Tanda bahaya" `LineList` only when `showSafetyItems`
is true. Do not change `EducationSection`.

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command, then `node scripts/pnpm.mjs exec vitest run components/clinical`.
Expected: PASS.

- [ ] **Step 5: Commit** (message names the replaced assertions: the order lists and `getByLabelText('Konteks Klinis')` calls)

```bash
git add components/clinical/diagnosis/DiagnosisWorkspace.tsx components/clinical/diagnosis/DiagnosisWorkspace.test.tsx components/clinical/ClinicalDifferential.final-page.test.tsx
git commit -m "feat(med-assist): show Clinical Finding first and fold triage details into dropdowns (R2)"
```

---

### Task 3: Pregnancy header no longer overlaps (WP3, protected, approved)

**Files:**
- Modify: `components/clinical/TTVInferenceUI.tsx:3161` (the Status Kehamilan `form-group-header` div only)
- Modify: `entrypoints/sidepanel/style.css` (append)
- Test: `components/clinical/TTVInferenceUI.forward-doctor.test.tsx` (append one test near 120-145)

- [ ] **Step 1: Write the failing test**

```tsx
  it('lets the pregnancy risk indicator wrap below the label instead of overlapping it', () => {
    // Render exactly as the existing pregnancy-context-note test does (female patient with
    // extracted pregnancy risk), then:
    const label = screen.getByText('Status Kehamilan');
    const header = label.closest('.form-group-header');
    expect(header).toHaveClass('form-group-header--wrap');
    expect(within(header as HTMLElement).getByText('risiko terdeteksi')).toBeInTheDocument();

    const css = fs.readFileSync(path.resolve(__dirname, '../../entrypoints/sidepanel/style.css'), 'utf8');
    expect(css).toMatch(/\.form-group-header--wrap\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.form-group-header--wrap\s+\.field-extracted-indicator[^{]*\{[^}]*flex-shrink:\s*0/);
  });
```

Copy the render setup verbatim from the existing test that asserts the pregnancy context note
(~120-145); import `fs`/`path` from `node:fs`/`node:path` if the file does not already.

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/pnpm.mjs exec vitest run components/clinical/TTVInferenceUI.forward-doctor.test.tsx`
Expected: FAIL (class `form-group-header--wrap` missing).

- [ ] **Step 3: Implement**

`TTVInferenceUI.tsx`, the header of the Status Kehamilan group only:
`<div className="form-group-header form-group-header--wrap">`.

Append to `style.css`:

```css
/* ── Status Kehamilan header: indicator wraps instead of overlapping (2026-09-27) ── */
.form-group-header--wrap {
  flex-wrap: wrap;
  row-gap: 2px;
}

.form-group-header--wrap .field-extracted-indicator,
.form-group-header--wrap .field-placeholder-hint {
  flex-shrink: 0;
  white-space: nowrap;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command and `node scripts/pnpm.mjs exec vitest run entrypoints/sidepanel/ui-authority.smoke.test.tsx`.
Expected: PASS.

- [ ] **Step 5: Token check and commit** (run the token-guard agent over the task's diff first)

```bash
git add components/clinical/TTVInferenceUI.tsx components/clinical/TTVInferenceUI.forward-doctor.test.tsx entrypoints/sidepanel/style.css
git commit -m "fix(med-assist): stop the pregnancy risk note from overlapping its label (R2, Chief approved)"
```

---

### Task 4: Emergency verdict card headings and blocks (WP4, protected, approved)

**Files:**
- Modify: `entrypoints/sidepanel/main.tsx:1163-1248` (`EmergencyDashboard` verdict card only)
- Modify: `entrypoints/sidepanel/style.css` (append)
- Modify: `docs/specs/2026-07-07-emergency-verdict-card-design.md` (section names)
- Test: `entrypoints/sidepanel/main.emergency-dashboard.test.tsx`

**Interfaces:**
- Produces: verdict card DOM: `.emg-verdict__header` (zone + title), then one `section.emg-verdict__section` per shown block, each starting with `h4.emg-verdict__label.emg-verdict__heading`.

- [ ] **Step 1: Update the tests first**

In `main.emergency-dashboard.test.tsx`, replace every English section label expected by the
existing tests with the Indonesian heading and add one structure test:

| Old text | New text |
| --- | --- |
| Why this matters | Mengapa penting |
| Do now | Lakukan sekarang |
| Do not do | Jangan lakukan |
| Refer trigger | Pemicu rujukan |
| Reassessment timer | Evaluasi ulang |
| Evidence gate | Dasar bukti |

```tsx
  it('renders each verdict section as its own block with an Indonesian heading', () => {
    // Build the same critical verdict the "renders all 7 sections" test builds.
    const { container } = render(<EmergencyDashboard alerts={[baseAlert]} verdict={criticalVerdict} />);
    const header = container.querySelector('.emg-verdict__header');
    expect(header?.textContent).toContain('MERAH');
    expect(header?.textContent).toContain('Syok Hipovolemik');
    const headings = Array.from(container.querySelectorAll('.emg-verdict__section > h4.emg-verdict__heading')).map((h) => h.textContent);
    expect(headings[0]).toBe('Mengapa penting');
    expect(headings).toContain('Lakukan sekarang');
    expect(headings).toContain('Evaluasi ulang');
  });
```

Use the verdict object the existing "renders all 7 sections" test already defines (name it
`criticalVerdict` or reuse its variable name).

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run entrypoints/sidepanel/main.emergency-dashboard.test.tsx`
Expected: FAIL (old English labels rendered; no `.emg-verdict__header`).

- [ ] **Step 3: Implement**

In `EmergencyDashboard`: wrap zone and title in `<div className="emg-verdict__header">…</div>`
(title only when `headlineAlert` exists). For each of the six blocks keep its existing class and
add `emg-verdict__section`, change the element to `<section>`, and replace
`<span className="emg-verdict__label">X</span>` with
`<h4 className="emg-verdict__label emg-verdict__heading">Y</h4>` using the table above. Do not
change which blocks render or their content.

Append to `style.css`:

```css
/* ── Emergency verdict card: header and section blocks (2026-09-27) ── */
.emg-verdict__header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.emg-verdict__section {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.emg-verdict__section:last-child {
  border-bottom: none;
}

.emg-verdict__heading {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
```

Update the section names in `docs/specs/2026-07-07-emergency-verdict-card-design.md` to the new
headings, with one line noting the 2026-09-27 change.

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command and `node scripts/pnpm.mjs exec vitest run entrypoints/sidepanel`.
Expected: PASS.

- [ ] **Step 5: Token check and commit** (run the token-guard agent over the task's diff first;
  the message names the six replaced label assertions)

```bash
git add entrypoints/sidepanel/main.tsx entrypoints/sidepanel/main.emergency-dashboard.test.tsx entrypoints/sidepanel/style.css docs/specs/2026-07-07-emergency-verdict-card-design.md
git commit -m "feat(med-assist): give the emergency card Indonesian headings and one block per section (R2, Chief approved)"
```

---

### Task 5: medboard doctor contacts endpoint (WP5, server side)

Work in `D:\DEV\monorepo\projects\healthcare\medboard` (its own capsule; read its `AGENTS.md`).

**Files:**
- Create: `src/lib/server/doctor-contacts.ts`
- Create: `src/lib/server/doctor-contacts.test.ts`
- Create: `src/app/api/doctors/contacts/route.ts`
- Modify: `scripts/test-suite.ts` (add the new test file to its list)

**Interfaces:**
- Produces: `GET /api/doctors/contacts` → `{ ok: true, doctors: Array<{ id: string; name: string; whatsappNumber: string }> }`; 401 `{ ok: false, error: 'Unauthorized' }` when not crew-authorised.
- `toWhatsappDigits(value: string): string`, `buildDoctorContacts(users, profiles): DoctorContact[]`.

- [ ] **Step 1: Write the failing test** (`doctor-contacts.test.ts`, `node:test` style like the existing route tests)

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDoctorContacts, toWhatsappDigits } from './doctor-contacts'

test('toWhatsappDigits keeps digits and turns a leading 0 into 62', () => {
  assert.equal(toWhatsappDigits('0800-0000-0001'), '6280000000001')
  assert.equal(toWhatsappDigits('+62 800 0000 0002'), '6280000000002')
  assert.equal(toWhatsappDigits('  '), '')
})

test('buildDoctorContacts lists active doctors with a number, sorted by username', () => {
  const users = [
    { username: 'b', displayName: 'dr. Budi', profession: 'Dokter', status: 'ACTIVE' },
    { username: 'a', displayName: 'drg. Ani', profession: 'Dokter Gigi', status: 'ACTIVE' },
    { username: 'c', displayName: 'Citra', profession: 'Perawat', status: 'ACTIVE' },
    { username: 'd', displayName: 'dr. Dodi', profession: 'Dokter', status: 'INACTIVE' },
    { username: 'e', displayName: 'dr. Eko', profession: 'Dokter', status: 'ACTIVE' },
  ]
  const profiles = new Map([
    ['a', { whatsappNumber: '0800-0000-0001' }],
    ['b', { whatsappNumber: '6280000000002' }],
    ['c', { whatsappNumber: '0800-0000-0003' }],
    ['d', { whatsappNumber: '0800-0000-0004' }],
    ['e', { whatsappNumber: '' }],
  ])
  assert.deepEqual(buildDoctorContacts(users, profiles), [
    { id: 'a', name: 'drg. Ani', whatsappNumber: '6280000000001' },
    { id: 'b', name: 'dr. Budi', whatsappNumber: '6280000000002' },
  ])
})
```

(Sorted by `id` = username, so the order does not depend on locale collation.)

- [ ] **Step 2: Run to verify it fails**

Run (in medboard): `node --import tsx --test src/lib/server/doctor-contacts.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/lib/server/doctor-contacts.ts`:

```ts
import { isDoctorProfession } from '@/lib/crew-access'

export interface DoctorContact {
  id: string
  name: string
  whatsappNumber: string
}

export function toWhatsappDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

export function buildDoctorContacts(
  users: Array<{ username: string; displayName: string; profession: string; status?: string }>,
  profiles: Map<string, { whatsappNumber?: string }>
): DoctorContact[] {
  return users
    .filter(user => user.status === 'ACTIVE' && isDoctorProfession(user.profession))
    .map(user => ({
      id: user.username,
      name: user.displayName,
      whatsappNumber: toWhatsappDigits(profiles.get(user.username)?.whatsappNumber ?? ''),
    }))
    .filter(contact => contact.whatsappNumber.length > 0)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
```

If `@/` aliases do not resolve under `node --import tsx --test`, use a relative import
(`../crew-access`) as neighbouring server modules do.

`src/app/api/doctors/contacts/route.ts` (mirror `../online/route.ts`):

```ts
// GET /api/doctors/contacts — active doctors with a WhatsApp number, for Assist's "Send to Doctors".
import { buildDoctorContacts } from '@/lib/server/doctor-contacts'
import { handleCorsPreflight, jsonWithCors } from '@/lib/server/api-cors'
import { isCrewAuthorizedRequest, listCrewAccessUsersAll } from '@/lib/server/crew-access-auth'
import { listAllCrewProfiles } from '@/lib/server/crew-access-profile'

export const runtime = 'nodejs'

const CORS_METHODS = ['GET', 'OPTIONS'] as const

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, CORS_METHODS)
}

export async function GET(request: Request) {
  if (!isCrewAuthorizedRequest(request)) {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const doctors = buildDoctorContacts(await listCrewAccessUsersAll(), listAllCrewProfiles())
    return jsonWithCors(request, CORS_METHODS, { ok: true, doctors })
  } catch {
    return jsonWithCors(request, CORS_METHODS, { ok: false, error: 'Server error' }, { status: 500 })
  }
}
```

Add `'src/lib/server/doctor-contacts.test.ts',` to the file list in `scripts/test-suite.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run (in medboard): the Step 2 command, then `pnpm run lint` (medboard's `lint` is `tsc --noEmit`).
Expected: PASS, exit 0. If medboard dependencies are not installed, report it instead of installing.

- [ ] **Step 5: Handoff and commit**

Overwrite medboard's `.agents/HANDOFF.md` (read it first; keep its format): new route
`GET /api/doctors/contacts` (crew auth, CORS), its test in the suite, deployment is Chief's, and
crew profiles need a WhatsApp number filled for a doctor to appear.

```bash
git add src/lib/server/doctor-contacts.ts src/lib/server/doctor-contacts.test.ts src/app/api/doctors/contacts/route.ts scripts/test-suite.ts .agents/HANDOFF.md
git commit -m "feat(medboard): list active doctors with a WhatsApp number for Assist (R2)"
```

---

### Task 6: Assist "Send to Doctors" button (WP5, client side)

**Files:**
- Modify: `lib/api/bridge-client.ts` (add after `getOnlineDoctors`, ~1133)
- Create: `lib/consult/whatsapp-link.ts`, `lib/consult/whatsapp-link.test.ts`
- Create: `entrypoints/sidepanel/components/SendToDoctorsButton.tsx`, `entrypoints/sidepanel/components/SendToDoctorsButton.test.tsx`
- Modify: `entrypoints/sidepanel/main.tsx` (render the button inside the verdict card for merah/kuning)
- Modify: `entrypoints/sidepanel/style.css` (append)
- Modify: `project.contract.json` (crew portal entry name)

**Interfaces:**
- Consumes: `GET /api/doctors/contacts` (Task 5).
- Produces: `getDoctorContacts(): Promise<DoctorContact[]>` with `export interface DoctorContact { id: string; name: string; whatsappNumber: string }` in `bridge-client.ts`; `buildDoctorAlertLink(whatsappNumber: string, zone: 'merah' | 'kuning'): string` in `whatsapp-link.ts`; `SendToDoctorsButton({ zone, openUrl? }: { zone: 'merah' | 'kuning'; openUrl?: (url: string) => void })`.

- [ ] **Step 1: Write the failing tests**

`lib/consult/whatsapp-link.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildDoctorAlertLink } from './whatsapp-link';

describe('buildDoctorAlertLink', () => {
  it('builds a wa.me link carrying only the triage zone', () => {
    const url = buildDoctorAlertLink('6280000000001', 'kuning');
    expect(url).toBe(
      'https://wa.me/6280000000001?text=' +
        encodeURIComponent('Sentra Assist: konsul triase KUNING. Mohon cek Sentra Assist.')
    );
  });

  it('keeps digits only', () => {
    expect(buildDoctorAlertLink('+62 800-0000-0001', 'merah')).toMatch(/^https:\/\/wa\.me\/6280000000001\?text=/);
  });
});
```

`entrypoints/sidepanel/components/SendToDoctorsButton.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const getDoctorContacts = vi.fn();
vi.mock('@/lib/api/bridge-client', () => ({ getDoctorContacts: () => getDoctorContacts() }));
vi.mock('wxt/browser', () => ({ browser: { tabs: { create: vi.fn() } } }));

import { SendToDoctorsButton } from './SendToDoctorsButton';

describe('SendToDoctorsButton', () => {
  it('lists registered doctors and opens WhatsApp for the chosen one', async () => {
    getDoctorContacts.mockResolvedValueOnce([
      { id: 'b', name: 'dr. Budi', whatsappNumber: '6280000000002' },
    ]);
    const openUrl = vi.fn();
    render(<SendToDoctorsButton zone="kuning" openUrl={openUrl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Doctors' }));
    fireEvent.click(await screen.findByRole('button', { name: 'dr. Budi' }));
    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/6280000000002\?text=/));
  });

  it('shows a message and opens nothing when no doctor has a number', async () => {
    getDoctorContacts.mockResolvedValueOnce([]);
    const openUrl = vi.fn();
    render(<SendToDoctorsButton zone="merah" openUrl={openUrl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Doctors' }));
    expect(await screen.findByText('Belum ada nomor WhatsApp dokter di crew portal')).toBeInTheDocument();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('shows the error text when the crew API refuses', async () => {
    getDoctorContacts.mockRejectedValueOnce(new Error('Unauthorized'));
    const openUrl = vi.fn();
    render(<SendToDoctorsButton zone="merah" openUrl={openUrl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Doctors' }));
    expect(await screen.findByText('Unauthorized')).toBeInTheDocument();
    expect(openUrl).not.toHaveBeenCalled();
  });
});
```

Add to `main.emergency-dashboard.test.tsx` (mock the new component at the top next to the other
mocks: `vi.mock('./components/SendToDoctorsButton', () => ({ SendToDoctorsButton: ({ zone }: { zone: string }) => <button>Send to Doctors {zone}</button> }))`):

```tsx
  it('offers Send to Doctors only while triage is lit (merah or kuning)', () => {
    const { rerender } = render(<EmergencyDashboard alerts={[baseAlert]} verdict={criticalVerdict} />);
    expect(screen.getByText('Send to Doctors merah')).toBeInTheDocument();
    rerender(<EmergencyDashboard alerts={[]} verdict={standbyVerdict} />);
    expect(screen.queryByText(/Send to Doctors/)).toBeNull();
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/consult/whatsapp-link.test.ts entrypoints/sidepanel/components/SendToDoctorsButton.test.tsx entrypoints/sidepanel/main.emergency-dashboard.test.tsx`
Expected: FAIL (modules not found; button not rendered).

- [ ] **Step 3: Implement**

`lib/consult/whatsapp-link.ts`:

```ts
const ZONE_WORD: Record<'merah' | 'kuning', string> = { merah: 'MERAH', kuning: 'KUNING' };

/** A wa.me link whose message names only the triage zone: no patient data leaves Assist. */
export function buildDoctorAlertLink(whatsappNumber: string, zone: 'merah' | 'kuning'): string {
  const digits = whatsappNumber.replace(/\D/g, '');
  const text = `Sentra Assist: konsul triase ${ZONE_WORD[zone]}. Mohon cek Sentra Assist.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
```

`bridge-client.ts`:

```ts
export interface DoctorContact {
  id: string;
  name: string;
  whatsappNumber: string;
}

interface DoctorContactsResponse {
  ok: boolean;
  doctors: DoctorContact[];
  error?: string;
}

/** Active doctors with a WhatsApp number from the crew portal; numbers are kept in memory only. */
export async function getDoctorContacts(): Promise<DoctorContact[]> {
  const authSource = await getBridgeAuthSource();
  if (authSource === 'none') {
    throw new AuthRequiredError(BRIDGE_TOKEN_REQUIRED_MESSAGE);
  }
  const res = await bridgeFetch<DoctorContactsResponse>('/api/doctors/contacts');
  if (!res.ok) {
    throw new Error(res.error || 'Gagal memuat kontak dokter dari server.');
  }
  return res.doctors;
}
```

`SendToDoctorsButton.tsx`:

```tsx
import { useState } from 'react';
import { browser } from 'wxt/browser';

import { getDoctorContacts, type DoctorContact } from '@/lib/api/bridge-client';
import { buildDoctorAlertLink } from '@/lib/consult/whatsapp-link';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; doctors: DoctorContact[] }
  | { kind: 'error'; message: string };

function openInNewTab(url: string): void {
  void browser.tabs.create({ url });
}

export function SendToDoctorsButton({
  zone,
  openUrl = openInNewTab,
}: {
  zone: 'merah' | 'kuning';
  openUrl?: (url: string) => void;
}) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  const load = async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', doctors: await getDoctorContacts() });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="emg-send-doctors">
      <button type="button" className="emg-send-doctors__trigger" onClick={() => void load()} disabled={state.kind === 'loading'}>
        Send to Doctors
      </button>
      {state.kind === 'ready' && state.doctors.length === 0 ? (
        <p className="emg-send-doctors__note">Belum ada nomor WhatsApp dokter di crew portal</p>
      ) : null}
      {state.kind === 'ready' && state.doctors.length > 0 ? (
        <ul className="emg-send-doctors__list">
          {state.doctors.map((doctor) => (
            <li key={doctor.id}>
              <button type="button" onClick={() => openUrl(buildDoctorAlertLink(doctor.whatsappNumber, zone))}>
                {doctor.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {state.kind === 'error' ? <p className="emg-send-doctors__note">{state.message}</p> : null}
    </div>
  );
}
```

In `main.tsx` `EmergencyDashboard`, after the last verdict section and still inside the
`verdict.headlineAlert` branch, render
`{verdict.zone === 'merah' || verdict.zone === 'kuning' ? <SendToDoctorsButton zone={verdict.zone} /> : null}`
and import it from `./components/SendToDoctorsButton`.

Append to `style.css`:

```css
/* ── Send to Doctors (WhatsApp) inside the emergency card (2026-09-27) ── */
.emg-send-doctors {
  padding-top: 8px;
}

.emg-send-doctors__trigger,
.emg-send-doctors__list button {
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-main);
  background: var(--neu-inset-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-chip);
  padding: 4px 10px;
  cursor: pointer;
}

.emg-send-doctors__list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.emg-send-doctors__note {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--text-muted);
}
```

`project.contract.json`: change the crew portal entry's name to
`"Sentra crew portal for passkey sign-in and doctor contacts (Send to Doctors)"`.

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command and `node scripts/pnpm.mjs exec vitest run lib/api entrypoints/sidepanel`.
Expected: PASS.

- [ ] **Step 5: Token check and commit** (run the token-guard agent over the task's diff first)

```bash
git add lib/api/bridge-client.ts lib/consult/whatsapp-link.ts lib/consult/whatsapp-link.test.ts entrypoints/sidepanel/components/SendToDoctorsButton.tsx entrypoints/sidepanel/components/SendToDoctorsButton.test.tsx entrypoints/sidepanel/main.tsx entrypoints/sidepanel/main.emergency-dashboard.test.tsx entrypoints/sidepanel/style.css project.contract.json
git commit -m "feat(med-assist): send a patient-free triage alert to a registered doctor on WhatsApp (R2, Chief approved)"
```

---

### Task 7: Exact-match selection for practitioner autocomplete (WP6, part 1)

**Files:**
- Create: `lib/filler/staff-match.ts`, `lib/filler/staff-match.test.ts`
- Modify: `lib/filler/filler-core.ts` (`AutocompleteOptions` ~44-52, `fillAutocomplete` ~536-705)
- Modify: `lib/filler/main-world-bridge.ts:25-30` (`MainWorldFieldMapping`)
- Modify: `entrypoints/inject.content.ts:357-363` (field type) and `:440-525` (autocomplete branch)
- Test: `lib/filler/filler-core.test.ts`

**Interfaces:**
- Produces: `normalizeStaffName(value: string): string`; `staffSearchTerm(value: string): string` (what is typed into the ePuskesmas search: leading titles and anything after the first comma removed, original case kept); `pickExactStaffMatch(itemTexts: string[], name: string): number` (index of the single match, else `-1`); `AutocompleteOptions.requireExactMatch?: boolean`; `MainWorldFieldMapping.requireExactMatch?: boolean`.
- Why the search term: ePuskesmas searches staff server-side with the typed text. Typing a full
  crew display name with titles and degrees ("dr. Budi Santoso, Sp.PD") returns no items, so the
  exact-match step would never see candidates. Type the core name, then match the returned items
  against the full name.

- [ ] **Step 1: Write the failing tests** (`lib/filler/staff-match.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { normalizeStaffName, pickExactStaffMatch, staffSearchTerm } from './staff-match';

describe('staffSearchTerm', () => {
  it('types the core name without titles or degrees, keeping case', () => {
    expect(staffSearchTerm('dr. Budi Santoso, Sp.PD')).toBe('Budi Santoso');
    expect(staffSearchTerm('JOSEP ARIANTO, A.Md')).toBe('JOSEP ARIANTO');
    expect(staffSearchTerm('Ns.  Dian   Sunardi')).toBe('Dian Sunardi');
    expect(staffSearchTerm('dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC')).toBe('Ferdi Iskandar');
  });
});

describe('normalizeStaffName', () => {
  it('drops titles, degrees after a comma, case and punctuation', () => {
    expect(normalizeStaffName('dr. Budi Santoso, Sp.PD')).toBe('budi santoso');
    expect(normalizeStaffName('Ns. DIAN SUNARDI, S.Kep')).toBe('dian sunardi');
    expect(normalizeStaffName('  drg.  Ani   Lestari ')).toBe('ani lestari');
  });
});

describe('pickExactStaffMatch', () => {
  it('selects the one menu item that carries the name', () => {
    expect(pickExactStaffMatch(['BUDI SANTOSO - Dokter Umum', 'DIAN SUNARDI'], 'dr. Budi Santoso, Sp.PD')).toBe(0);
  });

  it('accepts a menu item that is the name without trailing degrees', () => {
    expect(pickExactStaffMatch(['Dian Sunardi'], 'Dian Sunardi S Kep')).toBe(0);
  });

  it('selects nothing when no item or several items match', () => {
    expect(pickExactStaffMatch(['EKO PRASETYO'], 'Dian Sunardi')).toBe(-1);
    expect(pickExactStaffMatch(['DIAN SUNARDI', 'DIAN SUNARDI (Bidan)'], 'Dian Sunardi')).toBe(-1);
    expect(pickExactStaffMatch(['DIAN'], 'Dian Sunardi')).toBe(-1);
    expect(pickExactStaffMatch(['DIAN SUNARDI'], '')).toBe(-1);
  });
});
```

Append to `lib/filler/filler-core.test.ts`, following that file's existing DOM setup style:

```ts
  it('with requireExactMatch, clears the field and fails instead of taking the first item', async () => {
    document.body.innerHTML = `
      <input id="dokter" />
      <ul class="ui-autocomplete" style="display:block"><li class="ui-menu-item">EKO PRASETYO</li></ul>`;
    const result = await fillAutocomplete('#dokter', 'Dian Sunardi', {
      requireExactMatch: true,
      timeout: 200,
      retries: 0,
      typeDelay: 0,
      dropdownSelector: '.ui-autocomplete .ui-menu-item',
    });
    expect(result.success).toBe(false);
    expect((document.getElementById('dokter') as HTMLInputElement).value).toBe('');
  });
```

If `waitForDropdown` needs the menu to appear after typing, adjust only the fixture timing the way
the existing tests in that file do; keep both assertions.

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/filler/staff-match.test.ts lib/filler/filler-core.test.ts`
Expected: FAIL (module not found; field keeps a value).

- [ ] **Step 3: Implement**

`lib/filler/staff-match.ts`:

```ts
const LEADING_TITLE = /^(dr|drg|ns|bd|apt|prof|ir|hj|h)\.?\s+/;

/** Lower-case practitioner name without leading titles, degrees after a comma, or punctuation. */
export function normalizeStaffName(value: string): string {
  let name = value.toLowerCase().split(',')[0] ?? '';
  name = name.replace(/[^a-z\s.]/g, ' ').replace(/\s+/g, ' ').trim();
  while (LEADING_TITLE.test(name)) name = name.replace(LEADING_TITLE, '');
  return name.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
}

const LEADING_TITLE_ANY_CASE = /^(dr|drg|ns|bd|apt|prof|ir|hj|h)\.?\s+/i;

/** Text typed into the ePuskesmas staff search: the core name, case kept. */
export function staffSearchTerm(value: string): string {
  let term = (value.split(',')[0] ?? '').replace(/\s+/g, ' ').trim();
  while (LEADING_TITLE_ANY_CASE.test(term)) term = term.replace(LEADING_TITLE_ANY_CASE, '');
  return term;
}

function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Index of the single menu item that names this practitioner, or -1. An item matches when it
 * contains the whole name, or when the name (with trailing degrees) contains the whole item of at
 * least two words. Zero or several matches return -1 so no wrong clinician is selected.
 */
export function pickExactStaffMatch(itemTexts: string[], name: string): number {
  const target = normalizeStaffName(name);
  if (!target) return -1;
  const matches = itemTexts
    .map((text, index) => ({ index, item: normalizeStaffName(text.replace(/\s[-–(].*$/, '')) }))
    .filter(({ item }) =>
      item.length > 0 &&
      (containsWords(item, target) || (item.split(' ').length >= 2 && containsWords(target, item)))
    );
  return matches.length === 1 ? matches[0].index : -1;
}
```

(`text.replace(/\s[-–(].*$/, '')` drops menu suffixes such as " - Dokter Umum" or " (Bidan)"
before comparing; with that, `'DIAN SUNARDI (Bidan)'` also normalises to `dian sunardi`, so the
"several items" test returns -1 as intended.)

`filler-core.ts`: add `requireExactMatch?: boolean;` to `AutocompleteOptions`; in
`fillAutocomplete` destructure `requireExactMatch = false`. When it is true:
- treat `allowFirstItemFallback` as false and `requireDropdownSelection` as true;
- type `staffSearchTerm(safeValue)` instead of `safeValue` into the input;
- choose the item with `pickExactStaffMatch(Array.from(items).map((i) => i.textContent ?? ''), safeValue)`
  instead of the `includes` loop;
- before every `return { success: false, ... }` in this mode, set `input.value = ''` and
  `await dispatchEventChain(input, ['input', 'change', 'blur'])`, and use the error text
  `'Nama tenaga medis tidak cocok persis di ePuskesmas'` when no item matched.

`main-world-bridge.ts`: add `requireExactMatch?: boolean;` to `MainWorldFieldMapping`, and make
sure the field objects it forwards keep that property.

`inject.content.ts`: add `requireExactMatch?: boolean;` to the `fillFieldJQ` field type; import
`pickExactStaffMatch` and `staffSearchTerm` from `@/lib/filler/staff-match`. When
`field.requireExactMatch` is true, the value put in the input and passed to
`$el.autocomplete('search', ...)` is `staffSearchTerm(field.value)`. In `checkDropdown`, when
`field.requireExactMatch` is true, compute
`const index = pickExactStaffMatch($menu.toArray().map((el: HTMLElement) => $(el).text() || ''), field.value);`
and click only when `index >= 0` (`$best = $menu.eq(index)`); otherwise keep polling. In the
timeout branch, when `field.requireExactMatch` is true, run `$el.val('').trigger('change').trigger('blur')`
and resolve `{ success: false, selectedValue: '' }`; the returned error for this case is
`'Nama tenaga medis tidak cocok persis di ePuskesmas'`. Fields without the flag behave exactly as
before.

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command and `node scripts/pnpm.mjs exec vitest run lib/filler tests/runtime`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/filler/staff-match.ts lib/filler/staff-match.test.ts lib/filler/filler-core.ts lib/filler/filler-core.test.ts lib/filler/main-world-bridge.ts entrypoints/inject.content.ts
git commit -m "feat(med-assist): select a practitioner in ePuskesmas only on an exact name match (R2)"
```

---

### Task 8: Practitioner names from the signed-in Assist user (WP6, part 2, R3 approved)

**Files:**
- Modify: `lib/clinical/tenaga-medis.ts` (R3; keep both constants)
- Create: `lib/clinical/tenaga-medis.test.ts`
- Create: `lib/rme/assist-staff.ts`, `lib/rme/assist-staff.test.ts`
- Modify: `utils/types.ts:~148` (diagnosa payload gets optional `tenaga_medis`), and the diagnosa payload type used by `buildDiagnosaPayload` if it is a different interface
- Modify: `entrypoints/background.ts:~605` (apply the session staff after `hydrateTenagaMedisPayload`)
- Modify: `lib/handlers/page-diagnosa.ts:716-784`, `lib/handlers/page-anamnesa.ts:1523-1536`, `lib/handlers/page-resep.ts:1088-1101`
- Modify: `.agents/DECISIONS.md` (append)

**Interfaces:**
- Consumes: `requireExactMatch` from Task 7.
- Produces: `resolveStaffField(profession: string | undefined): 'dokter' | 'perawat' | null`;
  `resolveTenagaMedisNames(staff: AssistStaff | null): { dokter_nama: string; perawat_nama: string }`
  with `export interface AssistStaff { name: string; profession: string }` (both in `tenaga-medis.ts`);
  `withStaffNames<T extends { tenaga_medis?: TenagaMedisNames }>(payload: T, staff: AssistStaff | null): T`
  (anamnesa and diagnosa) and
  `withResepStaff<T extends { ajax: { dokter: string; perawat: string } }>(payload: T, staff: AssistStaff | null): T`
  (resep) in `lib/rme/assist-staff.ts`, with
  `export interface TenagaMedisNames { dokter_nama: string; perawat_nama: string }` in `tenaga-medis.ts`;
  `assistStaffFromSession(session: AuthSession | null): AssistStaff | null` in `lib/rme/assist-staff.ts`.

- [ ] **Step 1: Write the failing tests**

`lib/clinical/tenaga-medis.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { DOKTER_NAMA, PERAWAT_NAMA, resolveStaffField, resolveTenagaMedisNames } from './tenaga-medis';

describe('resolveStaffField', () => {
  it('maps crew professions to the RME field', () => {
    expect(resolveStaffField('Dokter')).toBe('dokter');
    expect(resolveStaffField('Dokter Gigi')).toBe('dokter');
    expect(resolveStaffField('Perawat')).toBe('perawat');
    expect(resolveStaffField('Bidan')).toBe('perawat');
    expect(resolveStaffField('Apoteker')).toBe('perawat');
    expect(resolveStaffField('Triage Officer')).toBe('perawat');
  });

  it('returns null for unknown or empty professions', () => {
    expect(resolveStaffField('Umum')).toBeNull();
    expect(resolveStaffField('')).toBeNull();
    expect(resolveStaffField(undefined)).toBeNull();
  });
});

describe('resolveTenagaMedisNames', () => {
  it('puts a doctor in the doctor field and keeps the nurse constant', () => {
    expect(resolveTenagaMedisNames({ name: 'dr. Budi', profession: 'Dokter' })).toEqual({
      dokter_nama: 'dr. Budi',
      perawat_nama: PERAWAT_NAMA,
    });
  });

  it('puts a nakes in the nurse field and keeps the doctor constant', () => {
    expect(resolveTenagaMedisNames({ name: 'Dian', profession: 'Bidan' })).toEqual({
      dokter_nama: DOKTER_NAMA,
      perawat_nama: 'Dian',
    });
  });

  it('keeps both constants without a usable user', () => {
    const constants = { dokter_nama: DOKTER_NAMA, perawat_nama: PERAWAT_NAMA };
    expect(resolveTenagaMedisNames(null)).toEqual(constants);
    expect(resolveTenagaMedisNames({ name: 'Eko', profession: 'Umum' })).toEqual(constants);
    expect(resolveTenagaMedisNames({ name: '  ', profession: 'Dokter' })).toEqual(constants);
  });
});
```

`lib/rme/assist-staff.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { AuthSession } from '@/lib/api/auth-store';
import { DOKTER_NAMA, PERAWAT_NAMA } from '@/lib/clinical/tenaga-medis';
import { assistStaffFromSession, withResepStaff, withStaffNames } from './assist-staff';

const crewSession = (profession: string, id = 'budi'): AuthSession => ({
  user: { id, username: id, name: 'dr. Budi', role: 'doctor', facilityId: 'F', facilityName: 'F', poli: profession },
  tokens: { accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: 0 },
  serverBaseUrl: 'http://127.0.0.1',
});

describe('assistStaffFromSession', () => {
  it('reads name and crew profession', () => {
    expect(assistStaffFromSession(crewSession('Dokter'))).toEqual({ name: 'dr. Budi', profession: 'Dokter' });
  });

  it('ignores local accounts and missing sessions', () => {
    expect(assistStaffFromSession(crewSession('Dokter', 'local:sentraone'))).toBeNull();
    expect(assistStaffFromSession(null)).toBeNull();
  });
});

describe('withStaffNames / withResepStaff', () => {
  const doctor = { name: 'dr. Budi', profession: 'Dokter' };

  it('overrides anamnesa tenaga_medis', () => {
    const out = withStaffNames({ tenaga_medis: { dokter_nama: DOKTER_NAMA, perawat_nama: PERAWAT_NAMA } }, doctor);
    expect(out.tenaga_medis).toEqual({ dokter_nama: 'dr. Budi', perawat_nama: PERAWAT_NAMA });
  });

  it('adds tenaga_medis to a diagnosa payload that has none', () => {
    const payload: { icd_x: string; tenaga_medis?: { dokter_nama: string; perawat_nama: string } } = { icd_x: 'J18.9' };
    expect(withStaffNames(payload, doctor)).toEqual({
      icd_x: 'J18.9',
      tenaga_medis: { dokter_nama: 'dr. Budi', perawat_nama: PERAWAT_NAMA },
    });
  });

  it('overrides resep ajax dokter/perawat', () => {
    const out = withResepStaff({ ajax: { ruangan: '', dokter: DOKTER_NAMA, perawat: PERAWAT_NAMA } }, doctor);
    expect(out.ajax).toEqual({ ruangan: '', dokter: 'dr. Budi', perawat: PERAWAT_NAMA });
  });

  it('returns the payload untouched without staff', () => {
    const payload = { ajax: { ruangan: '', dokter: DOKTER_NAMA, perawat: PERAWAT_NAMA } };
    expect(withResepStaff(payload, null)).toBe(payload);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node scripts/pnpm.mjs exec vitest run lib/clinical/tenaga-medis.test.ts lib/rme/assist-staff.test.ts`
Expected: FAIL (exports missing).

- [ ] **Step 3: Implement**

`lib/clinical/tenaga-medis.ts` (replace the header comment; keep the two constants unchanged):

```ts
// Designed and constructed by Drferdi.
/**
 * Tenaga medis names for the RME. Since 2026-09-27 (Chief, DECISIONS) the signed-in Assist user
 * fills the field of their profession; the constants fill the other field and every case where
 * no crew profession is known.
 */

export const DOKTER_NAMA = 'dr. Ferdi Iskandar, S.H., M.Kn., C.LM., CMDC';
export const PERAWAT_NAMA = 'JOSEP ARIANTO, A.Md';

export interface AssistStaff {
  name: string;
  profession: string;
}

const DOCTOR_PROFESSIONS = new Set(['dokter', 'dokter gigi']);
const NAKES_PROFESSIONS = new Set(['perawat', 'bidan', 'apoteker', 'triage officer']);

export function resolveStaffField(profession: string | undefined): 'dokter' | 'perawat' | null {
  const key = (profession ?? '').trim().toLowerCase();
  if (DOCTOR_PROFESSIONS.has(key)) return 'dokter';
  if (NAKES_PROFESSIONS.has(key)) return 'perawat';
  return null;
}

export function resolveTenagaMedisNames(staff: AssistStaff | null): {
  dokter_nama: string;
  perawat_nama: string;
} {
  const names = { dokter_nama: DOKTER_NAMA, perawat_nama: PERAWAT_NAMA };
  const name = staff?.name.trim() ?? '';
  const field = resolveStaffField(staff?.profession);
  if (!name || !field) return names;
  return field === 'dokter' ? { ...names, dokter_nama: name } : { ...names, perawat_nama: name };
}
```

`lib/rme/assist-staff.ts`:

```ts
import type { AuthSession } from '@/lib/api/auth-store';
import { resolveTenagaMedisNames, type AssistStaff } from '@/lib/clinical/tenaga-medis';

/** The signed-in crew user as RME staff; local accounts keep the constant names. */
export function assistStaffFromSession(session: AuthSession | null): AssistStaff | null {
  const user = session?.user;
  if (!user || user.id.startsWith('local:')) return null;
  return { name: user.name, profession: user.poli ?? '' };
}

/** Anamnesa and diagnosa: the signed-in user's name in `tenaga_medis`. */
export function withStaffNames<T extends { tenaga_medis?: TenagaMedisNames }>(
  payload: T,
  staff: AssistStaff | null
): T {
  if (!staff) return payload;
  return { ...payload, tenaga_medis: resolveTenagaMedisNames(staff) };
}

/** Resep: the signed-in user's name in `ajax.dokter` / `ajax.perawat`. */
export function withResepStaff<T extends { ajax: { dokter: string; perawat: string } }>(
  payload: T,
  staff: AssistStaff | null
): T {
  if (!staff) return payload;
  const names = resolveTenagaMedisNames(staff);
  return { ...payload, ajax: { ...payload.ajax, dokter: names.dokter_nama, perawat: names.perawat_nama } };
}
```

Import `type TenagaMedisNames` alongside `resolveTenagaMedisNames`, and in `tenaga-medis.ts`
export `TenagaMedisNames` and use it as the return type of `resolveTenagaMedisNames`.
`AuthSession` is exported from `lib/api/auth-store.ts` (interface at line 52).

`utils/types.ts`: add `tenaga_medis?: { dokter_nama: string; perawat_nama: string };` to the
diagnosa fill payload interface (`DiagnosaFillPayload`).

`background.ts`: add a function next to `hydrateTenagaMedisPayload` (~312) that uses the same
per-step narrowing idiom that function already uses (the step payload is the generic
`RMETransferStepPayload[TStep]`, so narrowing it per step needs the same
`as NonNullable<RMETransferPayload[...]>` / `as RMETransferStepPayload[TStep]` pair the file uses
today; state in the commit message that it mirrors `hydrateTenagaMedisPayload`):

```ts
async function applyAssistStaffPayload<TStep extends RMETransferStepStatus>(
  step: TStep,
  payload: RMETransferStepPayload[TStep]
): Promise<RMETransferStepPayload[TStep]> {
  if (!payload) return payload;
  const staff = assistStaffFromSession(await getSession());
  if (!staff) return payload;
  if (step === 'anamnesa') {
    const anamnesaPayload = payload as NonNullable<RMETransferPayload['anamnesa']>;
    return withStaffNames(anamnesaPayload, staff) as RMETransferStepPayload[TStep];
  }
  if (step === 'diagnosa') {
    const diagnosaPayload = payload as NonNullable<RMETransferPayload['diagnosa']>;
    return withStaffNames(diagnosaPayload, staff) as RMETransferStepPayload[TStep];
  }
  if (step === 'resep') {
    const resepPayload = payload as NonNullable<RMETransferPayload['resep']>;
    return withResepStaff(resepPayload, staff) as RMETransferStepPayload[TStep];
  }
  return payload;
}
```

Right after `const hydratedPayload = await hydrateTenagaMedisPayload(step, payload, tabId);`
(~605) add `const staffPayload = await applyAssistStaffPayload(step, hydratedPayload);` and put
`encounter: staffPayload` in `fillMessage` (the only later use of `hydratedPayload`). Import
`getSession` from `@/lib/api/auth-store` and `assistStaffFromSession`, `withStaffNames`,
`withResepStaff` from `@/lib/rme/assist-staff`. If the resep payload's `ajax` type is not
`{ dokter: string; perawat: string; ... }`, adjust the `withResepStaff` constraint to the real
type rather than casting.

Handlers:
- `page-diagnosa.ts`: `const dokterName = payload.tenaga_medis?.dokter_nama || DOKTER_NAMA;` and
  `const perawatName = payload.tenaga_medis?.perawat_nama || PERAWAT_NAMA;` (use the handler's
  real payload variable name). In both `autocompleteOptions` objects add
  `requireExactMatch: true, allowFirstItemFallback: false, requireDropdownSelection: true`.
  Replace the two "hardcoded per Chief directive" comments with
  "signed-in user or constant (DECISIONS 2026-09-27)".
- `page-anamnesa.ts`: add `requireExactMatch: true` to both `bridgeMappings`.
- `page-resep.ts`: values become `payload.ajax?.dokter || DOKTER_NAMA` and
  `payload.ajax?.perawat || PERAWAT_NAMA` (real payload variable name), add
  `requireExactMatch: true` to both mappings, and replace the "always override payload" comment.

`.agents/DECISIONS.md` — append:

```markdown
## 2026-09-27 — RME practitioner names come from the signed-in Assist user

- Decision (Chief): the "Dokter / Tenaga Medis" and "Perawat / Bidan / Nutrisionist /
  Sanitarian" fields take the name of the user signed in to Assist, chosen by crew profession
  (Dokter, Dokter Gigi → doctor field; Perawat, Bidan, Apoteker, Triage Officer → nurse field).
  The other field, local accounts and unknown professions keep `DOKTER_NAMA` / `PERAWAT_NAMA`.
  This reverses the earlier directive "always used, never dynamic" in `lib/clinical/tenaga-medis.ts` (R3).
- Profession, not `role`, decides, because `normalizeRole` maps bidan to `doctor`.
- ePuskesmas autocomplete for these fields selects only a single exact name match; otherwise the
  field is cleared and the step reports "Nama tenaga medis tidak cocok persis di ePuskesmas".
```

- [ ] **Step 4: Run tests to verify they pass**

Run the Step 2 command, then `node scripts/pnpm.mjs exec vitest run lib entrypoints tests/runtime`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/clinical/tenaga-medis.ts lib/clinical/tenaga-medis.test.ts lib/rme/assist-staff.ts lib/rme/assist-staff.test.ts utils/types.ts entrypoints/background.ts lib/handlers/page-diagnosa.ts lib/handlers/page-anamnesa.ts lib/handlers/page-resep.ts .agents/DECISIONS.md
git commit -m "feat(med-assist): fill RME practitioner names from the signed-in Assist user (R3, Chief approved)"
```

---

### Task 9: Gates, reviews, handoff

**Files:**
- Modify: `.agents/HANDOFF.md` (overwrite), `docs/ARCHITECTURE.md` (only if a described behaviour changed: RME staff source, emergency card headings)

- [ ] **Step 1: Run every capsule gate**

```bash
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run run:check
```

Expected: all exit 0 (lint: only the one pre-existing warning).

- [ ] **Step 2: Run token-guard and safrs-auditor agents over the branch diff** (`git diff e2de54d0..HEAD`); fix anything they flag.

- [ ] **Step 3: Overwrite `.agents/HANDOFF.md`** with the new state (branch, commits, gate results, the parked "Diagnosis utama" item, Chief's live checks still needed: medboard deploy of `/api/doctors/contacts`, ePuskesmas exact-match on a real page), and update `docs/ARCHITECTURE.md` where the RME staff source and the emergency card are described.

- [ ] **Step 4: Commit**

```bash
git add .agents/HANDOFF.md docs/ARCHITECTURE.md
git commit -m "docs(med-assist): hand off the side panel UI batch (R1)"
```
