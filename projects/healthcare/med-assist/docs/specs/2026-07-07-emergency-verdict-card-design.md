# Emergency Verdict Card (7-Section Headline Summary) — Design Spec

> Status: approved by Chief (dr. Ferdi Iskandar) in-session, 2026-07-07.
> Sub-project C of the large clinical spec decomposed 2026-07-06 (A: 13 new
> ABCDE protocols, B: 91-entity-to-22-protocol mapping — both complete).
> Also completes the deferred UI wiring half of
> `docs/specs/2026-07-06-triage-zone-verdict-design.md` (tab rename to
> "TRIAGE", zone-driven tab color, `buildSummary()` "Prioritas"/"Tindakan
> awal" fix) — that spec's pure logic (`computeTriageVerdict`,
> `resolveActionProtocolId`) was built and tested in isolation but never
> wired into any UI file until this sub-project.
> Update 2026-09-27: section headings render in Bahasa Indonesia — Mengapa
> penting / Lakukan sekarang / Jangan lakukan / Pemicu rujukan / Evaluasi
> ulang / Dasar bukti — each as its own `section.emg-verdict__section` block
> under a new `.emg-verdict__header` (zone + title); section names below are
> updated to match.

## Problem

`EmergencyDashboard` (in `entrypoints/sidepanel/main.tsx`) renders a flat,
unordered list of findings — title + reasoning + recommendations, one entry
per alert, all visually equal weight. There is no single "what matters most
right now" summary. Two pure modules already exist to solve this
(`computeTriageVerdict()`, `resolveActionProtocolId()`) but were never
connected to any UI — `grep` confirms zero references to either function
outside their own test files.

Chief's original clinical spec asked for a 7-part structure per finding:
Verdict / Mengapa penting / Lakukan sekarang / Jangan lakukan / Pemicu rujukan /
Evaluasi ulang / Dasar bukti. Applying all 7 sections to every single
alert (including low-severity ones) would bury the most urgent action under
repeated boilerplate — an alarm-fatigue risk. Confirmed with Chief: the
7-section structure applies only to the **headline alert** (the single
worst/most-actionable finding for the whole encounter, from
`computeTriageVerdict()`); all other findings keep the current flat list
format unchanged, undeleted, unhidden.

## Scope

**In scope:**

- A new "Verdict Card" rendered at the top of `EmergencyDashboard`, built
  from `computeTriageVerdict()`'s `zone` + `headlineAlert`, with the 6
  sub-sections mapped to already-existing data (table below). No new
  clinical content is authored.
- Wiring `resolveActionProtocolId()` into `buildAlerts()` so alerts without
  an `actionProtocolId` (all 21 legacy inline gate types) get one filled in
  where an unambiguous mapping exists — per the confirmed table in
  `2026-07-06-triage-zone-verdict-design.md`.
- Wiring `computeTriageVerdict()` into `TTVInferenceUI.tsx` and threading the
  result up to `main.tsx` via a new callback prop.
- Reordering `EmergencyDashboard`'s alert list to `sortedAlerts` (severity +
  gate-priority order) instead of raw `buildAlerts()` insertion order.
- Fixing `buildSummary()`'s "Prioritas" and "Tindakan awal" lines to use the
  computed `headlineAlert` instead of `alerts[0]` (documented insertion-order
  bug from the prior spec).
- Renaming the sidepanel's third tab from "CODE RED" to "TRIAGE" and driving
  its color from the computed zone (merah/kuning/hijau/standby) instead of a
  flat red-only alert-active state.
- New CSS for the amber (kuning) and emerald (hijau) tab variants and the new
  Verdict Card, additive only.

**Out of scope (explicitly deferred):**

- Evaluasi ulang as a real countdown/stateful timer — this sub-project
  uses a static text label per severity tier only (`critical` → "Reevaluasi
  dalam 5 menit", `high` → "15 menit", `warning` → "30 menit"). No new
  `setInterval`/timer state.
- Applying the 7-section structure to every alert in the list — only the
  headline alert gets it; the rest keep the current format.
- Authoring new `contraindications` for the 9 original ABCDE protocols that
  don't have them yet (only the 13 sub-project-A protocols have this field
  populated) — the UI must handle empty/missing contraindications gracefully
  by hiding that sub-section, not fabricating content.
