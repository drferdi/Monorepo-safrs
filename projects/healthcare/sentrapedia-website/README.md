# Sentrapedia website

Public Sentrapedia marketing website for physicians and institutions. It explains documentation workflows, demonstrates six synthetic examples, and keeps clinical decisions with the treating physician. This is a separate sovereign capsule from the Sentrapedia clinical application.

Project authority, requirements, risk, verification, and the healthcare non-device boundary start at [SPDS Read First](docs/spds/read_first.md). The machine-readable root is [`PROJECT_GENOME.yaml`](PROJECT_GENOME.yaml).

## Local lifecycle

Node.js 22 or later is required; the capsule has no runtime package dependencies.

```powershell
node --run install:check
node --run build
node --run lint
node --run test
node --run verify
node --run deploy:dry-run
node --run start
```

Open `http://127.0.0.1:3401` in Chrome after `node --run start`. Do not open `site/index.html` directly as a `file://` page: its root-relative `/media/`, `/vendor/`, and `/assets/` URLs require the local HTTP server, so a direct file view appears without CSS. Set `PORT` for a different local port. `source/` is the editable HTML, `assets/` holds authored styling and media, and `site/` is the served output. `scripts/transform.mjs` builds the site; `scripts/verify.mjs` validates it. The contact endpoint fails closed without a configured sender and service key. No live submission or deployment is part of the local lifecycle.

The migration source and file hashes are recorded in [migration manifest](docs/migration-manifest.json) and [migration report](docs/migration-report.md). See the [documentation index](docs/README.md), [architecture](docs/architecture.md), [data handling](docs/data.md), and [testing](docs/testing.md).
