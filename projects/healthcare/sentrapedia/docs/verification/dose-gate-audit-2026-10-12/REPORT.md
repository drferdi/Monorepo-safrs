# Dose gate audit, phase 2-3 (2026-10-12)

Plan: `docs/plans/active/Audit_actions.md` (main checkout, untracked). Branch `feat/sentrapedia-dify-theoracle`, gate at `0a708b4e`.
Status: **CORRECTIONS APPLIED; DOSE OWNERSHIP RULE IN PLACE (fail-safe); LIVE MEASUREMENT BLOCKED.** Sections 1-4 are the classification as found (gate at `0a708b4e`). Gaffer approved all seven corrections; section 6 lists what was applied and the offline replay after each. The live eval is blocked by OpenRouter credit (HTTP 402), not by the gate.

## 1. Data and method

- **Live baseline failed twice** (paid, about $0.29 in total). Run 1: 18/61 cases ok; run 2: 12/61 (`live-attempt-2-targeted.*`). In both, the MIRA API-error breaker opened after consecutive provider errors and paused model calls for 60 s; the rest of the run failed in 1-3 ms (`API_ERRORS` 503, then `SERVICE` 502). The breaker also counts failed parallel copies of a request that succeeded. The provider error type is not logged (`engine.py` keeps only the exception class name in a swallowed `StepFailed`). The same eval ran 61/61 on 2026-10-11. Gaffer chose to continue offline.
- **Offline replay** (`.runtime/audit/`, git-ignored): `extract.py` takes the 122 eval replies from `audit-2026-10-11.jsonl` with the bundle sent to each call; `replay.test.ts` runs the HEAD `gateTherapy` on them. It reproduces the PIPELINE-REPORT counts exactly: **42 verified on both paths** (legacy 42 / 14 dose removed / 9 removed; targeted 42 / 27 / 2).
- Per drug the replay also runs the gate (a) with every passage forced "about" the diagnosis and (b) with the diagnosis bundle added to the therapy bundle. `corpus_scan.py` then searches all 20,465 TheOracle chunks for passages naming the drug and the diagnosis. Each row was read by hand: `classification-targeted.json`.
- The plan's baseline (39 verified / 30 without dose) predates later gate commits. On the same replies the targeted path now has 42 verified, 27 drugs with the dose removed, and 2 drugs removed (29 non-verified).

## 2. The 29 non-verified targeted drugs

