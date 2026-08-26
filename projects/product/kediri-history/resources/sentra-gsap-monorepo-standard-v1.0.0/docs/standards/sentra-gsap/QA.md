# Sentra-GSAP QA Contract

## Required gates

Default required gates are:

- GSAP architecture static audit
- typecheck
- lint
- tests
- production build
- browser QA
- independent visual-quality review

`NOT-RUN` is not PASS.

## Standard command

```bash
pnpm sentra:gsap:verify -- --url http://localhost:3000
```

Use the repository's actual package manager when it is not pnpm. The URL may also come from `SENTRA_GSAP_URL` or `sentra-gsap.config.mjs`.

## Evidence output

Runtime evidence is written under `.sentra-gsap/` and is gitignored by the installer:

```text
.sentra-gsap/
├── reports/
│   ├── browser-qa.json
│   ├── sentra-gsap-report.json
│   └── sentra-gsap-report.md
├── screenshots/
└── reviews/
    └── visual-review.json
```

## PASS statement

A legitimate completion report should be concise:

```text
SENTRA-GSAP QUALITY GATE
Architecture       PASS
Typecheck          PASS
Lint               PASS
Tests              PASS
Build              PASS
Browser QA         PASS
Visual Review      PASS
Overall            SENTRA-GSAP PASS
```

If one required gate is failed or missing, overall status is `SENTRA-GSAP FAIL` and blockers must remain visible.
