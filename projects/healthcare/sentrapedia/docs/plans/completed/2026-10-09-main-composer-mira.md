# Main composer MIRA wiring

Gaffer reports the main Ask button still returns local placeholders. Root cause: WorkspaceApp.generate always uses createDraft; MIRA is only connected through the separate dialog.

Authorized fix, solo: route built-in question/ddx to an editable MIRA preview; stage explicit complaint, numeric age/sex and raw context/notes locally without patient name/ID. No external case request until fictional-data opt-in and explicit analysis. On successful validated analysis, append original prompt and source-preserving MIRA draft to the captured encounter and clear input. Cancel/error leaves input/history intact. Personal templates and other document modes retain local formatting with an explicit label. No clinical-rule changes, installs or shared service mutations.

Verify: regressions for route choice/minimal case/missing data/name exclusion/provenance; typecheck, changed-file lint, targeted tests, build, deploy dry-run and extraction match. Browser must test MAIN input/Enter -> preview -> confirmed real MIRA -> saved draft -> reload, plus cancel and disabled consent. Do not call this fixed solely from API200.
