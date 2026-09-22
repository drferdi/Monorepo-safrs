# SENTRA-BRANDING v1.0

Production package for **Sentra Artificial Intelligence**.

## Status
- Master logomark geometry: **APPROVED source, vector-derived production master**
- Core colors: **APPROVED**
- Typeface: **APPROVED - Archivo** (+ JetBrains Mono), changed from Geist on 2026-09-22 by Chief
- Lockup spacing and text-bearing source files: **REVIEW** until visually signed off after rendering with Archivo.

## Start here
1. `00-brand-strategy/brand_foundation.md`
2. `01-logo-master/` for source-of-truth symbol files
3. `10-brand-guidelines/sentra-brand-guidelines-v1.pdf`
4. `10-brand-guidelines/sentra-brand-asset-index.csv`

## Important
- Do not regenerate or redraw the approved mark.
- Font files are not bundled. Archivo and JetBrains Mono (SIL OFL 1.1) are vendored in `packages/token/assets/fonts/`.
- Text-bearing SVGs intentionally keep live `Archivo` text for correct future outlining/export.
- Platform PNG exports (website, social, app, favicon, preview boards) carry the logomark only, no wordmark text, so the typeface change does not affect them.
- The three raster lockups in `00-master-logo/` (`sentra-ai-logo-horizontal`, `sentra-ai-logo-vertical-stacked`, `sentra-artificial-intelligence-logo-horizontal`) were re-set in Archivo on 2026-09-22 (Chief's decision): the approved mark pixels are unchanged, only the wordmark lettering was replaced at the same position, cap height and width. The previous versions are in `12-archive/00-master-logo-geist-lettering/`.
- `10-brand-guidelines/sentra-brand-guidelines-v1.pdf` re-set in Archivo and JetBrains Mono on 2026-09-22; layout, colour and imagery unchanged.
- Platform export sizes were verified on 2026-08-15; re-check platform guidance for future releases.