- Removing the existing `emergencyAlerts`/`onAlertsChange` state in
  `main.tsx` — left as-is for `alertCount`, even though `triageVerdict.sortedAlerts`
  now covers the same content in different order. Not touched, out of scope.
- Any change to gate thresholds, `clinical-patterns.ts` content, or any
  `action-protocols.ts` entry — this spec only _renders_ existing reviewed
  content, same constraint as the prior spec.

## Architecture

### 1. `buildAlerts()` — `components/clinical/TTVInferenceUI.tsx`

Immediately before `return alerts;` (currently line ~1410), map every alert
to fill `actionProtocolId` where not already set:

```ts
return alerts.map((alert) => ({
  ...alert,
  actionProtocolId: alert.actionProtocolId ?? resolveActionProtocolId(alert),
}));
```

`resolveActionProtocolId` (from `lib/emergency-detector/action-protocol-resolver.ts`)
is structurally compatible with `ScreeningAlert` (`id`, `type`, `gate`,
`actionProtocolId?`, `clinicalData?`) — no adapter needed.

### 2. Triage verdict computation — `components/clinical/TTVInferenceUI.tsx`

New prop on `TTVInferenceUIProps`:

```ts
onTriageVerdictChange?: (verdict: TriageVerdict<ScreeningAlert>) => void;
```

Immediately after the existing `alerts` useMemo (~line 1919):

```ts
const hasVitalsEntered = Boolean(
  state.sbp || state.dbp || state.hr || state.rr || state.temp || state.spo2 || state.glucose
);

const triageVerdict = useMemo(
  () => computeTriageVerdict(alerts, hasVitalsEntered),
  [alerts, hasVitalsEntered]
);

useEffect(() => {
  onTriageVerdictChange?.(triageVerdict);
}, [triageVerdict, onTriageVerdictChange]);
```

`computeTriageVerdict` and `TriageVerdict` import from
`@/lib/emergency-detector/triage-verdict` (already built, already tested,
zero changes needed to that file).

### 3. `buildSummary()` fix — `components/clinical/TTVInferenceUI.tsx`

Signature changes from `(state, alerts, flags, patient)` to
`(state, headlineAlert, flags, patient)`:

```ts
const buildSummary = (
  state: TTVStateShape,
  headlineAlert: ScreeningAlert | null,
  flags: Record<string, boolean>,
  patient: Pick<TTVInferenceUIProps, 'patientName' | 'patientGender' | 'patientAge' | 'patientRM'>
): string => {
  // ...unchanged lines...
  headlineAlert
    ? `Prioritas: ${headlineAlert.severity.toUpperCase()} - ${headlineAlert.title}`
    : 'Prioritas: STABLE - belum ada alert prioritas tinggi',
  headlineAlert
    ? `Tindakan awal: ${headlineAlert.recommendations[0]}`
    : 'Tindakan awal: lanjutkan observasi dan lengkapi data klinis bila perlu',
];
```

Call site (~line 2766) changes from `buildSummary(state, alerts, ...)` to
`buildSummary(state, triageVerdict.headlineAlert, ...)`.

### 4. `main.tsx` wiring

```ts
const [triageVerdict, setTriageVerdict] = useState<TriageVerdict<ScreeningAlert>>({
  zone: 'standby',
  headlineAlert: null,
  sortedAlerts: [],
});
```

- `<TTVInferenceUI onTriageVerdictChange={setTriageVerdict} onAlertsChange={setEmergencyAlerts} ... />`
  — both callbacks kept, `emergencyAlerts` untouched (still feeds `alertCount`).
- `<SidePanelHeader triageZone={triageVerdict.zone} alertCount={emergencyAlerts.length} ... />`
- `<EmergencyDashboard alerts={triageVerdict.sortedAlerts} verdict={triageVerdict} />`

