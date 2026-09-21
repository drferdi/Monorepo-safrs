# Data — SentraBot

## Classes

| Class | Location / notes | Sensitivity |
| --- | --- | --- |
| Product runtime data | Local `DATA_DIR`, Postgres (dev) | Local / disposable by default |
| Auth & secrets | Environment / secret stores — never in git | High — keep out of repository |
| Docs & legal | `docs/legal/`, product docs | Public / policy |
| Screenshots & media | `docs/screenshots/` | Public demos only |

## Rules

- Never commit `.env`, production URLs with secrets, customer data, or real production dumps.
- Sandbox / computer providers stay behind provider-neutral interfaces; vendor credentials stay outside the tree.
- Changes that touch auth, billing, or production deploy paths escalate per root SAFRS policy (often R2/R3).
