# Data

- Data classes: none. The site collects nothing, stores nothing, and calls no API.
- Static assets: `public/neural-face.webp` (the face the field grows into) and the film frames
  in `public/legacy-film/<version>/`, both of the owner, Gaffer, published on purpose.
- Environments: no environment variables (`scripts/deploy-dry-run.mjs` checks none are
  server-only).
- Retention and migration: a re-export of the film is a new version folder; old versions stay
  until no deployed build points at them.
- Computed risk: R1.
