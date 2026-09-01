# Sentra Bot — landing (Cora layout shell)

Pixel-faithful React rebuild of a captured marketing layout, with **visible copy rebranded to Sentra Bot 2026**. Design, CSS, class names, and spacing stay original. Image assets rebranded to Sentra Bot (see `IMAGE-SWAP.md`).

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Layout

- `original/` — untouched HTML capture (pre-rebrand archive)
- `src/html/` — section markup (copy updated wave-by-wave; see `REBRAND.md`)
- `IMAGE-SWAP.md` — image rebrand log (waves 11–16)
- `public/assets/` — original CSS & fonts; images rebranded to Sentra Bot (same filenames, same pixel dimensions)

## Constraint

Do not redesign. Text and destination URLs may change for Sentra Bot; visual system stays.

## Polish layer

`src/polish.css` is the only hand-written stylesheet. It loads after the compiled
CSS in `public/assets` and carries the fixes from `VISUAL_AUDIT.md` (brand accent,
focus ring, contrast, mobile type, touch targets, hover recipe, tablet tier,
background fill, marquee, Brief stage). Put new visual overrides there, not in the
compiled files.
