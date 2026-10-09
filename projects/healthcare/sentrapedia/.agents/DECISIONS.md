# Sentrapedia decisions

## 2026-10-08 — Standalone Glass recreation

- Keep all application dependencies, configs, tokens, lock state, tests, and deployment assets capsule-local. Empirical extraction passed outside Monorepo.
- Implement browser-local workflows without silently obtaining credentials or calling other capsule services.
- Preserve clinician-supplied text and organize explicit English/Indonesian labels. Local question/DDx/A&P output is a scaffold; actual medical reasoning requires a reviewed backend.
- Match the screenshot's desktop composition; use a responsive drawer for small screens and custom vector artwork for the promotional image.
- Gaffer's explicit autonomous completion request supersedes intermediate design checkpoints and the earlier verification halt; record failures, solve them, and verify the final implementation.

## 2026-10-09 — Five local workspace concepts

- Gaffer approved all five design/workflow concepts and explicitly requested solo implementation without an additional worker; review was performed inline.
- Keep v1 browser storage compatible using optional source/baseline/status metadata. No clinical inference, AI provider, knowledge base, or archive changes.
- Draf → Ditinjau → Final is a user-controlled local workflow. Editing returns to Draf. It is not clinical sign-off, authentication, or an audit trail.
- Snapshot input/context/patient notes/format preferences at generation. Preserve snapshots and initial content across edits; do not backfill provenance for legacy documents.
- Read only explicit context labels; keep conflicting encounter/patient values separately labeled and missing facts unavailable. Timelines never merge unrelated or unlinked Patients.
- Use the existing independently installed extraction and identical lockfile for gates while respecting the no-install constraint. Main checkout runtime remains a separate baseline limitation.

## 2026-10-09 — Compact interface and reactive headlines

- Keep stored setting identifiers and documents unchanged; localize Primary Care/Standard through display-only helpers.
- Default headline follows Gaffer's explicit copy list. Other headlines follow the active intent group, with a short CSS transition and no automatic cycling. Keep Tosca/light theme and existing reduced-motion behavior.

## 2026-10-09 — Four persistent local workflow tools

- Gaffer confirmed the written spec and requested execution; no additional workers. Review performed solo; independent review remains unavailable under that constraint.
- Extend version-1 storage with optional metadata. Validate new fields separately so malformed metadata does not discard valid legacy documents. Preserve source/baseline; record revisions only on actual content changes, with 50 snapshots per document.
- Review checklists are user work metadata. At least one required item, all required checks, and reviewed status precede Final. Edit/restore/list changes reset signs and status; legacy final records remain readable. Global default changes affect subsequent documents only.
- Template preferences are recorded without AI interpretation. Only explicit matching labels fill personal sections; missing sections remain unavailable. Capture the selected template in document provenance so later edits/deletion cannot change the source.
- Queue status/pins/tasks remain manual per Encounter and independent of document/clinical status. Storage failures retain a visible warning; no successful-save claim on failed writes.

## 2026-10-09 — Oracle catalog and existing MIRA adapter

- Gaffer authorized integrate-both after comparison; execute solo. Oracle remains read-only, unreviewed source text with file/hash/record provenance. Use 15 actual categories rather than metadata's 14; never merge disease entries by repeated ICD code.
- Localize Med Assist's v1 schema/type/validator snapshots with attribution, no runtime cross-capsule dependency. Reuse the existing MIRA service/provider; no install, credential copy, upstream change or paid verification. Optional server-only token and loopback URL; health availability is separate from authenticated readiness.
- Synthetic structured input only, no Patient/Encounter auto-copy. Same-origin/loopback/Host validation and bounds/timeout/cancel protect the local adapter; it is not a production authenticated API. Preserve full result/case/trace in an explicit draft, all model evidence and outside-Oracle diagnoses. Oracle narratives never generate regimens. Review metadata remains manual and not clinical certification; PNPK page sources still unavailable.
## 2026-10-09 — Free OpenRouter routing

- Gaffer selects free OpenRouter models; both MIRA stages pinned to apodex/apodex-1.1-mini:free after official metadata/JSON/ZDR compatibility check. Experimental, not clinically validated. No random free router, paid fallback, privacy weakening or replacement of clinical postchecks.
- Keep shared Med Assist MIRA instance untouched. Prepare a separate service using existing runtime, process-only profile and own ignored configuration. No external .env reads or installs; key missing is explicit readiness state. Gateway refuses non-free/mixed profiles before inference and missing/nonzero cost after response. Health/configuration is not authenticated provider verification.- 2026-10-09: Gaffer approves paid DeepSeek Flash and declines training-use consent. Select deepseek/deepseek-v4.1-flash for both MIRA stages, fixed ZDR/no-training privacy preserved, fictional-only local instance8791, service budgets0.10USD/step and1USD/day. Free-only selection superseded; no production/clinical accuracy authorization inferred.
