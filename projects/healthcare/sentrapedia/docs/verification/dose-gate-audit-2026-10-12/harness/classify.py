"""Writes the A-H classification of the non-verified targeted drugs (10-11 replies, HEAD gate) to the tracked audit folder.

usage: python -I .runtime/audit/classify.py
Categories are a hand reading of .runtime/audit/detail-1011.txt plus corpus checks; see the report for the definitions.
"""
import json

OUT = "docs/verification/dose-gate-audit-2026-10-12/classification-targeted.json"
C = {
    ("lay_terms-03", "Flukonazol"): ("F", True, "50 mg comes from a PERDOSKI azole list for candidiasis/deep mycosis that does not name versicolor; no versicolor passage in the corpus doses flukonazol."),
    ("lay_terms-05", "Betahistin mesilat"): ("D", False, "BPPV note says 'Betahistin mesilat 3 x 6-12 mg'; the gate needs the exact strength, so 6 mg inside the source range 6-12 mg fails."),
    ("lay_terms-08", "Antihistamin H1 generasi kedua (non-sedatif)"): ("A", True, "A drug class, not a drug; PERDOSKI 2017/2021 give the class without a dose."),
    ("lay_terms-09", "Parasetamol"): ("A", True, "Varicella note names parasetamol as antipyretic without a dose; no other varicella passage doses it."),
    ("lay_terms-09", "Losion Kalamin"): ("A", True, "Topical applied as needed; the source has no numeric dose."),
    ("lay_terms-13", "Diosmin"): ("H1", True, "Source: MPFF (diosmin 450 mg + hesperidin 50 mg) 3 x 2 tablet for 4 days, then 2 x 2 tablet. The model wrote one tablet's content as the dose; blocked by the tablet-content rule. Also: label 'Haemorrhoids' (I84.9) shares no word with 'hemoroid' and the catalog lists hemoroid under K64."),
    ("lay_terms-13", "Hesperidin"): ("H1", True, "As diosmin: tablet content written as the per-dose amount."),
    ("abbreviations-01", "Salbutamol"): ("H2", True, "Model wrote dose '1x' with no amount, route PO 'as needed'. Sources dose salbutamol (FKTP: oral 1 mg with aminofilin for maintenance; GOLD: inhaled). Oral as-needed salbutamol for an acute exacerbation is not the guideline route."),
    ("abbreviations-01", "Aminofilin"): ("H2", True, "Dose '1x' with no amount; FKTP gives aminofilin/teofilin 100-150 mg for maintenance."),
    ("abbreviations-01", "Prednisone"): ("H1", True, "No prednison passage in the therapy bundle (retrieval miss), and the corpus COPD sources say prednison 40 mg/day for 5 days (PDPI 2019, GOLD 2024); the model wrote 30 mg up to 2 weeks."),
    ("abbreviations-01", "Ambroxol"): ("A", True, "IDI 2017 and FKTP 2022 name ambroxol for mucoid sputum without a dose; the only ambroxol dose in the corpus is in the acute bronchitis note."),
    ("abbreviations-04", "Amoksisilin"): ("H1", True, "OMA note: amoksisilin 3 x 500 mg (adult) or 80-90 mg/kgBB/day (child). The model wrote 2 x 250 mg, which matches neither; 250 mg is only in FORNAS strengths and the tonsillitis guideline."),
    ("abbreviations-08", "Metformin"): ("B", False, "PAPDI 2024 has 'Metformin 500 mg diberikan 1-3x sehari' in a diabetes chunk, but the therapy bundle held other PAPDI/FORNAS chunks without the dose."),
    ("abbreviations-11", "Sertraline"): ("D", False, "GAD note: 'Sertralin 1 x 25-50 mg/hari'; 25 mg is the lower end of the source range, which the exact-strength rule does not accept."),
    ("abbreviations-11", "Diazepam"): ("D", False, "GAD note: 'Diazepam 2-5 mg 1-2x/hari'; 2 mg inside the range fails. The FORNAS 'tab 2 mg' passage is correctly not accepted (not about GAD)."),
    ("abbreviations-13", "Betahistin mesilat"): ("D", False, "Same as lay_terms-05."),
    ("mixed_id_en-06", "Ceramide"): ("A", True, "Emollient, applied 2-3 times a day; no numeric dose exists."),
    ("mixed_id_en-06", "Chlorpheniramine"): ("D", False, "Spelling normalization: spell('chlorpheniramine') = 'khlorfeniramin', the corpus writes 'klorfeniramin', so no passage names the drug and it is removed. IDI 2017 doses klorfeniramin maleat 3 x 4 mg; that chunk was also not in the bundle."),
    ("mixed_id_en-09", "albumin serum normal (human albumin)"): ("G", True, "Dose is individualized; the only source is a FORNAS entry (inj 5%) whose restriction is for burns. The model copied that restriction text into duration/note."),
    ("mixed_id_en-13", "Tenofovir disoproksil fumarat"): ("B", False, "Verifies when the diagnosis bundle is added: a passage there names tenofovir, HIV and 300 mg. The targeted gate only reads the therapy bundle."),
    ("mixed_id_en-13", "Efavirenz"): ("D", False, "IDI 2017 'Efavirenz (EFV) 600 mg sekali sehari' and FORNAS KDT carry the dose but say ODHA/antiretroviral, not HIV, so the diagnosis-word check rejects them."),
    ("typos-11", "Deferasiroks"): ("E", True, "Weight-based chelation (note: 25 mg/kgBB/day); 250 mg is a tablet strength. No weight in the case; no thalassemia passage gives a fixed dose."),
    ("typos-11", "Deferipron"): ("E", True, "FORNAS: tab 500 mg, 50-75 mg/kgBB/day, start by a haematologist. 500 mg is the tablet strength, not a dose; no weight in the case."),
    ("typos-14", "Adrenalin"): ("H2", True, "Dose '1x'; the concentration is in the note as a ratio (1:10.000), a format the gate does not read. Source: epistaksis note, adrenalin 1:10.000 on cotton."),
    ("typos-14", "Lidokain"): ("H2", True, "Dose '1x'; '2%' is in the note, which the gate keeps because the epistaksis note carries 2%. The concentration still reaches the reader."),
    ("typos-15", "Mupirocin"): ("H2", True, "Dose '2-3x'; the model left out the concentration. Source: mupirosin 2%, 2-3 times a day for 7-10 days."),
    ("typos-15", "Amoxicillin dan asam klavulanat"): ("B", False, "Verifies when the diagnosis bundle is added (impetigo note); the therapy bundle held PERDOSKI pyoderma chunks that do not say impetigo."),
}
rows = {(r["id"], r["drug"], r["dose"]): r for r in json.load(open(".runtime/audit/rows-1011.json", encoding="utf-8"))["rows"] if r["path"] == "targeted" and r["status"] != "verified"}
out = []
for (case_id, drug, dose), r in rows.items():
    category, correct_block, evidence = C[(case_id, drug)]
    out.append({"id": case_id, "traceId": r["traceId"], "diagnosis": r["diagnosis"], "drug": drug, "dose": dose, "route": r["route"], "duration": r["duration"], "note": r["note"],
                "gateStatus": r["status"], "category": category, "gateWasRight": correct_block, "verifiedIfAboutForced": r["verifiedIfAboutForced"], "verifiedWithDxBundle": r["verifiedWithDxBundle"], "evidence": evidence})
json.dump({"source": "MIRA audit log 2026-10-11, 61 targeted therapy replies, gate at 0a708b4e", "rows": out}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
counts = {}
for o in out:
    counts[o["category"]] = counts.get(o["category"], 0) + 1
print(len(out), dict(sorted(counts.items())), "gate right:", sum(o["gateWasRight"] for o in out))
