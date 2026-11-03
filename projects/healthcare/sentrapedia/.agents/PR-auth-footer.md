Title: feat: auth footer credits the architect and builder

## What this carries

Split `f3a60a09`, which descends from the last published split `75518917` (PR #38). Six commits: the footer of `/sign-in`, `/sign-up` and `/apply` now reads "Architected and built by dr. Ferdi Iskandar" in place of "Keputusan klinis akhir tetap pada klinisi." (Gaffer's wording), plus the HANDOFF records of PR #38 and the beta build `17a98c2ee455`.

## Proof

- `tests/ui/auth-design.test.tsx` and `tests/beta-auth-pages.test.tsx` pass; eslint 0 on the touched file.
- Split checks: descends from `75518917` PASS; tree equals the capsule tree PASS; 0 LFS-filtered files changed; `merge-tree` against `main` has no conflict; no secret in the added lines.

## Merge

**Merge commit only, never squash or rebase.** The next split must descend from `f3a60a09`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
