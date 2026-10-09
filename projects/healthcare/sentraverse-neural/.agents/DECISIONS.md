# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-10-09 (motion) — No light effect behind the SentraSquad

Decision: after three tries (a burst per name, one oval burst, then a starburst and a soft bloom
with a lens streak), Chief ruled out light behind the names. They arrive from the middle of the
row outwards, each coming into focus (fade, 8 px rise, blur 6 px to 0), and stay bright white.

Rationale: Chief's ruling: "gak suka cahaya begitu, hilangkan saja cahaya".

Evidence: the neural e2e "the network chapter names the SentraSquad" asserts the order and that
nothing is drawn behind the names.

## 2026-10-09 (content) — The SentraSquad in the network chapter

Decision: the network chapter (SENTRAVERSE) names the SentraSquad under its title, five across on
desktop and two columns on phones, each name over its role exactly as Chief wrote them (`squad` in
`story.ts`). They arrive one by one after the title forms, drawn back at build so they never show
early. On short phones (700 px tall or less) the chapter's sentence is left to the reading view
so the squad fits between the header and the controls.

Rationale: Chief's instruction.

Evidence: the neural e2e "the network chapter names the SentraSquad" at 1280x800, 375x812 and
360x640.

## 2026-10-09 (type) — No text under 11 px on desktop or 10 px on phones

Decision: every label in every chapter (specimen, eyebrows, annotations, controls, coordinates,
cursor label, overview, the legacy's signature and brand lines) is raised to at least 11 px on
desktop and 10 px on phones; the registered mark (®) is a sign and stays 9 px. Short phones get
more room above the controls and a closer-set legacy so nothing touches the controls.

Rationale: Chief found the 7–9 px labels too small to read.

Evidence: the neural e2e "no text is smaller than 11 px on a desktop or 10 px on a phone".

## 2026-10-09 (layout) — The page ends with the stage

Decision: the colophon (copyright, tagline, Privacy and Terms) and the division list below it are
removed, so at the end of the scroll the legacy screen stays put instead of sliding up. On phones
in the cinematic view the divisions are no longer listed; EXPLORE SENTRAVERSE leads to the same
ecosystem page. This supersedes "they stay after the colophon" in the entry below.

Rationale: Chief's instruction; nothing should scroll in under the final screen.

Evidence: the neural e2e "the last screen is the end of the page" (stage flush with the window
at the end, desktop and phone).

## 2026-10-09 (brand) — The neuron is the official mark; the ecosystem stands beside the founder

Decision: Chief supplied the official Sentraverse logo, a white neuron on a transparent
background. It lives unmodified at `public/brand/sentraverse-logo.png` and is the header mark
(28 px, 24 px on phones). `app/icon.png` is the same neuron on the page's ink (#06090e). In the
legacy chapter the five divisions stand at the right edge of the stage beside the founder; on
phones in the cinematic view they stay after the colophon.

Rationale: Chief's instruction. A transparent white icon would vanish on light tab strips.

Evidence: commits `34ed216b` and `41b2b480`; the smoke and neural e2e tests for both.

## 2026-10-09 (motion) — One living organism

Decision: the journey reads as one organism. It has:
- per-phase motion signatures;
- a stage camera over the canvases only;
- one carrier handed from host to host;
- a network that reorganises into a five-hub constellation;
- opening words that arrive by meaning;
- a neural-trace progress line;
- subtle pointer instrumentation.

All of it rides the existing master, renderer and ticker, with no new dependency.

Rulings taken on Chief's behalf (defaults, open to his call):
- **SENTRAVERSE keeps its reveal at the network chapter's start.** The brief asked for the wordmark
  last. The "Sentraverse" nav button and the `#network` jump land at phase 61.5, which the label
  tests pin. A late title would be invisible there and readable for only about .2 viewport.
  The constellation forms under it (60.5 → 65).
- **The constellation keeps depth.** Neurons that grew within `GATHER` 3.5 of a hub join its ring
  and the outer ones keep their place. The distant field recedes `RECEDE` 4, not the planned 14.
  - At 14 the outer frame went near-black from phase 64: periphery lit share fell from .61–.70 %
    to .25 %.
  - With these values it is .46–.48 % at p65.5/p71, and the five clusters still read.
- **SEO** ships only what holds on any domain (`robots.txt`, Organization JSON-LD). Canonical,
  sitemap and the OG image wait for the domain.
- **Unchanged:**
  - mobile pinned travel (the tempo is protected);
  - chapter 14, THE LEGACY (the 2026-10-09 film ruling).
- **Execution.** Chief found subagent-per-task execution too slow. Tasks 6–10 ran inline, with one
  whole-branch review at the end.

Evidence:
- typecheck 0, eslint 0, node:test 54/54, build 0, dry-run 0, Playwright 22/22 on a fresh build
  (4347).
- Real-Chrome captures at phases 0–100 at 1280×800 and 375×812, plus reduced motion.

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
