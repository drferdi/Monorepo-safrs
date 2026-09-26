# Refactor Visual Parity Checklist

Tanggal: 2026-06-18

## Rule

CSS splitting may move selectors, but it must not change class names, rendered copy, layout intent, animation timing, or responsive behavior.

## Surfaces

| Surface | Entry | Validation |
| --- | --- | --- |
| Login | `entrypoints/login/index.html` | Manual smoke or Playwright screenshot |
| Dashboard | `entrypoints/sidepanel/main.tsx` dashboard view | Existing dashboard unit test plus screenshot |
| TTV | `TTVInferenceUI` tab | Existing TTV tests plus screenshot |
| Trajectory | `ClinicalTrajectory` view | Existing trajectory flow plus screenshot |
| Differential | `ClinicalDifferential` view | Existing tests plus screenshot |
| Settings | `SettingsConsole` view | Existing settings tests plus screenshot |
| Emergency | Sidepanel Emergency tab / `EmergencyDashboard` state | Manual smoke or Playwright screenshot |

## Visual Evidence Criteria

- Required viewports: desktop 1280x800 and narrow/mobile-ish 390x844, or closest available sidepanel viewport.
- Record baseline/current screenshot locations in this checklist or a linked review note when screenshots are taken.
- Pass/fail criteria: no missing surface, no overlapping text, no shifted primary controls, no changed copy/classes unless approved, no broken responsive layout.
- Visual approval owner/record: reviewer must record approval in this checklist or linked review note.

## Commands

```powershell
npm run build
npm run test:e2e
```

## Manual Smoke

- Confirm login flow can open the sidepanel.
- Confirm patient context fetch view renders without an error placeholder in the tested environment.
- Confirm AutoComplete+ UI still fills vitals and alerts in the smoke scenario.
- Confirm Trajectory view can show local fallback when canonical API is unavailable.
- Confirm Differential view can show suggestions and prepare transfer payload in the smoke scenario.
- Confirm Settings Dashboard Sync toggle persists and displays bridge config state in UI.

## Current E2E Status

- `npm run build`: PASS
- `npm run test:e2e`: PASS on final review and main-agent reruns, 12 tests. Earlier review saw a transient Playwright `beforeAll` timeout after a worker pass; keep screenshot parity as a separate evidence requirement.

## Known Limitations / Follow-ups

- E2E smoke is not screenshot parity proof.
- Vite/WXT deprecation warnings are migration follow-up, not this refactor.
- Settings Dashboard Sync visual checklist only proves UI persistence/status display unless bridge runtime is separately verified.
- Any logic-only/dead branch claims must be checked against current feature matrix before visual refactor.
