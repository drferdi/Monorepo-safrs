# Testing

Run `node --run install:check`, `build`, `lint`, `test`, `verify`, and `deploy:dry-run` from this capsule root. The package uses only built-in Node.js modules. Typecheck is N/A because no TypeScript is included in the capsule runtime or tests.

The local verifier checks the 23 protected presentation files, all local targets, media source/served byte equality, and HTTP MIME/range responses. Browser review covers desktop, 390 px, and 320 px; keyboard navigation and reduced motion are required for any visual change. The contact test's accepted response is mocked and does not establish real delivery.

For standalone proof, copy only this capsule into a fresh temporary directory and rerun the declared lifecycle there. Record commands and exit codes in `migration-report.md`. Root governance is a separate contribution gate, not a capsule runtime dependency.
