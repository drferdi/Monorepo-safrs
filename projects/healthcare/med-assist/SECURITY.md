# Security policy

## Reporting a vulnerability

Report a suspected vulnerability privately through GitHub: **Security → Report a
vulnerability** on this repository (private vulnerability reporting). Do not open a public
issue, and do not include patient data, credentials or screenshots of a patient record in the
report.

Include what you found, where (file, page or message name), how to reproduce it, and the impact
you expect. You will get an acknowledgement, and a fix or a decision is recorded in
`.agents/DECISIONS.md`.

## Supported versions

Only the latest build of the `main` branch is supported. Older builds are not patched.

## Scope

In scope: the Chrome extension (side panel, background worker, content scripts), its handling
of ePuskesmas page data, the bridge and auth clients in `lib/api/`, and the local MedLens
service in `services/medlens-local/`.

Out of scope: ePuskesmas itself, the external services listed in `project.contract.json`, and
the user's browser or operating system.

## Handling rules for contributors

- Patient data, `.env.local`, API keys and production credentials never enter Git, fixtures,
  tests, logs or commit messages.
- Identity sent outside the extension is masked (see `utils/name-masking.ts`).
- Web-accessible resources and script reinjection stay limited to ePuskesmas pages.
