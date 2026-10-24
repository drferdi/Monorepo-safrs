# Frontend refactor behavior contract

Scope: public website only. Authority: Gaffer's eight-pass plan of 2026-10-23.

Preserve all seven routes (`/`, `/faq/`, `/privasi/`, `/ketentuan/`, `/penafian/`, `/ruang-kerja/`, `/sejarah-sentra/`), fragment identifiers, public asset paths, copy, fonts, colors, breakpoints, script order, contact request shape and existing exported helpers. No dependency, framework, clinical or contact-backend changes.

Preserve hero scene timing and review-before-status sequence; ten capability stops and eight live/two anatomy panels; keyboard navigation; native disclosures; media pause, reduced-motion and static fallbacks. Playback policies remain component-owned.

Before each extraction, record the current output. Build-only changes require identical file paths and SHA-256 for every output file. Runtime extraction may change only the reviewed JavaScript bundles; HTML/CSS/media must remain byte-identical. Never refresh protected presentation hashes to hide a change.

Legacy source formats are not public APIs: only the checked-in live capability fragment format is supported. Retained public media URLs are not removed merely because current markup does not reference them.

Runtime source fragments live under scripts/browser and are assembled by scripts/browser-assets.mjs into the same five public JavaScript entrypoints. Always preview through the build lifecycle. CSS cleanup removes only the unused WordPress emoji rule; output parity reinserts that exact block before comparing the original homepage hash. Protected presentation hashes stay untouched.
