# Contributing to MedBoard

MedBoard is a dual-licensed project (see [`LICENSE`](./LICENSE)) owned by dr. Ferdi Iskandar.
Code contributions come from people the owner has invited; this guide is for them. Clinical
content for Sentrapedia can be proposed by any signed-in staff member inside the application at
`/sentrapedia/kontribusi`.

## Ground rules

- **Patient safety first.** MedBoard supports clinical decisions; changes to clinical logic
  (`src/lib/cdss/**`, vital-sign alerts, NEWS2, trajectory and prescription rules) need the
  owner's review before they merge.
- **No patient data, anywhere.** Not in code, tests, fixtures, screenshots, issues or commit
  messages. Use clearly fictional data.
- **No secrets.** Name environment variables, never their values. `.env.local` stays local.
- **Database changes** (`prisma/schema.prisma`, migrations) and sign-in or session code need the
  owner's approval first.

## Development workflow

1. Set up the project as described in the [README](./README.md#getting-started).
2. Create a branch from `main`: `feat/<topic>`, `fix/<topic>` or `docs/<topic>`.
3. Write the test first for any behaviour change and see it fail, then make it pass.
4. Run the checks before you push:

   ```bash
   pnpm run lint
   pnpm test
   pnpm run build
   ```

5. Open a pull request using the template; describe what changed, why, and how you verified it.

`pnpm install` installs a pre-push hook that blocks pushes until the publish target is
confirmed. Ask the owner before pushing to a shared branch.

## Code style

- TypeScript in strict mode. No `@ts-ignore`, no `eslint-disable`, no implicit `any`, no silent
  casts; fix the cause instead.
- Match the surrounding code. Keep changes focused on the task.
- UI follows the design system in `src/app/globals.css` and `src/app/ui.css`: design tokens only,
  sentence-case text (acronyms excepted), black neumorphic buttons at 13 px, Lucide icons.
  The design tests in `src/app/*.test.ts` enforce these rules.
- Formatting follows [`.editorconfig`](./.editorconfig): UTF-8, LF line endings, two-space
  indentation.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat(scope): …`,
`fix(scope): …`, `docs: …`, `test: …`, `refactor: …`, `chore: …`. Write the subject in the
imperative mood and explain the reason in the body when it is not obvious.

## Reporting bugs and security issues

Open an issue with the bug report template for ordinary bugs. Report security vulnerabilities
privately as described in [`SECURITY.md`](./SECURITY.md), never in a public issue.

## Code of conduct

Everyone taking part follows the [code of conduct](./CODE_OF_CONDUCT.md).
