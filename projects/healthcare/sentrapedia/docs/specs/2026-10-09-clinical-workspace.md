# Sentrapedia advanced clinical workspace

Authority: Chief approved ideas 1–5 for implementation, then chose inline execution without additional workers. This spec makes that approved scope explicit; no provider, knowledge base, or installation is authorized.

## Outcome

A working local clinical cockpit retaining Sentrapedia's Tosca identity, Indonesian controls, and fictional-data boundary. Existing version-1 records remain readable.

1. Collapsible right context panel shows patient identity and explicitly labeled concern, history, medicines, allergies, and missing fields. It never treats missing allergies as none. Existing label extraction is presentation only; raw source remains visible and editable via the context dialog.
2. Patient-filtered encounter timeline shows actual stored visits and document events, with readable Jakarta timestamps. Selecting an encounter retains access to its context and drafts. Unlinked encounters do not get combined into a patient history.
3. Four intent groups (Tanya, Dokumentasikan, Rencanakan, Komunikasikan) expose all 14 existing modes. A slash picker changes mode without submitting or discarding the draft. Input instructions follow the selected mode.
4. Document Studio provides section navigation, section editing and full-document editing, original-source comparison, a visible comparison against the initial draft, and user-set Draf/Ditinjau/Final status. Any substantive edit resets status to Draf; Final requires Ditinjau first. Status is local workflow metadata, not clinical approval or an audit signature.
5. Focus Mode hides side panels and promotion while preserving navigation restoration. Searchable keyboard command palette opens patients, encounters, document modes and workspace actions. Ctrl/Cmd+J opens palette; existing Ctrl/Cmd+K and Ctrl/Cmd+/ keep their behavior. Dialogs suppress background shortcuts.

## Constraints and acceptance

- No new dependencies, installation, external services, AI, KB ingestion, or clinical inference.
- No patient source text is replaced or inferred. Generated documents capture immutable prompt/context provenance; legacy drafts explicitly identify unavailable historical provenance.
- Source and document are display-only until the user chooses Edit; edits remain escaped React text.
- Responsive panels use accessible native dialogs on smaller screens; no hidden focusable controls; Escape and reduced motion remain supported.
- Schema additions are optional. Restore rejects malformed metadata while preserving valid legacy data. Existing export, clipboard, tasks, linked encounters, and settings remain operable.
- Verify targeted persistence/status/source/section/intent/timeline tests, typecheck, lint, build, deployment dry run, and isolated browser desktop/mobile flows without installing packages.

Risk: R2 due to browser-local persistence contract additions; clinical logic is unchanged. Production readiness is outside scope.
