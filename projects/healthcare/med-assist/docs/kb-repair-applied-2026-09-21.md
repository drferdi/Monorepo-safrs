# KB Repair Applied — 2026-09-21

Chief GO: apply italic suggestions from `docs/kb-repair-list.md`.
Scope: only `gejala_klinis` and one `nama` (DIS-067). No ICD/kompetensi/terapi changes.

| ID        | ICD   | Nama                               | Fields        |
| --------- | ----- | ---------------------------------- | ------------- |
| `DIS-006` | `G51` | Bells’ palsy                       | gejala_klinis |
| `DIS-028` | `J30` | Rhinitis akut                      | gejala_klinis |
| `DIS-029` | `J30` | Rhinitis vasomotor                 | gejala_klinis |
| `DIS-034` | `A37` | Pertusis                           | gejala_klinis |
| `DIS-039` | `J20` | Bronkitis akut                     | gejala_klinis |
| `DIS-053` | `T47` | Keracunan makanan                  | gejala_klinis |
| `DIS-057` | `B65` | Skistosomiasis                     | gejala_klinis |
| `DIS-090` | `D50` | Anemia defisiensi besi             | gejala_klinis |
| `DIS-103` | `B00` | Herpes simpleks tanpa komplikasi   | gejala_klinis |
| `DIS-132` | `L22` | Napkin eczema                      | gejala_klinis |
| `DIS-133` | `L21` | Dermatitis seboroik                | gejala_klinis |
| `DIS-137` | `L30` | Dermatitis perioral                | gejala_klinis |
| `DIS-067` | `A54` | Uretritis gonore dan nongonore     | nama          |
| `DIS-019` | `H52` | Miopia ringan                      | gejala_klinis |
| `DIS-122` | `B35` | Kandidosis mukokutan ringan        | gejala_klinis |
| `DIS-135` | `L70` | Akne vulgaris ringan               | gejala_klinis |
| `DIS-046` | `P38` | Infeksi pada umbilikus             | gejala_klinis |
| `DIS-062` | `N39` | Infeksi saluran kemih              | gejala_klinis |
| `DIS-068` | `N39` | Infeksi saluran kemih bagian bawah | gejala_klinis |
| `DIS-085` | `E56` | Defisiensi vitamin                 | gejala_klinis |
| `DIS-086` | `E63` | Defisiensi mineral                 | gejala_klinis |
| `DIS-113` | `B35` | Tinea kapitis                      | gejala_klinis |
| `DIS-116` | `B35` | Tinea korporis                     | gejala_klinis |

## Notes

- DIS-067 renamed `nongonore)` → `Uretritis gonore dan nongonore` (💡 in repair list).
- DIS-075 (D52 anemia kehamilan) left unchanged (already structured).
- DIS-085/DIS-086 differentiated from anemia-copy symptoms using repair-list examples.
