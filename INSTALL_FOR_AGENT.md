# Install Sentra-GSAP into the Monorepo

You are integrating an organizational standard, not replacing existing repo governance.

1. Read this package's `docs/standards/sentra-gsap/STANDARD.md`.
2. Run `node scripts/sentra-gsap/install.mjs --repo <repo-root> --dry-run`.
3. Inspect the target paths; ensure no unrelated file replacement is proposed.
4. Run the installer without `--dry-run`.
5. Inspect the inserted managed blocks in `AGENTS.md` and `CLAUDE.md` for conflicts with explicit human instructions. Human instructions win; do not remove unrelated governance.
6. Update `sentra-gsap.config.mjs` to the actual frontend paths/scripts/routes without weakening required gates.
7. Ensure `@playwright/test` and browser binaries already used by the repo are available; do not introduce a second browser-test framework when the repo has an equivalent Playwright setup—adapt the verifier integration instead.
8. Run `sentra:gsap:test-standard`.
9. Run a dry Sentra verifier. It is expected to FAIL until a live URL and independent visual review exist; this proves missing evidence is enforced.
10. Report exactly what was installed and any integration conflict. Do not use git history as a substitute for inspecting the actual current files.
