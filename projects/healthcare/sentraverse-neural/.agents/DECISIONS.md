# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-10-09 (icon) — PNG is a plain blob, not Git LFS

Decision: `.gitattributes` unsets the LFS filter for `*.png` in this capsule, and
`app/icon.png` is stored as a plain 60,948-byte blob. This replaces the LFS line of the
"(repository)" entry below.

Rationale: the first Vercel build of drferdi/Sentraverse-N failed with "Process image
"/icon.png" failed: TypeError: unsupported file type" (Chief, 2026-10-09). Vercel clones without
Git LFS by default, so the build read the 130-byte pointer. The only PNG is a small icon; a plain
blob builds anywhere with no host setting.

Evidence: `git check-attr filter` reads `unset` for the icon; the staged blob is 60,948 bytes
and starts with the PNG signature.

## 2026-10-09 (repository) — The capsule's own repository is drferdi/Sentraverse-N

Decision: this capsule's own repository is https://github.com/drferdi/Sentraverse-N (private),
branch `main`, starting from one snapshot commit of this folder. PNG files are stored in Git LFS
(`.gitattributes`), as in the monorepo, so `app/icon.png` publishes as an image, not a pointer.

Rationale: Chief named the repository on 2026-10-09; every capsule publishes to its own
repository under `drferdi`.

Evidence: the repository was empty and private before the first push; the published tree is the
monorepo's `projects/healthcare/sentraverse-neural` at the snapshot commit.

## 2026-10-09 — Split out of `sentraverse` as its own site

Decision: the neural journey leaves `projects/healthcare/sentraverse` and becomes this capsule,
`projects/healthcare/sentraverse-neural`, a standalone Next.js site with its own lockfile and
port (4346). Its links to the rest of Sentra (`/story`, `/ekosistem`, `/privacy`, `/terms`)
become absolute links to sentrahai.com through `sentra(path)` in `story.ts`. `sentraverse`
gets its old landing page back. Publishing waits for Chief's go-ahead and the repository name.

Rationale: Chief (2026-10-09): "seharusnya sentraverse baru ini folder sendiri", then chose the
folder name `sentraverse-neural`, restoring the old landing, and a local commit only.

Carried forward from `sentraverse/.agents/DECISIONS.md` (full history there, entries
2026-10-08 to 2026-10-09 (GSAP debt)):
- One master timeline scrubbed by one pinned ScrollTrigger (scrub .8 desktop, .35 mobile,
  `invalidateOnRefresh`), inside a `gsap.matchMedia` context reverted on unmount.
- The film is a scroll-scrubbed WebP frame sequence on a canvas, never a seeked `<video>`;
  frames live in `public/legacy-film/<version>/`, are served `immutable`, and load only once the
  story reaches the network chapter.
- At the end of THE LEGACY the left side of the face becomes neural tissue (Chief: "morph go").
- Performance targets are the Core Web Vitals "good" thresholds at p75 (LCP <= 2.5 s,
  INP <= 200 ms, CLS <= 0.1); the Playwright suite stays local for now; the watermark stays.

Evidence: before the split the journey and after it this capsule were captured at phases 0, 28,
45, 60, 70, 91, 95.4, 97 and 100 at 1280x800 and 375x812 (18 frames each); mean difference
<= 0.14 per channel and <= 0.15% changed pixels, only the living animation. Gates in this
capsule: typecheck 0, eslint 0, node:test 42/42, build 0, deploy dry-run passed, Playwright
15/15 against `next start` on 127.0.0.1:4346.
