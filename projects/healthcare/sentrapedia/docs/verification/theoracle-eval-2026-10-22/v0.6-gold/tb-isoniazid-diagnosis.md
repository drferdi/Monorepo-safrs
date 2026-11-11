# Why TB's own passages do not verify isoniazid 300 mg for A15.0 (read-only), 2026-10-23

Case abbreviations-07 ("TB paru BTA positif kasus baru"), drug as the model wrote it in the v0.6 rerun: Isoniazid 1x300mg. Since `5ee97230` it is `doseRemoved`; before, only the Skrofuloderma cross-referenced line verified it. Local retrieval and gate, no model call, index `0dccb6dc…`. No code changed.

## Retrieved passages (11)

| Passage | Gate alone | Why |
|---|---|---|
| Tuberkulosis Paru, Terapi chunk (`16a1efce`) | doseRemoved | the 300 mg is in the IDI 2017 table as "INH* 5(4-6) max 300mg/hr" |
| Tuberkulosis Paru, narrative chunk (`d8cb2275`) | doseRemoved | same table row ("INH 5(4-6) max 300mg/hr"); the "isoniazid" mentions carry no strength |
| Tuberkulosis Paru, Rujukan/Edukasi (`b824425d`) | removed | no isoniazid |
| Skrofuloderma (cross-referenced lines) | doseRemoved | blanked by the gate since `5ee97230` |
| `tuberkulosis-2019.pdf` ×4 | doseRemoved / removed | TB meningitis and drug-resistance text; isoniazid named without a strength |
| `fktp-kmk-2022.pdf`, `fasyankes-primer-idi-2017.pdf` ×2 | removed | no isoniazid |

## Causes

1. **Retrieval: TB's own dose chunks are not retrieved.** The Tuberkulosis Paru entry has 22 chunks. Three of them (`b40c5b44`, `a3e6681f`, `434ad41c`) hold its own PNPK 2019 rows "- obat: isoniazid; dosis: 300 mg" (hal. 48, 62, 64). Each one alone verifies the dose (`verified`). None is among the retrieved passages: two-per-document cap per retrieval, and the chunks retrieved for TB are the therapy text, a narrative chunk and the referral section.
2. **Gate reading: the retrieved table writes "INH", not "isoniazid".** The gate opens a dose window only after the drug's own name word (four letters or more) or an alias written in brackets right after it ("Isoniazid (INH)"). The table row "INH* 5(4-6) max 300mg/hr" has no such link, so it is not read for isoniazid. This is deliberate ("Rifampisin + INH" does not own "INH 300 mg").
3. **The table value is a maximum.** Even read as isoniazid, the row is 5 mg/kgBB daily with a 300 mg/day maximum. Verifying "1x300mg" from it would treat the cap as the dose, which matches the usual adult dose but is not what the row states.
4. **The PDF.** `tuberkulosis-2019.pdf` has 348 chunks; three contain isoniazid followed by 300 mg ("Isoniazid DT 300 mg", "Isoniazid 300 mg", and an allergy desensitisation table "50 mg 300 mg"). None was retrieved.

## Options (Gaffer decides; none applied)

- Retrieval (excluded by the standing rule "retrieval is not tuned again"): let the therapy dose passage prefer a chunk of the diagnosis's own entry that holds a dose line for the drug.
- Gate: an abbreviation table such as INH/RIF/PZA/EMB for the OAT, so "INH" opens a window for isoniazid. Point 3 still applies: a "max" value would then verify a flat dose.
- SSOT: none needed; TB's own rows already carry 300 mg.
- Accept: the drug is shown without a dose, which is the conservative outcome.
