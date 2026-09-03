# Sentra Bot — marketing site (Cora layout shell)

Pixel-faithful React rebuild of a captured marketing layout, with **visible copy rebranded to Sentra Bot 2026**. The React landing page is accompanied by static About, registration, privacy, and terms pages. Design, CSS, class names, and spacing stay original. Image assets rebranded to Sentra Bot (see `IMAGE-SWAP.md`).

## Commands

```bash
pnpm install
pnpm --filter cora dev      # http://localhost:5173 (or the next free port)
pnpm --filter cora build
pnpm --filter cora preview
```

## Layout

- `original/` — untouched HTML capture (pre-rebrand archive)
- `index.html` + `src/App.jsx` — React/Vite landing-page entry and composition
- `src/html/` — section markup (copy updated wave-by-wave; see `REBRAND.md`)
- `public/{tentang,daftar,privasi,ketentuan}.html` — standalone public pages
- `public/{privasi,ketentuan}/index.html` — extensionless-route copies kept byte-identical to their canonical `.html` pages
- `IMAGE-SWAP.md` — image rebrand log (waves 11–16)
- `public/assets/` — captured CSS, rebranded images, the polish layer, and self-hosted IBM Plex Sans

## Constraint

Do not redesign. Text and destination URLs may change for Sentra Bot; visual system stays.

## Polish layer

`public/assets/polish.css` is the hand-written override stylesheet shared by the
landing and static pages. It loads after the captured CSS and carries the fixes
from `VISUAL_AUDIT.md`, including the shared responsive header and static-page
reading layouts. Put new visual overrides there, not in the compiled files.

`public/assets/fonts.css` loads the self-hosted IBM Plex Sans files used across
every public page.
