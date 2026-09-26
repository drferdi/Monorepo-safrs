"""SATUSEHAT (FHIR R4) reader — read-only, non-system-of-record pull from
Kemkes SATUSEHAT into audited MANTRA staging (ADR-0001 S3).

This module never creates final clinical records (Patient, Patient Encounter,
etc.) — it stages raw + normalized FHIR resources with a mapping-status hint
for a separate materializer in sentra_mantra_hospital to consume. It never
writes back to SATUSEHAT.

PHI fail-closed: the default mode is `Aggregate` (_count=0, PHI-free, safe
anywhere). `Resources` mode carries PHI and must only run inside the dev
container against production SATUSEHAT, on explicit operator opt-in (see
reader.pull_encounters). Credentials are read from environment variables only
and are never logged, printed, or persisted (ADR-0002 S1).
"""
