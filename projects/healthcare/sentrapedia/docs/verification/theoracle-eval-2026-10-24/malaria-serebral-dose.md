# Cerebral malaria pre-referral dose: the open item is a mis-attribution (2026-10-24)

Read-only. The SSOT was not touched, the index was not rebuilt, no benchmark or eval was run.

> **Decision (Gaffer, 2026-10-24): option A.** SP0194 is left as it is and the open item is
> closed as a mis-attribution, not as a dose decision. No SSOT change, so the index,
> benchmark and eval all stand. Option D (SP0193 row 78's short quote) was not decided and
> stays open.

## Finding

The open item recorded in HANDOFF — "PPK IDI 2017 gives a pre-referral dose of 3,2 mg/kg
[for cerebral malaria], which is the artemether dose" — is attributed to the wrong chapter.
PPK IDI 2017 chapter H.6 "Malaria Serebral" (contents: p. 197; text pp. 197–198) names no
drug and no dose. Its whole Penatalaksanaan is airway, oxygen, supportive fluids, refer:

> Semua pasien yang didiagnosis dengan malaria serebral harus dipastikan jalan nafas lancar
> dan pernafasan dibantu dengan oksigen, setelah penatalaksanaan suportif seperti pemberian
> cairan agar segera dirujuk ke fasilitas layanan kesehatan sekunder

SP0194 already carries that text verbatim from `kmk_1186_2022 (hal. 350)`, with `dosis: []`
and `status.terapi: "narasi_tanpa_dosis"`. The entry is faithful to its source, and the
source is deliberately dose-free: the competency is SKDI 3B, refer rather than treat.

The 3,2 mg/kg line belongs to the **Malaria** chapter, in its Kriteria Rujukan, and it is
already in SP0193's `rujukan` field (not in any `terapi_teks`):

> b. Malaria berat, namun pasien harus terlebih dahulu diberi dosis awal **Artemisinin atau**
> Artesunat per Intra Muskular atau Intra Vena dengan dosis awal 3,2mg /kg BB.

So the question waiting for Gaffer is not which dose to use, but whether SP0194 should carry
a dose borrowed from another entry — and the recorded SSOT rule, that an entry counts only
for its own disease, already answers that.

The correct pre-referral regimen is in the SSOT where it belongs. PNPK 2019, via SP0193's
`pnpk_PNPK_2019_Tata_Laksana_Malaria` therapy text: severe malaria at a puskesmas gets
artesunate IV or IM as the initial dose before referral, bolus **2,4 mg/kgBB i.v. at hours
0, 12 and 24**, then 2,4 mg/kgBB every 24 h until the patient can take oral drugs.

## Second finding: SP0193 dose row 78 quotes its source short

| field | current value |
| --- | --- |
| `obat` | `Artesunat` |
| `dosis` | `3,2mg /kg BB` |
| `kutipan` | `Artesunat per Intra Muskular atau Intra Vena dengan dosis awal 3,2mg /kg BB.` |
| `konteks` | `dosis awal sebelum rujukan malaria berat; catatan klinis: 3,2 mg/kgBB adalah dosis awal artemether; dosis artesunat 2,4 mg/kgBB IV/IM. Teks pedoman dikutip apa adanya` |
| `sumber` / `halaman` | `PPK FKTP (IDI2017)` / `42` |

The `kutipan` drops **"Artemisinin atau"**. That is not cosmetic: with those two words back,
the guideline sentence is coherent, because 3,2 mg/kg is artemether's loading dose and
artemether is an artemisinin derivative. The real defect is collapsing two alternatives
("Artemisinin atau Artesunat") into one drug name (`Artesunat`) while keeping the dose that
belongs to the first. The clinical note Gaffer decided on 2026-10-24 stays correct and
useful; what is open is whether the quote is restored so a reader can see where 3,2 mg/kg
comes from.

Provenance, confirming a known class rather than a new one: `sumber` says PPK IDI 2017 but
`halaman: 42` falls inside KMK 1186/2022's malaria chapter (pp. 39–44, management p. 41),
while PPK IDI 2017's malaria chapter starts at p. 21 and carries this sentence on p. 23.
This is one of the "81 quotes from other PDF editions" already recorded. What was actually
checked: the PPK IDI 2017 text and SP0193's `rujukan` field carry the sentence identically,
including "Artemisinin atau". KMK's own copy of this sentence is not in the index, so
whether KMK also says "Artemisinin atau" is unverified — and that is the one soft spot under
option D below. If KMK dropped those words too, row 78 may be a faithful KMK quote carrying
an IDI label, not a truncation.

## Options

- **A — change nothing in SP0194 and close the open item.** Recommended. The source chapter
  is dose-free by design and the entry is faithful. The item closes as a mis-attribution,
  not as a dose decision.
- **B — add `terkait: ["SP0193"]` to SP0194.** Gives a cerebral-malaria reader a route to the
  Malaria entry, where the severe-malaria pre-referral regimen lives. Navigation, not
  clinical content: no new dose is rendered in SP0194. Still Gaffer's call, because it
  changes what a clinician sees.
- **C — copy the dose row into SP0194.** Not recommended: it breaks the one-entry-one-disease
  rule and would carry the artemisinin/artesunate collapse into a second entry.
- **D — separate decision on SP0193 row 78** (verification below): restore `kutipan` to the full sentence, and
  decide whether `obat` stays `Artesunat` or becomes `Artemisinin atau Artesunat`. The
  reason this is worth deciding now is that the entry already contradicts itself on screen:
  the rendered Rujukan section reads "Artemisinin atau Artesunat … 3,2mg /kg BB" while the
  dose line further down reads "Artesunat 3,2mg /kg BB". Caveat from the provenance note:
  the full sentence is verified in PPK IDI 2017, not in KMK, so settle the label before
  rewording `obat`. This touches rendered clinical content, so it needs Gaffer's own word.

## Option D, verified (2026-10-24, after Gaffer asked to take D further)

**The label question is settled: KMK cannot confirm or deny the wording.** `fktp-kmk-2022.pdf`
is in the index (613 chunks) but its copy does not include the malaria chapter at all — only
six chunks mention malaria, and they belong to the TB, leprosy and antenatal chapters. So
KMK's own phrasing of the Kriteria Rujukan sentence is not checkable from this library. The
sentence is verified in PPK IDI 2017 (p. 23 of the PDF's own numbering; the malaria chapter
opens at p. 21) and it is held in full in SP0193's `rujukan` field.

**`kutipan` is not a quote of a different source — row 78 was windowed.** Across the
auto-extracted rows, `kutipan` is plainly a window around the drug-name hit, cut at both
ends and sometimes mid-word ("Dosis kina = 10 mg/kgBB/kali (3x/hr", "1) Lini 2 menggunakan
Kina HCl 25 % : Pemberian I loading"), and those rows carry `catatan: "... cek kutipan."` for
exactly that reason. But the curated `PPK FKTP (IDI2017)` block that row 78 belongs to
(rows 67, 72, 73, 75, 76) quotes **whole sentences** — e.g. "Kina + Primakuin. Dosis kina =
10 mg/kgBB/kali (3x/hari selama 7 hari), Primakuin = 0,25 mg/kgBB (selama 14 hari)." Row 78
is the one member of that block whose quote starts mid-sentence, dropping "Malaria berat,
namun pasien harus terlebih dahulu diberi dosis awal Artemisinin atau". Restoring it is a
consistency fix inside its own block, not a deviation from how quotes are stored elsewhere.

**So D reduces to one real defect.** `obat` is `Artesunat`, which names the second of the two
alternatives the guideline offers while carrying the dose that belongs to the first. What a
clinician sees today is the contradiction: the rendered `## Rujukan` section says "Artemisinin
atau Artesunat ... 3,2mg /kg BB" and the dose line below it says "Artesunat 3,2mg /kg BB".

| variant | `obat` | note |
| --- | --- | --- |
| **D-obat** (recommended) | `Artemisinin atau Artesunat` | Faithful to the two-alternative sentence; the existing `konteks` already tells the reader 3,2 mg/kgBB is artemether's initial dose and artesunat's is 2,4 mg/kgBB IV/IM. Resolves the on-screen contradiction. |
| **D-keep** | `Artesunat` | Nothing changes, no rebuild. The contradiction stays on screen. |

Splitting row 78 into an artemether row and an artesunat row is deliberately not offered:
2,4 mg/kgBB does not appear in this sentence, it comes from the PNPK text, so a split would
invent structure the source does not have.

`sumber` and `halaman` are left alone under D. Rows 67–78 all carry the `PPK FKTP (IDI2017)`
label with pages 41–42, which are KMK's page numbers; correcting row 78 alone would make the
block inconsistent, and the pairing already sits in the recorded "81 quotes from other PDF
editions" bucket.

**Cost of choosing D-obat.** Row 78 is rendered into the chunk text, so one field change means
a chunk rebuild, a new index hash, the full gate, and a benchmark — and, by the pattern of the
other dose changes, a paid eval of about 0.32 USD. For one field. If it is taken, it is worth
bundling with the 335 rows held back in `dose-audit-candidates-3.json` so the rebuild and the
eval are paid once.
