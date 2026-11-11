# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-08-21 - Portfolio late scaffold + Lenis on Framer Content-Wrapper

Migrated from root .agents/DECISIONS.md (original date kept).

`projects/portfolio/` is an active capsule with Diátaxis docs and community files
(lean AGENTS Always/Ask First/Never). NOVIA STUDIO stays a static React 18 + Node
server site (no pnpm workspace join, no Vite/Next rewrite). Lenis 1.3.26 is vendored
and attached to `.framer-bpy7lj` with first child as `content` — not `window` — because
the Framer Content-Wrapper owns `overflow: auto` / `100vh`. Root Biome excludes
portfolio vendor, assets, `167eyhs`, `framer.css`, and `portfolio-markup.js`. Evidence:
`projects/portfolio/AGENTS.md`, `projects/portfolio/docs/architecture.md`,
`projects/portfolio/novia-studio-react/src/app.js`, `biome.jsonc`.
