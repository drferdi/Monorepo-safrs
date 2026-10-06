# Changelog

All notable changes to MedBoard are recorded here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/) through the `version` field in `package.json`.

## [Unreleased]

### Added

- Sentrapedia, a clinical reference for 144 Puskesmas conditions in 14 categories, replacing
  Critical Mind (`/critical-mind` now redirects to `/sentrapedia`).
- Sentrapedia contributions: staff propose new text for a disease section at
  `/sentrapedia/kontribusi`, an AI review checks it, and an administrator approves or rejects it
  in Admin → Kontribusi Sentrapedia. Approved text replaces the original section.
- Consult Audrey in a new layout: Audrey on a stage that follows the voice session (idle,
  thinking, responding), the consultation stream beside her, and a motion switch that also
  respects the system's reduced-motion setting.
- Standard repository files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, this changelog,
  `.editorconfig`, `.gitattributes`, `.nvmrc` and `.github/CODEOWNERS`; `docs/FEATURES.md` holds
  the detailed feature descriptions.

### Changed

- Product names in the navigation and page titles: Intelligence EMR, MedLink, ICD Coding,
  Algorithma Calculator, Sentrapedia and Sentra Social.
- One design system across every page: white theme with Oxford Blue and red-orange, IBM Plex
  Sans, sentence-case text without all-caps, black neumorphic buttons at one 13 px text size, and
  every icon from Lucide.
- Gender in the EMR is chosen by symbol (♂ / ♀ icons with spoken names).
- The README is rewritten for the current stack (Node.js 24, pnpm, PostgreSQL) and product names;
  documentation is renamed from IntelligenceBoard to MedBoard.
- `.gitignore` is reorganised; local runtime state, generated reports and internal working files
  stay out of the repository.

### Removed

- The engine-retirement notice and developer explainer notes from the EMR screens.
- The fine-tuning pipeline explainer from Consult Audrey.
- Unused code and assets: 20 unused modules, 11 unreferenced public assets (about 5.9 MB,
  including a duplicate ICD-10 file and an unused vector file), stale reference files in
  `database/`, and leftover tool configuration.

## [0.1.0]

- First standalone release of MedBoard (formerly IntelligenceBoard).
