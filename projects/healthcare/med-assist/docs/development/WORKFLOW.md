# Development Workflow

This document describes the standard development workflow for Med Assist, including Git practices, testing workflow, and release procedures.

---

## Table of Contents

1. [Git Workflow](#git-workflow)
2. [Branching Strategy](#branching-strategy)
3. [Commit Standards](#commit-standards)
4. [Testing Workflow](#testing-workflow)
5. [Code Review Workflow](#code-review-workflow)
6. [Release Workflow](#release-workflow)
7. [Documentation Workflow](#documentation-workflow)

---

## Git Workflow

We use a **trunk-based development** approach with short-lived feature branches.

### Daily Workflow

```powershell
# 1. Pull latest changes from main
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feat/your-feature-name

# 3. Make focused, incremental commits
git add .
git commit -m "feat(scope): description"

# 4. Push your branch
git push -u origin feat/your-feature-name

# 5. Open a Pull Request
```

### Commit Standards

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[(optional scope)]: <description>

[optional body]

Agent: [Name] · Phase: Execution · Handoff: [session-id]
```

Allowed types:

- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `style` — formatting, missing semicolons
- `refactor` — code restructuring
- `test` — test additions or fixes
- `chore` — build process, dependencies

### Rebase vs. Merge

- **Preferred:** Rebase your feature branch on `main` before merging to keep a linear history.
- **Allowed:** Squash and merge for PRs with many small or experimental commits.
- **Avoid:** Merge commits that create unnecessary branch complexity.

---

## Branching Strategy

| Branch Type | Naming Convention    | Lifetime       |
| ----------- | -------------------- | -------------- |
| Main        | `main`               | Permanent      |
| Feature     | `feat/description`   | 1-3 days       |
| Bugfix      | `fix/description`    | 1-2 days       |
| Hotfix      | `hotfix/description` | Same day       |
| Docs        | `docs/description`   | 1 day          |
| Release     | `release/vX.Y.Z`     | Until deployed |

### Branch Protection

- Direct pushes to `main` are prohibited.
- All changes must go through a Pull Request.
- PRs require at least one approval before merging.
- Quality gates must pass before merge.

---

## Testing Workflow

### Test-Driven Development (TDD)

For new features and bug fixes, follow this cycle:

1. **Write the failing test** — define the expected behavior.
2. **Run the test** — confirm it fails for the right reason.
3. **Write minimal implementation** — make the test pass.
4. **Refactor** — clean up the code while keeping tests green.
5. **Commit** — `feat:` or `fix:` with relevant test files.

### Pre-Commit Testing

Before every commit, run the relevant tests:

```powershell
# All tests
pnpm --filter @the-abyss/med-assist test

# Specific file
pnpm --filter @the-abyss/med-assist test -- lib/api/bridge-client.test.ts

# With UI
pnpm --filter @the-abyss/med-assist test:ui
```

### Pre-PR Testing

Before opening a PR, run the full quality gate:

```powershell
pnpm --filter @the-abyss/med-assist test
pnpm --filter @the-abyss/med-assist test:contract
pnpm --filter @the-abyss/med-assist lint
pnpm --filter @the-abyss/med-assist typecheck
```

### E2E Testing

Run E2E tests before major releases or after UI changes:

```powershell
pnpm --filter @the-abyss/med-assist test:e2e
```

---

## Code Review Workflow

### For Authors

1. Keep PRs small and focused (ideally < 400 lines of diff).
2. Write a clear PR description explaining:
   - What changed
   - Why it changed
   - How to test it
3. Link related issues.
4. Respond to review comments promptly and respectfully.
5. Re-request review after addressing feedback.

### For Reviewers

1. Review within 24 hours of request (or communicate if delayed).
2. Use the [Code Review Checklist](AGENTS.md#12-code-review-checklist).
3. Distinguish between:
   - **Blocking:** Must be fixed before merge (bugs, security, type errors)
   - **Non-blocking:** Suggestions for future improvement (naming, refactoring)
4. Approve only when confident the change is safe and correct.

---

## Release Workflow

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** — incompatible API or behavior changes
- **MINOR** — new features, backward compatible
- **PATCH** — bug fixes, backward compatible

### Release Steps

1. **Prepare:**
   - Ensure `CHANGELOG.md` is updated.
   - Bump version in `package.json` and `wxt.config.ts` manifest.
   - Run full quality gates.

2. **Build:**

   ```powershell
   pnpm --filter @the-abyss/med-assist build
   pnpm --filter @the-abyss/med-assist zip
   ```

3. **Tag:**

   ```powershell
   git tag -a v1.0.2 -m "Release v1.0.2"
   git push origin v1.0.2
   ```

4. **Deploy:**
   - Submit the ZIP to the Chrome Web Store and/or Firefox Add-ons.
   - See [`DEPLOYMENT.md`](DEPLOYMENT.md) for detailed steps.

5. **Announce:**
   - Notify the team of the new release.
   - Update `.agent/PROGRESS.md` with release notes.

---

## Documentation Workflow

### When to Update Docs

Update documentation whenever you:

- Add a new feature
- Change an API endpoint or data structure
- Modify architectural boundaries
- Introduce a new dependency or tool
- Change environment variables or build steps

### Documentation Files

| File                 | Purpose                              | Update Trigger               |
| -------------------- | ------------------------------------ | ---------------------------- |
| `README.md`          | Project overview, setup, quick start | Major feature, setup change  |
| `AGENTS.md`          | Agent protocols, checklists          | Process change               |
| `CODING_STANDARD.md` | Code style, security, testing        | New standard or rule         |
| `CONTRIBUTING.md`    | Contribution guidelines              | Workflow change              |
| `DEPLOYMENT.md`      | Build and release steps              | Deployment process change    |
| `API.md`             | API endpoint reference               | Endpoint change              |
| `SECURITY.md`        | Security policies                    | Security policy change       |
| `CHANGELOG.md`       | Release history                      | Every release                |
| `docs/architecture/` | Architecture decisions               | Structural change            |
| `docs/adr/`          | ADRs                                 | Major architectural decision |
| `docs/user/`         | User guides                          | UI/UX feature change         |

### Language

- All code and technical documentation is written in **English**.
- User-facing guides may be written in **Indonesian (Bahasa Indonesia)** or **English** depending on the target audience.

---

_Last updated: 2026-04-16 | Owner: Chief_
