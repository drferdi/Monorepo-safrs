# SAFRS Monorepo by the numbers

Do not treat this page as a live dashboard. Counts below are dated.

## Verified in this wiki refresh (2026-09-05)

| Metric | Value | How |
| --- | --- | --- |
| Git commits on current HEAD | 550 | `git rev-list --count HEAD` |
| Wiki pages after this refresh | see `.wiki-meta.json` `pageCount` | generated list |
| Root shared packages with package.json | 8 | `packages/*/package.json` (`auth` incomplete) |
| Domain folders | 5 | academic, corporate, healthcare, internal, product |
| Active product/internal capsules | 7 | plus `_template` |
| ADRs | 6 | `docs/adrs/0001`–`0006` |
| GitHub workflows | 5 | `.github/workflows/` |
| `safrs-verify` Python invocations | 19 | `scripts/safrs-verify.sh` |
| JSON Schema contracts | 7 | `.safrs/schemas/` |

## Historical snapshot (2026-08-12, previous wiki)

The original wiki reported 302 tracked files, ~14,600 non-JSON source lines, and 174 commits across three days. That snapshot is **HISTORICAL**. It described the golden-path-only repo. Do not mix it with the 2026-09-05 commit count.

## Complexity (qualitative, still true)

- Control plane and capsules are separate dependency graphs.
- Golden-path remains two-to-three packages deep (`web` → `api` → `database`).
- SentraBot is a multi-app capsule with its own packages and worker.
- Avery's heaviest bytes are Hermes runtime caches under `runtime/` — not application source.

## Related

- [Overview](overview/index.md)
- [Lore](lore.md)
