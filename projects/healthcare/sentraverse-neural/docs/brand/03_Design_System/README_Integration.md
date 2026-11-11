# Sentraverse Design System — Safe Integration

This folder is a **proposed** brand layer, not a code patch to the live Sentraverse capsule.

1. Review and approve palette, typography, and logo masters.
2. Import `Sentraverse_Tokens.css` into the public marketing UI stylesheet or mirror values in the existing Tailwind theme. Apply selectively; global refactors are not part of this package.
3. Reference the logo assets from public static files, using reverse white on dark and ink on light surfaces.
4. Check font loading; preferred typeface is **Inter** (licensed/installed separately). Use Arial/system sans as fallback.
5. Validate color contrast, mobile legibility, reduced motion, and focus states.
6. **Protect routing:** `next.config.mjs` must retain `/dashboard/*` -> `SENTRA_DASHBOARD_URL` (MedBoard), `/asisten-medis/*` -> `SENTRA_ASSISTVERSE_URL` (Assistverse). Do not import sibling capsule code. This package contains no config replacements.
7. Validate from capsule root:

```sh
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
```

Those commands are project acceptance checks; they were **not** run by the branding-package generator because it does not modify the live repository.