### 5. `EmergencyDashboard` — new Verdict Card

Rendered as a new block at the top of the existing `emg-timeline` container,
above `emg-timeline__header`. Takes the new `verdict: TriageVerdict<ScreeningAlert>`
prop.

**Data mapping (headline alert only):**

| #   | Section            | Source                                                                                                                              | When missing                                                                                                                                  |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Verdict            | `verdict.zone` (label: MERAH/KUNING/HIJAU/STANDBY) + `headlineAlert.title` + `.severity`                                            | `headlineAlert === null` → zone-only message ("Standby — belum ada data vital" / "Hijau — tidak ada temuan aktif"), sections 2–7 not rendered |
| 2   | Mengapa penting   | `headlineAlert.reasoning`                                                                                                           | — (always present when headline exists)                                                                                                       |
| 3   | Lakukan sekarang             | `getActionProtocol(headlineAlert.actionProtocolId)?.steps`, grouped by `phase` (A/B/C/D/E/other, in that order)                     | Protocol doesn't resolve → render `headlineAlert.recommendations` via the existing `formatRecommendationLines()` instead                      |
| 4   | Jangan lakukan          | `.contraindications`                                                                                                                | Protocol resolves but has no contraindications, or doesn't resolve → sub-section omitted entirely (not rendered), never a placeholder         |
| 5   | Pemicu rujukan      | `.referralCriteria`                                                                                                                 | Protocol doesn't resolve → sub-section omitted                                                                                                |
| 6   | Evaluasi ulang | Static text keyed on `headlineAlert.severity`: `critical` → "Reevaluasi dalam 5 menit", `high` → "15 menit", `warning` → "30 menit" | — (always derivable, severity is a required field)                                                                                            |
| 7   | Dasar bukti      | `.source`                                                                                                                           | Protocol doesn't resolve → sub-section omitted                                                                                                |