| Cat. | Meaning | n | Gate right? | Rows |
|---|---|---:|---|---|
| A | Source genuinely has no dose | 5 | yes | H1 antihistamine class (urticaria), parasetamol (varicella), losion kalamin, ceramide, ambroxol (COPD) |
| B | Dose exists, retrieval did not bring it | 3 | **no** | metformin 500 mg (PAPDI 2024 chunk not retrieved); tenofovir 300 mg and amoxicillin-clavulanate (verify with the diagnosis bundle, which the targeted gate does not read) |
| C | Retrieved, parsing failed | 0 | - | - |
| D | Parsed, validation rejected a correct dose | 6 | **no** | betahistin 6 mg x2, sertralin 25 mg, diazepam 2 mg (single value inside a source range "6-12 mg", "25-50 mg", "2-5 mg"); efavirenz 600 mg (passage says ODHA/antiretroviral, not HIV); chlorpheniramine (spelling, below) |
| E | Needs patient context | 2 | yes | deferasiroks 250 mg, deferipron 500 mg: tablet strengths for weight-based chelation, no weight in the case |
| F | Indication unsupported | 1 | yes | flukonazol 50 mg for pityriasis versicolor, from an azole list for other mycoses |
| G | Specialist or individualized | 1 | yes | albumin in sepsis; duration and note copied from a FORNAS burns restriction |
| H1 | Model wrote a regimen the source does not state | 6 | yes | diosmin/hesperidin x4 (one tablet's content written as the dose; source: 3 x 2 tablet), amoksisilin 2 x 250 mg for OMA (source: 3 x 500 mg adult or 80-90 mg/kgBB/day child), prednisone 30 mg up to 2 weeks for COPD (sources: 40 mg/day for 5 days) |
| H2 | Model wrote no amount ("1x", "2-3x") although the source states one | 5 | yes (nothing to verify) | salbutamol, aminofilin (COPD), adrenalin 1:10.000, lidokain 2% (in the note), mupirosin (2% omitted) |

**20 of 29 are correct blocks; 9 (B 3, D 6) are correct doses the pipeline failed to show.**

Confirmed defect, not in the plan: `spell()` in `theoracle-evidence-gate.ts` turns "ch" into "kh", so English names never match Indonesian ones: chlorpheniramine -> `khlorfeniramin` vs `klorfeniramin` (also chloramphenicol, chlorhexidine, hydrochlorothiazide). The drug is removed as "no passage names it".

Secondary finding: haemorrhoids are coded I84.9 with the English label, while the catalog lists hemoroid under K64, so no hemoroid passage counts as "about" the diagnosis. It made no difference here (the tablet-content rule already blocks the four rows), but it would block a correct dose.

## 3. Phase 3: the 42 verified targeted doses

Every verified number occurs in a passage that names the drug and the diagnosis. A check of all 84 verified rows (both paths) for the strength within 110 characters after the drug name flagged 11; reading them leaves **one unsupported dose**:

0. **A strength of another drug in the same passage verifies the dose.** Lamivudin 1 x 300 mg (HIV, targeted) is verified by FORNAS KDT passages where 300 mg belongs to zidovudin and lamivudin is 150 mg. 300 mg once daily is a usual adult dose, but the cited evidence does not support it, and the same rule would verify a wrong number. The other 10 flags are spelling (Paracetamol/parasetamol, Ofloxacin, Hydrocortisone, Pyrazinamide) or table layouts where the number sits in the drug's own row (TB weight bands, renal table).

The other weaknesses are of the design, not of the regex:

1. **A concentration counts as a dose.** budesonid "0.25 mg/mL" for asthma (FORNAS nebule strength), with no amount per administration.
2. **A formulation strength counts as a regimen.** FORNAS lists verify olanzapin 5 mg, fosfomisin 3 g, timolol 0.25%; the numbers fit usual doses here, but the cited text is a strength list.
3. **Frequency and duration in `dose` are not checked.** kloramfenikol "1x1 tetes" verifies against "1 tetes setiap 2-4 jam".
4. **Population and context are not checked.** Isoniazid 300 mg and pirazinamid 1.5 g cite renal-impairment and MDR weight-band tables; asiklovir 4 x 20 mg/kgBB is the child form for a case without an age.

## 4. Proposed corrections (none applied; each needs Gaffer's go)

| # | Change | Target | Expected effect on the replay | Risk |
|---|---|---|---|---|
| 1 | `spell`: "ch" -> "k" before the "c" rules | gate | chlorpheniramine removed -> dose removed (its 3 x 4 mg chunk was not retrieved) | Low |
| 2 | Targeted gate reads therapy bundle + diagnosis bundle | gateway, gate call only | +2 verified (tenofovir, amoxicillin-clavulanate) | Low: same passage rules |
| 3 | A single model strength inside a source range verifies, when the range is one strength occurrence with the same unit and per-kg status (not a "6" and a "mg" found apart). Open: whether a narrower model range ("6-8 mg" vs "6-12 mg") verifies when both ends fall inside | gate | +4 verified (betahistin x2, sertralin, diazepam) | Medium: needs tests that a range in another clause or for another drug does not count |
| 4 | Diagnosis synonyms (ODHA = HIV; hemoroid = haemorrhoids, I84 = K64) | gate | +1 (efavirenz) | Medium: a word list to maintain |
| 5 | Therapy prompt: `dose` must hold the amount or concentration | MIRA prompt (pinned in `SOURCE.json`) | Fewer H2 rows on new replies; no replay effect | Medium: engine change, live eval needed |
| 6 | Breaker counts one failure per request, not per parallel copy; log the provider error type | MIRA engine | Unblocks the live eval | Low-medium: engine change |
| 7 | A strength verifies only from the drug's own clause or table row, not from anywhere in the passage | gate | Lamivudin 300 mg -> dose removed; other effects unknown until replayed | Medium: tables and lists need care |

Projection, not measurement: changes 1-3 would take the targeted replay from 42 to about 48 verified. Only change 2 is measured (+2: these rows verify when the diagnosis bundle is added). Changes 1 and 3 are inferred from the forced-about test and the corpus check, and each will be measured by replaying the same 122 replies before it is committed, as earlier gate changes were. That offline replay is the before/after for the gate changes; a live run waits for change 6. Retrieval for metformin (B) and the design limits in section 3 need a separate decision.

The harness scripts are copied to `harness/` (`replay.test.ts.txt` is renamed so `npm test` does not collect it).

## 5. Not done

- Phase 2 live reproduction and the live after-measurement: blocked by OpenRouter credit (section 6).
- Phase 4, the 10-disease external benchmark: section 7.
- Phase 6: no new measurement. The 2026-10-11 report already attributes the latency rise to the second MIRA call (`mira_tx` p50 about 2.0 s); today's partial runs agree (p50 4.7 s).

## 6. Corrections applied (2026-10-12)

Each change was written test-first, then replayed on the same 122 replies (`.runtime/audit/items-1011.json`), and committed only when the replay showed no wrong-disease or wrong-drug verification. Two Opus reviews (of the first five gate commits, then of `d6e0768a`) found range and window leaks, which were fixed in `d6e0768a` and `ee5bc240`.

| # | Commit | Change |
|---|---|---|
| 1 | `27b7f108` | `spell`: English "ch" reads as Indonesian "k" (chlorpheniramine = klorfeniramin) |
| 2 | `86a8cec7` | Targeted gate reads therapy and diagnosis passages, each once (`gateEvidence`, in gateway, client and presentation) |
| 7 | `5e31f714` | A strength verifies only the drug it follows, inside the drug's own item (lettered item, bullet, dash) |
| 3 | `604e286c` | A single model strength verifies inside a source range of the same unit and per-kg form |
| 4 | `f3966c0f` | ODHA = HIV; ICD-10 2010 I84 = catalog K64 (hemoroid) |
| 6 | `12efd483` | MIRA breaker counts a failed part once, not each failed parallel copy; the provider error type and HTTP status are logged |
| 5 | `4d902a4d` | Fast therapy prompt: every dose states its amount or concentration, never a frequency alone; tablet count, not tablet content |
| review | `d6e0768a` | "0,125" is a decimal, not thousands; a "juta" multiplier covers both ends or none; a range counts only as the drug's own first strength; the window anchors after the full name; "B." cuts, "2 g." does not |
| review 2 | `ee5bc240` | Window also ends at a ";" / "," / sentence end whose next word is not a population, phase, form, route or timing word; the window opens after the first name word only where the clause holds the other name words (salt-first "natrium diklofenak" doses, "; natrium bikarbonat" does not); a daily total ("mg/hari", "sehari", "/24 jam") does not verify each of several doses unless the source writes its own frequency before it |
| review 3 | `16e83955` | Rule inverted: after a cut point (";", ",", newline, sentence end, "+", or "/" right after a unit before a non-unit word) every word up to the next strength must be a known population, phase, form, route, timing, function or salt word, a FORNAS form abbreviation, or the drug's own name, else the window ends (fails safe). A "+" partner is masked, not cut, so a combination's shared tablet count still reads. The window ends at the drug's next mention. The model frequency is read as 3x, 3 kali or x 3; a source frequency before a daily total must be 2 or more; "dosis harian", "sehari 1 mg" and "dibagi/terbagi" count as daily |

Replay, verified drugs (legacy / targeted), same 122 replies:

| Gate | Legacy | Targeted |
|---|---:|---:|
| `0a708b4e` (sections 1-4) | 42 | 42 |
| after 1-4, 7 and the first review fixes (`d6e0768a`) | 49 | 49 |
| after review 2 (`ee5bc240`) | 49 | 48 |
| after review 3 (`16e83955`) | 49 | 48 |
| drug-name lexicon (`2327700f`) | 49 | 48 |
| per-strength ownership rule (`ea2fe8f8`, `ae480804`, review-7 fixes) | 48 | 48 |

The one drop at `ee5bc240` is a correct block: amoxicillin-clavulanate 3x250-500mg for impetigo had been verified by the impetigo note's "Kloksasilin/Dikloksasilin 4 x 250-500 mg" (another drug's range). PERDOSKI states "Amoksisilin dan asam klavulanat: dewasa 3x250-500 mg/hari", but those chunks do not name impetigo, so they are not "about" the diagnosis. Lamivudin 1 x 300 mg (section 3, item 0) is now dose-removed. Gate tests: 91 (`tests/theoracle-evidence-gate.test.ts`); the 7 test files that use the gate: 181/181; MIRA tests 180 passed, 1 skipped.

