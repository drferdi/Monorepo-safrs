# Data

- System of record: PostgreSQL through Prisma (`prisma/schema.prisma`, `DATABASE_URL`). The
  data model is described in [`DATA_MODEL.md`](./DATA_MODEL.md); privacy handling in
  [`PRIVACY.md`](./PRIVACY.md) and [`../DATA_PRIVACY.md`](../DATA_PRIVACY.md).
- Migrations are approval-required and never run by the capsule lifecycle.
- Secrets and service credentials are named in `.env.example` and `project.contract.json`;
  values live only in the deployment environment or a git-ignored `.env.local`.
- `runtime/` holds generated test and parity reports; `runtime/bridge-queue` is mutable local
  state.
- Test fixtures are synthetic. `tests/fixtures/phi/` is git-ignored and must stay empty in the
  repository.
