# Architecture

`source/` and `assets/` own the editable public site. `scripts/transform.mjs` copies authored assets and HTML into `site/`; `scripts/serve.mjs` serves that output and the optional contact endpoint. `scripts/verify.mjs` checks the local presentation baseline, links, media bytes, and HTTP behavior. `tests/migration-boundary.test.mjs` checks the copied closure against the migration manifest.

The site subsystem has no imports or paths into the monorepo root or the Sentrapedia clinical application. The optional Resend service is configured only by environment variables. Without it, the contact endpoint fails closed. Remotion authoring is not required to build or serve existing media; source videos and posters are carried locally.
