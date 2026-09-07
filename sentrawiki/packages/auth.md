# Auth (`packages/auth`)

> **Scope.** Incomplete tree under `packages/auth/`. Not a published root workspace package in the sense of the other `@safrs/*` packages (no `package.json` in the package listing used for this wiki). Golden-path `AGENTS.md` lists authentication as a non-goal.

## What is on disk

`packages/auth/src` plus `node_modules` traces of `better-auth` and `@better-auth/prisma-adapter`. Prisma models `User` / `Session` / `Account` / `Verification` already exist in `@safrs/database`.

Do not document or consume this as a shipped shared auth SDK. Live product auth is capsule-owned (SentraBot Better Auth in `projects/product/sentrabot`).

## Related

- [Database](database.md)
- [Golden path](../projects/golden-path.md)
- [SentraBot](../projects/sentrabot.md)
