# HealthSphere

Capsule for the primary-care (Puskesmas) assets of Sentra: the public website of UPTD
Puskesmas PONED Balowerti Kediri and the master reference datasets it and other tools draw on.

## Contents

| Folder | What it is |
| --- | --- |
| [`website/`](./website/README.md) | Static React 19 + Vite single-page site for the Puskesmas, deployed on Railway |
| [`database/`](./database/PROJECT_CONTEXT.md) | Master reference data: ICD-10, the 144 Puskesmas diseases, ICD-X extensions (JSON) |

## Boundaries

- In scope: the public website and the reference datasets.
- Out of scope: patient records, clinical decision logic, any backend or transactional database.
- Human owner: Chief (dr. Ferdi Iskandar)

## Commands

Run from this capsule root (pnpm 11.21.0, Node 24); the full contract is in
`project.contract.json`.

```bash
node scripts/pnpm.mjs --dir website install --frozen-lockfile
node scripts/pnpm.mjs --dir website run lint
node scripts/pnpm.mjs --dir website run typecheck
node scripts/pnpm.mjs --dir website run test --run
node scripts/pnpm.mjs --dir website run build
node scripts/pnpm.mjs --dir website run start
node scripts/deploy-dry-run.mjs
```

## Data rule

The datasets are public reference material. Patient data never enters this capsule.
