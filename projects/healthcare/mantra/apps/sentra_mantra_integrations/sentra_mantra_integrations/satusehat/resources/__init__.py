"""Per-resource SATUSEHAT fetch + normalization.

One module per FHIR resource type (Encounter/Condition/Observation/Procedure/
MedicationRequest). Fetch functions are read-only and org/encounter-scoped;
normalize functions are pure and side-effect-free (see ../mapping.py).
"""
