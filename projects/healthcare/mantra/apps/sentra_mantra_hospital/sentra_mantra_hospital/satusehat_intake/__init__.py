"""SATUSEHAT intake — materialize staged FHIR records into native healthcare DocTypes.

Consumes `SATUSEHAT Resource Record` rows staged by sentra_mantra_integrations
(read via Frappe string DocType queries only — NEVER a Python import of that
app, per ADR-0001 dependency direction) and creates/updates the corresponding
native `healthcare` clinical documents, writing the mapping outcome back onto
each staging record.

Fail-closed clinical discipline (highest priority):
- Patient identity is confidence-gated: match first on satusehat_ihs /
  satusehat_nik (unique-indexed); an unmatched patient WITH a staged FHIR
  Patient resource and a stable key is created and tagged
  patient_source="SATUSEHAT" (REVISION 01 DECISION A). No stable key,
  ambiguous match, or missing demographics -> mapping_status="Conflict" for
  human review — clinical certainty is never fabricated.
- Encounters are attributed to the Disabled "SATUSEHAT Import" placeholder
  practitioner (DECISION B); the real SATUSEHAT practitioner IHS/name is
  preserved on the encounter for a future remap wave.
- Idempotent: every materialized document is keyed to its SATUSEHAT fhir_id
  (custom field `satusehat_fhir_id`); a repeat run updates in place.
- Per-record isolation: one bad record rolls back its own writes and is marked
  Failed; the rest of the batch continues.
- PHI never appears in logs or error messages — record name + fhir_id + status
  only. Execution against real staged PHI happens only inside the dev container.
"""
