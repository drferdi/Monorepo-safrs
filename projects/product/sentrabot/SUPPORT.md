# Support

Sentra Bot is an inner-source capsule owned by **Chief** (dr. Ferdi Iskandar).
There is no public Discord, Slack, forum, or community mailing list for this
project. Do not invent those channels.

## How to get help

| Need | Where |
| --- | --- |
| Product intent | [docs/overview.md](docs/overview.md), [docs/product.md](docs/product.md) |
| What can run today | [docs/quickstart.md](docs/quickstart.md) |
| Agent / contributor steps | [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security | Capsule [SECURITY.md](SECURITY.md), root [SECURITY.md](../../SECURITY.md) |
| Intake / pin | [docs/provenance.md](docs/provenance.md) |
| Operate Compose | [docs/operations.md](docs/operations.md), [docs/self-host.md](docs/self-host.md) |
| Decisions | [docs/decisions.md](docs/decisions.md) |

```mermaid
flowchart TD
  Q["Question"] --> Kind{"Kind"}
  Kind -->|how do I run it| QS["docs/quickstart.md"]
  Kind -->|how does it work| OV["docs/overview.md"]
  Kind -->|security incident| SEC["private disclosure to Chief"]
  Kind -->|blocked pin d17a138| PR["docs/provenance.md — still blocked"]
  Kind -->|code change| AG["AGENTS.md then Chief"]
```

## Owner

Human owner: **Chief**. Agents do not authorize R2/R3 work, production access,
or credential issuance.

## What support cannot do

- Unblock intake by substituting `HEAD` or `7f08da5` for pin `d17a138`.
- Open public signup, issue hosted credentials, or publish a signed desktop
  without Chief.
- Provide production URLs — none are published for this capsule.
- Replace root verification (`bash scripts/safrs-verify.sh`).
