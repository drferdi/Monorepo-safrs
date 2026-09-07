# Verification

Evidence before claims. Never report PASS without running the command.

## Layers

| Layer | When | Command |
| --- | --- | --- |
| Capsule local | any capsule task | commands in that capsule's contract / AGENTS.md |
| Capsule standalone | sovereignty / extraction | `pnpm project:verify <domain/capsule>` |
| Root SAFRS | root, governance, integration, merge | `pnpm governance` |
| Root full gate | repository integration | `pnpm check` |

A root verifier is a **repository integration gate**. It is not a capsule lifecycle prerequisite.

## Pages

- [safrs-verify](safrs-verify.md)
- [Standalone extraction](standalone.md)
- [CI workflows](ci.md)
- [Design token gate](tokens.md)

Testing how-to: [how-to-contribute/testing.md](../how-to-contribute/testing.md).
