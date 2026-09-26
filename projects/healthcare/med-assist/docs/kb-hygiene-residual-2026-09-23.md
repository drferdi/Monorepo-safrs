# KB Residual Hygiene — 2026-09-23 (post-B76)

**Chief GO:** H1 residual after PR#4 (B76) and PR#7 (H5).  
**Base:** `main` @ `8eee20d`  
**Scope:** surgical `gejala_klinis` only — no new ICD/diseases/regimens.

## Problems addressed

| Symptom | Absurd matcher effect |
| ------- | --------------------- |
| R57 “Lemas dan pusing” | Generik malaise → top-1 hypoglycemia |
| A91 “Lemas… / seluruh badan” | Generik malaise → dengue without fever |
| T75 bare “Pusing” | Generik → motion sickness |
| B68/B20/A15 “Penurunan berat badan” | DM complaint → taenia/HIV/TB in top-N |
| DIS-001/008/032 instructional scrape | Noise / non-clinical tokens |
| D50 “Badan lemah” | `badan` token pollution |

## Change log

| ID | ICD | Nama | Change |
| -- | --- | ---- | ------ |
| DIS-083 | R57 | Hipoglikemia ringan | Drop bare lemas+pusing; keep autonomic clues + mild confusion |
| DIS-092 | A91 | Demam dengue, DHF | Mialgia “generalisata”; “Kelelahan hebat selama demam” |
| DIS-026 | T75 | Mabuk perjalanan | Qualify pusing as travel/motion-related |
| DIS-058 | B68 | Taeniasis | BB phrasing (no `berat badan` token) |
| DIS-003 | B20 | HIV AIDS | BB phrasing |
| DIS-041 | A15 | TB paru | BB phrasing |
| DIS-090 | D50 | Anemia def. besi | “Lemah/lesu” (drop `badan`) |
| DIS-001 | R56 | Kejang demam | Replace instructional anamnesis prose |
| DIS-008 | F45 | Gangguan somatoform | Replace Allo/Auto scrape fragments |
| DIS-032 | R04 | Epistaksis | Replace instructional epistaxis prose |

## Regression

`diagnosis-quality.test.ts` Kasus 4:
- Generik top-1 ≠ R57 / A91 / T75 (and prior ≠ B6x/B7x)
- DM keluhan top-3 ≠ B68
