# Glass-shaped workspace — browser evidence (2026-11-04)

Branch `feat/glass-workspace-redesign-2026-11-04`, dev server `next dev -p 3106` with `SENTRAPEDIA_AUTH_MODE=local` (the line was added to `.env.local` for the session and removed afterwards). The encounter "Pilek 3 hari" was seeded into `localStorage` (`sentrapedia-workspace-v2:local-development`) from a stored AADI result built with `aadiMessage()` (Common cold J00, two regimen lines, two guideline passages), so no engine ran. Captured with Playwright (CSS pixels, JPEG q90).

| File | Width | What it shows |
| --- | --- | --- |
| `home--1440.jpg`, `home--1024.jpg`, `home--375.jpg` | 1440 / 1024 / 375 | Home: greeting, headline, environment pill from settings ("Layanan primer"), composer with the chip shortlist (8 chips). |
| `encounter-analysis--1440.jpg` | 1440 | Split layout: chat with the doctor's summary (5 lines) and the "Analisis kasus" card on the left; the document pane on the right with the Glass sections in order (Pembahasan kasus → Kutipan pedoman), the gated regimen (Parasetamol verified, Amoksisilin "Cek dosis obat"). |
| `encounter-chat--1024.jpg`, `encounter-chat--375.jpg` | 1024 / 375 | The same encounter below 1200 px: pane closed, summary and card in the chat, pane button in the header. |
| `encounter-analysis-sheet--1024.jpg`, `encounter-analysis-sheet--375.jpg` | 1024 / 375 | The "Dokumen encounter" sheet with the Ringkasan encounter and Analisis kasus tabs and the same document. |
| `agent-preferences--1440.jpg`, `agent-preferences--1024.jpg`, `agent-preferences--375.jpg` | 1440 / 1024 / 375 | `/agent`: Preferensi tab (name, specialty, environment, language, format, global instruction). |

## axe-core (4.x, tags wcag2a, wcag2aa, wcag21aa, best-practice)

| Page | Width | Violations | Passes |
| --- | --- | --- | --- |
| Encounter with the analysis, pane open | 1440 | 0 | 41 |
| Home (new encounter) | 1440 | 0 | 38 |
| `/agent`, Preferensi | 1440 | 1 → 0 | 37 |
| Encounter, sheet open | 1024 | 0 | 31 |
| Encounter, sheet closed | 375 | 0 | 35 |
| Encounter, sheet open | 375 | 0 | 31 |
| Home | 375 | 0 | 19 |

The one `/agent` finding was `color-contrast` (serious, 4 nodes) on the `.field small` hints over the grey canvas; the page now sits on a white card (`.agent-page` background), and the re-run reports 0. No horizontal overflow at 375 px (`scrollWidth` equals `innerWidth`) on home, the encounter and the sheet.

Checked in the DOM as well: the eight `h3` section titles in Glass's order, `[data-gate]` values `verified` and `doseRemoved`, the pane tab "Analisis kasus" selected, `/agent` tabs Preferensi · Mode dan templat · Pengetahuan, and the Pengetahuan list reading the real manifest (TheOracle, 17.871 chunks, embeddinggemma-300m, index hash, catalogue 0.6-draft).
