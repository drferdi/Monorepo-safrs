# Documentation Maintenance

This document defines the maintenance schedule, ownership, and update process for Med Assist documentation.

---

## Table of Contents

1. [Review Schedule](#review-schedule)
2. [Document Owners](#document-owners)
3. [Update Process](#update-process)
4. [Version Control for Docs](#version-control-for-docs)
5. [Translation Requirements](#translation-requirements)

---

## Review Schedule

| Document                       | Frequency           | Last Reviewed | Next Review          |
| ------------------------------ | ------------------- | ------------- | -------------------- |
| `README.md`                    | Monthly             | 2026-04-16    | 2026-05-16           |
| `AGENTS.md`                    | Monthly             | 2026-04-16    | 2026-05-16           |
| `CODING_STANDARD.md`           | Quarterly           | 2026-04-16    | 2026-07-16           |
| `CONTRIBUTING.md`              | Quarterly           | 2026-04-16    | 2026-07-16           |
| `DEPLOYMENT.md`                | Per release         | 2026-04-16    | Next release         |
| `API.md`                       | Per API change      | 2026-04-16    | Next API change      |
| `SECURITY.md`                  | Quarterly           | 2026-04-16    | 2026-07-16           |
| `CHANGELOG.md`                 | Per release         | 2026-04-16    | Next release         |
| `docs/architecture/`           | Per major change    | 2026-04-16    | Next major change    |
| `docs/adr/`                    | Per new ADR         | 2026-04-16    | Next ADR             |
| `docs/development/WORKFLOW.md` | Quarterly           | 2026-04-16    | 2026-07-16           |
| `docs/user/USER_GUIDE.md`      | Per feature release | 2026-04-16    | Next feature release |

---

## Document Owners

| Document                       | Primary Owner                              | Backup Owner    |
| ------------------------------ | ------------------------------------------ | --------------- |
| `README.md`                    | Chief / Drferdi                             | Senior Engineer |
| `AGENTS.md`                    | Chief / Drferdi                             | Senior Engineer |
| `CODING_STANDARD.md`           | Sentra (Principal Infrastructure Engineer) | Chief / Drferdi  |
| `CONTRIBUTING.md`              | Chief / Drferdi                             | Senior Engineer |
| `DEPLOYMENT.md`                | Sentra (Principal Infrastructure Engineer) | DevOps Lead     |
| `API.md`                       | Backend/API Lead                           | Senior Engineer |
| `SECURITY.md`                  | Chief / Drferdi                             | Security Lead   |
| `CHANGELOG.md`                 | Release Manager                            | Chief / Drferdi  |
| `docs/architecture/`           | Chief / Drferdi                             | Senior Engineer |
| `docs/adr/`                    | Chief / Drferdi                             | Senior Engineer |
| `docs/development/WORKFLOW.md` | Senior Engineer                            | Any Engineer    |
| `docs/user/USER_GUIDE.md`      | Product/UX Lead                            | Any Engineer    |

---

## Update Process

### When to Update

Documentation must be updated in the same PR as the code change, or in a closely following PR. Do not leave documentation outdated for more than 48 hours after a relevant change is merged.

Scenarios requiring doc updates:

- New feature or capability
- Changed API endpoint or request/response format
- Modified environment variables or configuration
- Updated build, test, or deployment process
- New architectural decision or changed boundary
- Updated security policy or compliance requirement

### Update Workflow

1. **Identify affected documents** — use the ownership table above.
2. **Make edits** — follow the existing style and formatting.
3. **Update the "Last updated" footer** — include the current date.
4. **Run a quick review** — check for broken links, typos, and factual accuracy.
5. **Include in PR** — doc updates should be part of the feature/fix PR or a dedicated `docs/` PR.
6. **Notify stakeholders** — if the change affects user-facing docs, inform the support/training team.

### Approval Rules

- **Engineering docs** (`AGENTS.md`, `CODING_STANDARD.md`, `WORKFLOW.md`): Approved by any senior engineer.
- **Architecture docs** (`docs/architecture/`, `docs/adr/`): Approved by Chief / Drferdi.
- **User-facing docs** (`README.md`, `USER_GUIDE.md`): Approved by Product/UX Lead or Chief.
- **Security docs** (`SECURITY.md`, `DEPLOYMENT.md`): Approved by Chief / Drferdi or Security Lead.

---

## Version Control for Docs

All documentation lives in the same Git repository as the code. This ensures:

- Docs are versioned alongside the code they describe.
- PRs can include both code and doc changes.
- Historical doc versions are accessible via Git history.

### Guidelines

- Do not maintain separate doc branches for long periods.
- Use meaningful commit messages for doc changes (e.g., `docs: update API endpoint for consult submission`).
- Avoid binary files (PDFs, Word docs) in the repo. Use Markdown for everything.
- Images and diagrams should be stored in `docs/assets/` and referenced with relative paths.

---

## Translation Requirements

### Technical Documentation

All technical documentation (engineering guides, API docs, architecture docs, ADRs) must be written in **English**.

### User-Facing Documentation

User guides and help content should be available in:

- **Indonesian (Bahasa Indonesia)** — primary language for healthcare workers in Indonesia
- **English** — secondary language for international stakeholders or developers

### Translation Workflow

1. Write the primary version first (Indonesian for user guides, English for technical docs).
2. If a translation is needed, create a file with the language suffix:
   - `docs/user/USER_GUIDE.md` (Indonesian — default)
   - `docs/user/USER_GUIDE.en.md` (English — optional)
3. Keep translations in sync. When updating the primary version, check if the translation needs updating too.

---

_Last updated: 2026-04-16 | Owner: Chief_
