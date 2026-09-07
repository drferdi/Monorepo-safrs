# Portfolio Dr. Novia

**Path:** `projects/corporate/portfolio-drnovia/`
**Contract:** `project.contract.json` id `corporate/portfolio-drnovia`
**Posture:** not in the root pnpm workspace. Package manager in the contract is `none` (vendored runtime).

Inner-source portfolio site for Dr. Novia Dwi Anggraini. Preserves Framer-generated markup and Lenis 1.3.26 on a nested 100vh overflow container.

## Lifecycle

| Stage | How |
| --- | --- |
| install | `node scripts/install.mjs` |
| lint / typecheck | N/A with recorded reasons (generated markup, plain JS) |
| test | Node test runner on `tests/*.test.mjs` |
| build / run / deployDryRun | capsule scripts |

No auth, CMS, Stripe, or analytics. Hosted production is later R3, not the current slice.

## Related

- `projects/corporate/portfolio-drnovia/docs/overview.md`
- `docs/quickstart.md` in the capsule