Fail-safe limits kept on purpose (dose blanked, never wrong): a strength before the drug name; "600.000 - 1,2 juta IU" (multiplier on one end); "omeprazol untuk H. pylori 20 mg" (the capital "H." reads as an item letter); FORNAS rows whose restriction text has a sentence end before the next numbered form (budesonid 0,25 mg/mL keeps its PAPDI citation only); a "+" partner mask that also covers the first drug's own strength ("DHA + Piperakuin (DHP) tiap tablet mengandung 40 mg ...", still verified from another passage). Residual open (the known limit of a word-list window): two drugs with no cut point between them, such as "X 500 mg dan Y 400 mg" or "Karbogliserin / Gliserin 10% ... 3 x 2-3 tetes" (this one shares a dose on purpose), and "1,250-2,500 mg" read as thousands (the exact path shares that ambiguity). Section 3 items 1-4 (concentration as dose, strength list as regimen, frequency and duration unchecked, population unchecked) are unchanged.

**Review 4 (`16e83955`): FIX, circuit breaker reached.** The word-list rule closed every earlier input, but the reviewer found three leak categories that a word list cannot close:
- slash-positional combinations ("tenofovir/lamivudin/efavirenz 300/300/600 mg" verifies tenofovir 600 mg; "zidovudin 300 mg/150 mg lamivudin" verifies zidovudin 150 mg);
- a model-written combined name ("Parasetamol/Ibuprofen" 3x400mg verifies from "parasetamol 500 mg; ibuprofen 400 mg", because "ibuprofen" counts as the drug's own name);
- a "+" partner with two strengths ("Diosmin 450 mg + Hesperidin 50 mg atau 100 mg" verifies diosmin 100 mg).

It also found fixable leaks: "(", "atau", "dan" not being cut points ("kotrimoksazol 2 x 480 mg (trimetoprim 80 mg)", "parasetamol 500 mg atau ibuprofen 400 mg"); natrium and kalium in the allowed list; and "tiap 8 jam", "dalam 24 jam" and "/hr" not being read. Indication words ("untuk pasien rawat inap", "nyeri ringan-sedang") blank correct doses, which is an open-ended tail. Gaffer chose a drug-name lexicon.

**Lexicon (`2327700f`) and review 5: FIX, circuit breaker reached again.** `src/lib/theoracle-drug-words.json` (837 words from PNPK, PPK and FORNAS names; `scripts/build-drug-words.mjs`) ends a window at another drug's name followed by a strength. Slash-group numbers are never read alone, partners after "+", "atau", "dan" and "serta" are masked, and "(", "atau", "dan" and "serta" became cut points. The test suite went to 89, and the replay stayed at legacy 49 / targeted 48. Review 5 closed every earlier input but found three new categories:
- the window is fail-open wherever the lexicon misses a name (metformin, glibenklamid, simvastatin, lamivudin, zidovudin, INH, ambroksol and others), before the first strength and at connectors such as "dengan";
- drugs named only by salt words ("kalsium glukonat 1 g" verifies magnesium sulfat 1 g);
- slash alternatives with different doses read as aliases ("isosorbid dinitrat/nitrogliserin 0,4 mg").

Fixable items: an "atau" partner's own count ("salbutamol 2 puff atau ipratropium 4 puff"), and "q8h", "tid" and "bid" not read as several doses. The design question went back to Gaffer.

**Per-strength ownership rule (`ea2fe8f8`, reviews 6 and 7, fixes in `ae480804` and the commit after it).** Gaffer chose a fail-safe rule, which replaces the cut points, masks and lexicon. Inside a drug's window, a strength counts only when the last name-like word before it is the drug's own. Any other word marks the strengths that follow as another drug's until the drug is named again. A word counts as name-like unless it is a known population, phase, form, route, timing, function, unit, salt or symptom word. So an unknown or unlisted name fails safe, whatever any list holds.

The exceptions are:
- an alias bracket that holds only known words, the drug's own name or short capitals ("(EFV)", "(CTM)");
- a FORNAS form reset, only in FORNAS passages: form "1." before the entry's first strength, or the next form number, and not after a new numbered entry;
- a count per administration after a ")" that closes a group opened before the name ("(Diosmin 450 mg + Hesperidin 50 mg) 3 x 2 tablet").

A model-written combination's other name, after a strength or a separator, belongs to that partner. Only name words of four or more letters count as the drug's own, and a vitamin's letter code is its name. Column tables ("Parasetamol Ibuprofen 500 mg 400 mg") are not read.

Review 6 closed every review-5 leak, and its findings were fixed in `ae480804`. Review 7 confirmed the review-6 rows closed and found only class-A items: a connector or "dosis anak" before an alias bracket, "dan" not separating a partner, the case and position of vitamin codes, pipe tables, and two fail-safe regressions. Those were fixed in the next commit, which has not had its own review. Replay: legacy 48, targeted 48. The two blanks against the 49/49 baseline:
- impetigo amoxicillin-clavulanate: another drug's range, a correct block;
- legacy isoniazid 300 mg: its only source is an MDR weight-band table "Isoniazid DT 300 mg **450 mg", where "DT" is unknown and 300 mg is one band. It fails safe.

Budesonid regains its FORNAS citation.

Fail-safe blanks by design:
- a slash alternative ("Kloksasilin/Dikloksasilin 4 x 250-500 mg");
- a bracket naming another drug ("seftriakson (diberikan bila alergi penisilin) 2 g");
- indication words that are not on the known list ("bila demam 500 mg");
- a strength written before the drug name.

Accepted residuals:
- FORNAS restriction prose that names another drug before the entry's first form, with no entry number ("amoksisilin. Alternatif: eritromisin. 1. tab 250 mg");
- "(ipratropium atau salbutamol 2 puff) 4 puff" read as the group's count;
- FORNAS form k+1 after another drug's name in garbled text ("zidovudin 1. tab 300 mg. lamivudin 2. tab 150 mg").

The rule also blanks one more correct form on purpose: "amoksisilin dan asam klavulanat: dewasa 3x250-500 mg/hari" for a model "Amoxicillin clavulanate", because "X dan Y <dose>" can be Y's dose.

**Live eval.** A third live run after the fixes (`live-after-targeted.*`) reached 8/61 cases (8 verified, 2 dose removed among them; $0.07). The new engine logging shows the cause of all three failed runs: the model provider returned `APIStatusError 402` (OpenRouter credit exhausted). The rate-limit reading in section 1 was wrong; the breaker fix (change 6) stands, because failed parallel copies of a part that succeeded used to count toward the 3 consecutive failures that pause model calls for 60 s. The live before/after, and the effect of change 5 (prompt), wait for Gaffer to top up the OpenRouter credit.

## 7. Phase 4: the 10-disease benchmark against external sources

Local half (`.runtime/audit/phase4_corpus.py`): every disease has a dedicated Gaffer-approved document in `theoracle/sources/tatalaksana/` (added in `8ca134f1`, 2026-10-11) and at least one disease note. External half: two research agents, capped at 5 fetched pages each by Jev, read the Kemenkes PNPK PDFs for asphyxia, impacted tooth, osteosarcoma and Hirschsprung in full, IDSA/SIS 2010 in full, and the rest from search snippets. The PPK FKTP (KMK 1186/2022) did not load (DNS failure, 404). Dose claims below quote the source.

| Disease | Local document | External reference | Verdict |
|---|---|---|---|
| Neonatal asphyxia | Epinefrin 0,01-0,03 mg/kg IV/UVC/IO for HR <60 after effective ventilation and compressions, repeat every 3-5 min; PPV 40-60/min; 3:1 | PNPK KMK 214/2019: "Epinefrin 1:10.000 ... intravena atau intraoseus ... 0,1-0,3 mL/kgBB (0,01-0,03 mg/kgBB)"; ETT when IV/IO unavailable 0,5-1 mL/kgBB (0,05-0,1 mg/kgBB); volume 10 mL/kgBB over 5-10 min; ILCOR 2020 agrees | **Dose correct.** Missing: the 1:10.000 concentration and mL/kg, the ETT dose, the volume bolus, initial O2 21-30% below 35 weeks, therapeutic hypothermia referral |
| Epistaxis | Compression 10-15 min; oxymetazoline 0,05% 1-2 sprays; TXA topical "500 mg/5 mL" example | AAO-HNS 2020 (snippets): compression >=5 min, packing, resorbable packing on anticoagulants; **no drug dose found** | Procedures agree. **Oxymetazoline and TXA doses unverified** (cited to AAO-HNS, which showed none); needs the PPK FKTP |
| Impacted tooth | Ibuprofen 400 mg q6-8h; parasetamol 500-1.000 mg q6-8h, max 3 g/day; amoksisilin 500 mg q8h only with odontogenic infection | PNPK KMK 777/2022: **no systemic doses**; antibiotics by local pattern, WHO ladder; local anaesthetic maxima (lidokain 2% + epinefrin 7 mg/kgBB) | Doses consistent with ADA dental guidance, not with the PNPK (which has none). Missing: local anaesthetic maxima; general-dentist scope (class 1A only) |
| Intra-abdominal infection | Seftriakson 2 g IV q24h + metronidazol 500 mg q8-12h; pip-tazo 3,375 g q6h (4,5 g q6h severe); meropenem 1 g q8h; about 4 days after source control | IDSA/SIS 2010: ceftriaxone 1-2 g q12-24h, metronidazole 500 mg q8-12h, pip-tazo 3.375 g q6h; SIS 2017: <=4 days with source control | **Doses within the guideline.** Pip-tazo 4,5 g and meropenem not checked. Missing: pediatric doses (ceftriaxone 50-75 mg/kg/day, metronidazole 30-40 mg/kg/day) |
| Osteosarcoma | MAP agents named, no doses; refer all suspected cases | PNPK KMK 88/2019: specialist multidisciplinary; WHO pain ladder, no numeric doses | **Agrees** (no executable chemotherapy). Missing: WHO ladder pain guidance |
| Hirschsprung | NaCl 0,9% rectal irrigation 1-3x/day; metronidazol pediatric by weight and hospital protocol | PNPK KMK 474/2017: irrigation "NaCl 0.9% 10-20 cc/kgBB"; HAEC with sepsis: ampisilin, gentamisin, metronidazol, no doses; prophylactic antibiotics not recommended | Agrees; **no dose to verify.** Missing: irrigation volume 10-20 mL/kgBB; the HAEC triple regimen; no prophylaxis |
| Pterygium | CMC 0,5% and hypromellose 0,3%, 1-2 drops as needed; steroid only by an ophthalmologist | NHS leaflet, BMJ BP (snippets): lubricants; steroid under ophthalmologist supervision; IOP risk | Agrees. Tear doses are label-level, unverified |
| Pulpal / periradicular | Ibuprofen 400 mg q6-8h; parasetamol 500-1.000 mg q6-8h; amoksisilin 500 mg q8h 3-7 days for systemic involvement | ADA 2019: no antibiotics for irreversible pulpitis; amoxicillin 500 mg TID 3-7 days when indicated; ADA 2024: ibuprofen 400 mg +- acetaminophen 500 mg | **Doses agree** |
| Sarcopenia | Protein 1,0-1,5 g/kg/day; no routine drug; vitamin D if deficient | AWGS 2019 diagnosis; Singapore CPG: resistance exercise, protein >=1,0 g/kg/day, vitamin D if <30 ug/L | Agrees |
| Cerumen impaction | Carbamide peroxide 6,5% 5-10 drops twice daily up to 4 days, over 12 years; irrigation contraindications | AAO-HNS 2017 (snippets): cerumenolytics, no drop counts; OTC label: same carbamide peroxide dose; MSD adds anticoagulants, immunocompromise, diabetes, prior radiation, canal stenosis | **Dose agrees with the label.** Contraindication list shorter than MSD's. The karbogliserin 10% 3 x 2-3 tetes in the other corpus notes is from the PPK FKTP, which did not load |

**No wrong dose was found in the 10 documents.** Six coverage gaps are listed above (asphyxia ETT dose and concentration, Hirschsprung irrigation volume, intra-abdominal pediatric doses, impaction anaesthetic maxima, osteosarcoma pain ladder, cerumen contraindications) and three doses are unverified (oxymetazoline, topical TXA, pip-tazo 4,5 g / meropenem). Changing the documents is a clinical content decision for Gaffer; nothing was edited.