`getActionProtocol` imports from `@/lib/emergency-detector/action-protocols`
(already built, zero changes to that file's data).

The existing `emg-timeline__track` list below the Verdict Card is unchanged
in format — it now iterates `alerts` (which is `verdict.sortedAlerts` passed
from `main.tsx`), so order reflects severity/gate-priority instead of
insertion order. The headline alert is **not** removed from this list — it
appears both in the Verdict Card and in its normal list position, since the
list is the complete record and the card is an additive summary.

### 6. `SidePanelHeader.tsx` — tab rename + zone color

- Import `TriageZone` from `@/lib/emergency-detector/triage-verdict`.
- New prop `triageZone?: TriageZone` (default `'standby'`).
- `engineButtons`: `{ id: 'emergency', label: 'CODE RED' }` → `{ id: 'emergency', label: 'TRIAGE' }`.
- Tab class logic replaces the current
  `engine.id === 'emergency' && alertCount > 0 ? ' engine-btn--alert-active' : ''`
  with:
  ```ts
  engine.id === 'emergency'
    ? triageZone === 'merah'
      ? ' engine-btn--triage-merah'
      : triageZone === 'kuning'
        ? ' engine-btn--triage-kuning'
        : triageZone === 'hijau'
          ? ' engine-btn--triage-hijau'
          : '' // standby: no modifier, neutral tab
    : '';
  ```
- The `engine-tab-dot` render condition changes from `alertCount > 0` to
  `triageZone !== 'standby'` — this is the point of having a distinct
  `'hijau'` zone: a fully-assessed-and-clear patient shows a green dot,
  visually distinct from an un-assessed (`'standby'`) patient showing no dot
  at all. Never conflate "not yet checked" with "checked and fine".

### 7. CSS — `entrypoints/sidepanel/style.css` (additive only)

- `.engine-btn--triage-merah` — alias/reuse of the existing
  `.engine-btn--alert-active` rule (same red values), added as a second
  selector on that existing rule rather than duplicating it.
- `.engine-btn--triage-kuning` — new, amber (reuse the same amber used in
  `.emg-entry__dot--high`: `rgba(220, 160, 40, *)`).
- `.engine-btn--triage-hijau` — new, uses the existing `var(--login-emerald)`
  / `var(--login-emerald-40)` tokens (already global via `:root`, despite the
  `login-` prefix) — consistent with Chief's established single-emerald-accent
  UI convention.
- `.emg-verdict` and sub-classes (`.emg-verdict__zone`, `.emg-verdict__why`,
  `.emg-verdict__donow`, `.emg-verdict__donot`, `.emg-verdict__refer`,
  `.emg-verdict__timer`, `.emg-verdict__evidence`) — new block, follows the
  existing `emg-*` naming convention already used by `emg-timeline`/`emg-entry`.

## Data Flow

```
buildAlerts() [unchanged gates, now fills actionProtocolId via resolveActionProtocolId()]
  → alerts: ScreeningAlert[]
  → computeTriageVerdict(alerts, hasVitalsEntered)
      → { zone, headlineAlert, sortedAlerts }
  → onTriageVerdictChange → main.tsx triageVerdict state
      → SidePanelHeader triageZone   → TRIAGE tab color
      → EmergencyDashboard verdict   → Verdict Card (7 sections, headline only)
      → EmergencyDashboard alerts    → sortedAlerts (existing list, reordered)
  → buildSummary(state, triageVerdict.headlineAlert, ...) → AUTOSEN "Prioritas"/"Tindakan awal"
```

## Error Handling

- `headlineAlert === null` (zone `hijau` with zero findings, or `standby`) →
  Verdict Card shows zone message only, sections 2–7 not rendered — no
  placeholder text like "no findings".
- `getActionProtocol(id)` returns `undefined` (stale/typo'd id, or id itself
  `undefined`) → Lakukan sekarang falls back to `recommendations`; Jangan
  lakukan/Pemicu rujukan/Dasar bukti sections omitted — identical fallback
  whether the id was never set or doesn't resolve.
- `.contraindications` is `undefined` or `[]` even when the protocol resolves
  (9 of 22 protocols) → Jangan lakukan section omitted, not shown as empty.
- Unknown/future `gate` string reaching `computeTriageVerdict` — already
  handled by that function (sorts last, never throws); no new handling
  needed here.

## Testing Plan

- `buildAlerts()`: at least one legacy gate (e.g. `hypotension`) now carries
  `actionProtocolId: 'PROTO_SHOCK'` via the resolver, where it previously had
  none.
- `buildSummary()`: "Prioritas"/"Tindakan awal" reflect `headlineAlert`, not
  `alerts[0]` — regression test reproducing the documented insertion-order
  bug (a lower-severity alert pushed before a critical one must not win).
- `EmergencyDashboard` Verdict Card, four render states: (a) headline with a
  fully-populated protocol (steps + contraindications + referral + source
  all render), (b) headline with a protocol missing contraindications
  (Jangan lakukan section absent, other sections present), (c) headline with
  no resolvable protocol (Lakukan sekarang shows recommendations, Jangan
  lakukan/Pemicu rujukan/Dasar bukti all absent), (d) `headlineAlert ===
  null` (zone message only, no sub-sections).
- `SidePanelHeader`: tab label reads "TRIAGE"; correct modifier class for
  each of the 4 zone values, including no-modifier-and-no-dot for
  `'standby'`.
- Existing `TTVInferenceUI.test.tsx` and `main.tsx`-adjacent tests continue
  to pass unmodified except where they assert on `alerts[0]`-derived summary
  text (update those specific assertions to match the new headline-based
  logic, not the behavior change itself).

## Open Assumptions

- Exact amber/emerald CSS values are pulled from already-existing tokens in
  `style.css` (`.emg-entry__dot--high`'s amber, `--login-emerald`) rather
  than inventing new colors — confirmed during exploration, not guessed.
- "Lakukan sekarang" phase grouping order is fixed A → B → C → D → E → other,
  matching `ABCDEPhase`'s natural reading order; no protocol has ever
  ordered steps differently in `action-protocols.ts`.
