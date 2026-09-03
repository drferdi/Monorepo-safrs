# GSAP Audit — Journey (`/journey`)

Date: 2026-09-03. Scope: every motion surface of the Journey route in
`apps/web`. Method: full code read of `modules/motion/**` and
`components/journey/**`, then a scripted Playwright pass (Chromium) on desktop
1440×900, mobile 390×844, and desktop with `prefers-reduced-motion: reduce`,
capturing screenshots at the rest state of every section. Ratings are 1–5 on
three axes: **T** technical quality, **V** motion variety, **N** narrative fit.

Phase 3 fills the "after" columns and the changelog at the bottom.

> **Superseding note — 2026-09-03.** Atas keputusan Chief setelah tinjauan
> opening, kontrak Prolog pada audit ini berubah: kredit time-based dan source
> swap ke Daha dihapus. Gambar HD Kediri hadir sejak first paint dan tetap satu
> sumber; timeline scrubbed 280svh/180svh kini menggerakkan dolly kota → Brantas,
> veil kota, empat garis air vektor, horizon tembaga, dan portal 879. Pertanyaan
> kanonik menjadi “Berapa Usia Sebuah Kota?”. Interlude bukti dipindahkan setelah
> Scene 921 dan dipadatkan ke 320%. Reduced motion menampilkan gambar dan
> seluruh naskah sebagai komposisi statis. Kontrak browser terbaru mengunci
> urutan beat pertama → kedua → pertama saat scroll-back melalui state visual,
> bukan angka progres helper. Detail kanonik terbaru:
> `docs/shots/00-prologue-2026.md`.

---

## 1. Project map

| Item                         | Finding                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework                    | Next.js 16.3 App Router, React 19.2, Server Components for all history; client islands only for motion and the Timeline overlay                                                                                                                                                                                                                                                      |
| GSAP                         | `gsap` 3.15.0 + `@gsap/react` 2.1.2 (`useGSAP`)                                                                                                                                                                                                                                                                                                                                      |
| Plugins registered           | ScrollTrigger, ScrollSmoother, SplitText, CustomEase — once, in `modules/motion/gsap.ts` (`registerGsap()`). One CustomEase: `cine`                                                                                                                                                                                                                                                  |
| Plugins available but unused | Flip, Observer, MotionPath, ScrambleText, DrawSVG, Draggable, GSDevTools                                                                                                                                                                                                                                                                                                             |
| Scroll container             | ScrollSmoother (`smooth: 1.1`, native scrollbar kept) as a refcounted singleton (`smooth.ts`), desktop/tablet only. Mobile and reduced-motion use native scroll. No competing scroll libraries                                                                                                                                                                                       |
| Responsive model             | Every island uses `gsap.matchMedia()` with four variants: `desktop` ≥64rem, `tablet` 48–64rem, `mobile` <48rem, `reduced`. Mobile and reduced build **no** timelines; CSS delivers the composed reading state                                                                                                                                                                        |
| Cleanup                      | Every island returns `media.revert()` from `useGSAP`; scene teardown kills trigger, timeline, director cues, SplitText instances, and releases the smoother                                                                                                                                                                                                                          |
| Two-clock model              | `scenes.ts` = camera (one timeline per shot, normalised to duration 1, scrubbed `0.55`, ease `none`, pinned by ScrollTrigger when the smoother exists, otherwise CSS sticky; `pinSpacing:false` against a server-rendered `.scene-pin-space`). `director.ts` = script (date, master line, name, beats) **triggered** at progress thresholds with expressive eases and honest reverse |
| Page length                  | 132,895 px at 1440×900 (≈148 viewports); 39,558 px on mobile. Pin distances 300–525 svh per shot are code-owned (`PIN_DISTANCES`) and mirrored in `globals.css`                                                                                                                                                                                                                      |
| Content model                | 1 prologue + 1 inscription interlude + 9 act headers + 26 scenes + 1 finale. Choreography is a CMS _intent_ (`choreographyKey`); the code owns every selector, tween, duration, ease                                                                                                                                                                                                 |

### Choreography key usage (26 scenes, 14 keys)

| Key                                                                                                                      | Scenes                                 | Count |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ----- |
| politicalFracture                                                                                                        | 1222, 1293, shadow-archive, 1678, 1942 | 5     |
| manuscriptWorld                                                                                                          | 1157, jayabaya, 1906, 1950             | 4     |
| industrialExpansion                                                                                                      | sugar, people, 1958, **1990**          | 4     |
| royalConsolidation                                                                                                       | 1135, 1292                             | 2     |
| bridgeConstruction                                                                                                       | 1869, two-bridges                      | 2     |
| inscriptionReveal, nameEmerges, nameEndures, dividedKingdom, dahaLiving, bridgeLift, revolutionMachine, runwayTransition | one each                               | 8     |
| _(none — static document)_                                                                                               | panji-story-left-kediri                | 1     |

Adjacent scenes sharing an identical entrance: **1958 → 1990** (both
`industrialExpansion`). All other adjacencies alternate keys.

---

## 2. Global problems

| #   | Problem                                                                                                                                                                                                                                                                                                                                                                | Evidence                                                                                          | Severity                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------- |
| G1  | **One entrance pattern everywhere.** `textEntranceProps()` falls back to `MOTION.read` (opacity 0 → 1, y 16 → 0, `power2.out`, stagger 0.15) for date, context, master line, and beats in 9 of the 14 keys; only 6 keys have any bespoke text entrance. Act headers II–IX, the finale, the interlude, and every `.scene-readout` are either static or the same fade-up | `director.ts` L126–213, `act-header-reveal.tsx` (enabled for Act I only), `page.tsx` finale block | High                         |
| G2  | **No `ScrollTrigger.refresh()` after fonts or media load.** The director waits for `document.fonts.ready` before splitting, but no trigger is refreshed after act-header `<video>`/`<img>` metadata or the prologue continuation video changes layout. `act-header-reveal.tsx` documents the exact symptom (trigger fired at scrollY 0 because layout was not settled) | `director.ts` L585, `act-header-reveal.tsx` L96–105                                               | High                         |
| G3  | **No debug flag / no `markers`.** Nothing can be inspected from the browser: `ScrollTrigger` is module-scoped, `ScrollTrigger.getAll().length` is not reachable from e2e                                                                                                                                                                                               | `gsap.ts`                                                                                         | Medium                       |
| G4  | **No `ScrollTrigger.batch()` / `once: true` anywhere.** The 26 `.scene-readout` evidence strips (repeated elements) have no entrance and are the obvious batch candidate                                                                                                                                                                                               | `scene-section.tsx` L839                                                                          | Medium                       |
| G5  | **Reduced-motion + mobile prologue bug.** `.prologue-opening` (the time-based credit "Dari jejak yang tercatat…") stays in the `frame` grid cell and renders **on top of** the title plate when no timeline runs. Both texts are illegible                                                                                                                             | screenshots `r00-prologue`, `m00-prologue`; `globals.css` L641 has no static-flow branch          | **Blocker (a11y)**           |
| G6  | **Mobile 1042 nomenclature overlap.** PANJALU / JANGGALA / BRANTAS are only moved into their own grid row for `mobile + no-JS` and `mobile + reduced`; plain mobile (JS on, motion preference normal) keeps `inset: 0` and paints over the beats                                                                                                                       | screenshot `m-1042`; `globals.css` L1830–1868                                                     | High                         |
| G7  | **Motion that conveys nothing.** `BridgeGeometry` strokes draw themselves at `opacity: 0.24` + `mix-blend-mode: screen` under a full-bleed photo and are not perceivable (1869, two-bridges)                                                                                                                                                                           | screenshot `d23-1869-rest`; `globals.css` L3595                                                   | Medium                       |
| G8  | **`will-change: transform` permanently on every `.stage-surface`** (26 compositor layers alive at once). Also `backdrop-filter: blur(8px)` on all readouts and the `--lit` mask gradient repaint on each scrub tick                                                                                                                                                    | `globals.css` L1471                                                                               | Medium (perf)                |
| G9  | **Untracked infinite tween.** The scroll-cue arrow yoyo (`repeat: -1`) is created outside `touched`/`cues` and survives `director.destroy()`; it keeps ticking after the island is torn down                                                                                                                                                                           | `director.ts` L335–341                                                                            | Medium (leak)                |
| G10 | **Non-GSAP transitions mixed in.** `prologue-video-sequence.tsx` uses an inline CSS `transition` + `setTimeout` for the source swap; `journey-opening.tsx` uses CSS custom-property typing                                                                                                                                                                             | consistency only                                                                                  | Low                          |
| G11 | **Dead code.** `gsap-cinematic/` at the capsule root holds five components (own `registerPlugin`, `useEffect` without `gsap.context`, no cleanup) that nothing imports                                                                                                                                                                                                 | `gsap-cinematic/*.tsx`                                                                            | Low (flag only, not deleted) |
| G12 | **Stale e2e contract.** "first-load prologue keeps chrome hidden through the exact eight-second opening" asserts `data-opening-frame` and `documentElement.dataset.intro`, neither of which exists in `src/` after the 2026-09-03 overhaul                                                                                                                             | `e2e/smoke.spec.ts` L1629                                                                         | Medium (test debt)           |
| G13 | **Dead scroll in the interlude.** 550 % pin with one paragraph visible at a time on a black canvas: ~4 viewports of near-empty scroll                                                                                                                                                                                                                                  | screenshot `d06-interlude-b`                                                                      | Medium (pacing)              |
| G14 | `filter: blur()` animated on SplitText words (prologue credit) — paint-heavy; acceptable as a one-off signature, must not spread                                                                                                                                                                                                                                       | `director.ts` L248–281                                                                            | Low                          |

What is already right and must be preserved: plugin registration is central;
`gsap.matchMedia()` with a reduced branch exists everywhere; teardown is
owned by the creator; scrubbed motion is linear; historical text never uses
`autoAlpha`; `invalidateOnRefresh: true` is set on every ScrollTrigger; the
document is complete without JavaScript.

---

## 3. Per-section audit (before)

Order is page order. "Entrance" names the primary technique visible at the
rest state. Ratings before → after (after filled in Phase 3).

| #   | Section                                                         | Current animation                                                                                                                                                                                                                                             | Timing / ease                        | Technical issues                                             | T   | V   | N   |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | --- | --- | --- |
| 0   | Prologue (`prologueReveal`)                                     | Time-based intro: SplitText words blur-to-sharp (1.1 s, stagger 0.04, `power3.out`), fade out at 3.6 s, video starts at 4.0 s, scroll cue at 4.8 s. Scroll: dolly held at 1; title/master/beat cues triggered at 0.3/0.42/0.48/0.7; beats cycle one at a time | `power3.out`, `power2.inOut`, `cine` | G5 overlap on reduced/mobile; G9 untracked yoyo; blur filter | 4   | 4   | 4   |
| 1   | Inscription interlude                                           | 6 reveals opacity/y, scrubbed 0.5, pinned 550 %                                                                                                                                                                                                               | `none` (scrub)                       | G13 dead scroll; same fade-up as everything else             | 3   | 2   | 3   |
| 2   | Act I header "Awal Sejarah Kediri"                              | Media dolly-in (scale 1.08→1, 1.2 s) + label/title/paragraphs fade-up stagger 0.12; `toggleActions: play none none reverse`                                                                                                                                   | `power3.out`, `power2.out`           | Only act header with motion                                  | 3   | 2   | 3   |
| 3   | Opening address (Act I)                                         | Per-char typewriter scrubbed 0.25, header fades out first, address fades out at 0.82                                                                                                                                                                          | `none`                               | Fine; chars are DOM spans, not SplitText                     | 4   | 4   | 4   |
| 4   | 879 `inscriptionReveal`                                         | Camera: void → raking light sweep (`--lit`), dolly 1→1.24→1.45. Script: year first (0.28) then day/month (0.40), context 0.36, master lines x −22 → 0, beats stagger amount 0.4                                                                               | scrub `none`; `power2.out` 0.75 s    | Good shot; text entrance is a mild variant of the default    | 4   | 3   | 4   |
| 5   | 921 `nameEmerges`                                               | KADHIRI SplitText chars scale 0.75→1 + y (1.1 s, stagger 0.05); master lines `back.out(1.15)`; surface exit keeps name at 0.12                                                                                                                                | `power2.out`, `back.out`             | Bounce ease on historical name reads playful, not monumental | 3   | 3   | 4   |
| 6   | 1015 `nameEndures` (Research Hold)                              | Surface already present; canvas drifts x −2.5 → 2.5 %; text "still" style: opacity only                                                                                                                                                                       | `none`, `power2.out` 0.7 s           | Deliberate stillness; correct                                | 4   | 3   | 5   |
| 7   | 1042 `dividedKingdom`                                           | Surface scaleX 0.82→1; territory names travel ±100 % from centre; beats alternate ±28 px x                                                                                                                                                                    | `none`, `power3.out`                 | Best scene: spatial argument                                 | 4   | 4   | 5   |
| 8   | Act II header "Panjalu Bangkit"                                 | None (static image + text)                                                                                                                                                                                                                                    | —                                    | `ActHeaderReveal enabled=false`                              | 2   | 1   | 2   |
| 9   | Daha `dahaLiving`                                               | Video surface dolly 1.1→1.02; text y 14 `sine.out`                                                                                                                                                                                                            | `sine.out` 0.9 s                     | Quiet by design; parallax −10 % on video container           | 3   | 2   | 4   |
| 10  | 1135 `royalConsolidation`                                       | Date units converge from ±14 % x; everything else default fade-up                                                                                                                                                                                             | `power2.out`                         | Convergence only on the date                                 | 3   | 2   | 3   |
| 11  | 1157 `manuscriptWorld`                                          | Surface x −5 → 0; ruling strokes draw; default fade-up                                                                                                                                                                                                        | `none`, `power2.out`                 | Nothing says "page opens"                                    | 3   | 2   | 2   |
| 12  | Panji (no key)                                                  | None                                                                                                                                                                                                                                                          | —                                    | Static document; no island                                   | 2   | 1   | 2   |
| 13  | Act III header "Pusat Kekuasaan Berpindah"                      | None (4 centred paragraphs on black)                                                                                                                                                                                                                          | —                                    | Longest text card on the site, zero motion                   | 2   | 1   | 2   |
| 14  | 1222 `politicalFracture`                                        | Surface x −8 → 6; default fade-up                                                                                                                                                                                                                             | `none`, `power2.out`                 | Battle scene with the gentlest ease on the site              | 3   | 1   | 2   |
| 15  | 1292 `royalConsolidation`                                       | as 1135                                                                                                                                                                                                                                                       |                                      | Repeat                                                       | 3   | 1   | 2   |
| 16  | 1293 `politicalFracture`                                        | as 1222                                                                                                                                                                                                                                                       |                                      | Repeat, adjacent to a repeat                                 | 3   | 1   | 2   |
| 17  | Act IV header "Setelah Masa Kerajaan"                           | None                                                                                                                                                                                                                                                          | —                                    |                                                              | 2   | 1   | 2   |
| 18  | jayabaya `manuscriptWorld` / shadow-archive `politicalFracture` | as above                                                                                                                                                                                                                                                      |                                      | Repeats                                                      | 3   | 1   | 2   |
| 19  | Act V header / 1678 `politicalFracture`                         | None / as above                                                                                                                                                                                                                                               |                                      |                                                              | 2   | 1   | 2   |
| 20  | Act VI header "Besi, Gula, dan Kota Modern"                     | None                                                                                                                                                                                                                                                          | —                                    |                                                              | 2   | 1   | 2   |
| 21  | sugar / people / 1958 / 1990 `industrialExpansion`              | Surface scale 0.72→1 + strokes; default fade-up                                                                                                                                                                                                               | `none`, `power2.out`                 | 1958→1990 identical adjacent entrances (G1)                  | 3   | 1   | 2   |
| 22  | 1869 / two-bridges `bridgeConstruction`                         | Strokes draw (0.2 each, +0.05 cursor); default fade-up                                                                                                                                                                                                        | `none`                               | G7 strokes invisible over photo                              | 3   | 2   | 3   |
| 23  | 1906 / 1950 `manuscriptWorld`                                   | as 1157                                                                                                                                                                                                                                                       |                                      | Repeats                                                      | 3   | 1   | 2   |
| 24  | 1912 `bridgeLift`                                               | Surface y 7 → −3 %; date drops from above; default fade-up                                                                                                                                                                                                    | `none`, `power2.out`                 | Lift only on the date                                        | 3   | 2   | 3   |
| 25  | Act VII header / 1942 `politicalFracture`                       | None / as above                                                                                                                                                                                                                                               |                                      |                                                              | 2   | 1   | 2   |
| 26  | 1947–1948 `revolutionMachine`                                   | Surface x −4 → 0; strokes; beats alternate ±8 %                                                                                                                                                                                                               | `power2.out`                         | "Machine rhythm" promised, soft ease delivered               | 3   | 2   | 2   |
| 27  | Act VIII / IX headers                                           | None                                                                                                                                                                                                                                                          | —                                    |                                                              | 2   | 1   | 2   |
| 28  | 2024–2026 `runwayTransition`                                    | Surface dolly 1.12 → 1; strokes; date from x −14 %                                                                                                                                                                                                            | `none`, `power2.out`                 | Horizon idea only in the flavor table                        | 3   | 2   | 3   |
| 29  | Finale "Kediri Terus Berjalan"                                  | None                                                                                                                                                                                                                                                          | —                                    | Static image + text + coda                                   | 1   | 1   | 2   |
| —   | Brantas visual thread                                           | Path `d` + stroke morph across 5 anchors, scrubbed, rebuilt on refresh                                                                                                                                                                                        | `none`                               | Good; recomputed on `onRefresh`                              | 4   | 4   | 4   |
| —   | Scene readouts (26×)                                            | None                                                                                                                                                                                                                                                          | —                                    | G4                                                           | 2   | 1   | 2   |

---

## 4. Proposed motion plan (what Phase 2 builds)

Constraints honoured: only transforms, opacity, clip-path, and CSS variables
are animated (no `letter-spacing`, no `font-variation-settings` — tracking
effects are built as per-character `x` offsets converging to 0); historical
text keeps `opacity`, never `autoAlpha`; CMS keeps owning `choreographyKey`;
mobile and reduced-motion keep the composed static reading state.

### 4.1 Global

1. **Motion tokens** in `modules/motion/tokens.ts`: durations, eases (a small
   CustomEase family: `cine`, `cineIn`, `hardCut`, `settle`), stagger values.
   `MOTION` stays exported for compatibility.
2. **Debug flag**: `?motionDebug=1` (or `NEXT_PUBLIC_MOTION_DEBUG=1`) turns on
   ScrollTrigger markers and exposes `window.__kediriMotion` (`gsap`,
   `ScrollTrigger`, `activeTriggers()`) — read inside effects only, never
   during render (hydration contract).
3. **Refresh gate** (`MotionRefreshGate` island, mounted once on `/journey`):
   `ScrollTrigger.refresh()` after `document.fonts.ready`, after the first
   stage media (`img`/`video`) reports its size, and after the prologue
   continuation video starts; debounced.
4. **Fixes**: G5 (prologue credit becomes an in-flow row in the static
   branches), G6 (nomenclature row rule extended to plain mobile), G7 (stroke
   contrast), G9 (track the yoyo tween).
5. **`ScrollTrigger.batch('.scene-readout')`** with `once: true`, pre-hiding
   only readouts whose rect is below the viewport at creation so deep links
   never leave an earlier strip transparent.
6. **SplitText** instances created with `autoSplit: true` + `onSplit` where
   line masks are used, and every instance reverted in teardown.

### 4.2 Per section — one sentence of intent, then the technique

| Section                                     | Intent (one sentence)                                                    | Primary technique                                                                                                   | Timeline purpose                                |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Prologue                                    | Wonder: a living city surfaces out of the dark.                          | Word blur-to-sharp credit (kept, it is the signature)                                                               | Time-based intro; triggered cues on scroll      |
| Interlude                                   | Evidence is laid down piece by piece, each stone heavier.                | **Clip-path inset wipe** per evidence card, scrubbed; pin 550 → 420 %                                               | Scrubbed (reader controls the pace of evidence) |
| Act headers (all 9)                         | A chapter title card: authority, then breath.                            | **Line mask reveal** (SplitText `mask: "lines"`, yPercent 110 → 0); media headers add a clip-path wipe on the media | Triggered once (`toggleActions` play/reverse)   |
| Act III header (text-only)                  | Reflection: the reader is walked through the fall, one clause at a time. | **Scroll-synced word emphasis** (words 0.18 → 1 opacity along scroll)                                               | Scrubbed (reading pace = scroll)                |
| Opening address                             | Breath before the record.                                                | Scrubbed typewriter (kept)                                                                                          | Scrubbed                                        |
| 879 `inscriptionReveal`                     | Readability is the event.                                                | **Char sweep** on the master line following the raking light (chars stagger from start, skewX settle)               | Triggered                                       |
| 921 `nameEmerges`                           | A record becomes a name that can be inherited.                           | **Tracking collapse** (chars from ±x spread and depth scale to their seat), no bounce                               | Triggered                                       |
| 1015 `nameEndures`                          | The world changes; the name does not.                                    | **Stillness / dwell** (opacity only, long)                                                                          | Triggered                                       |
| 1042 `dividedKingdom`                       | Division happens in space.                                               | Territories split (kept) + **master words split east/west**                                                         | Scrubbed camera + triggered words               |
| Daha `dahaLiving`                           | A capital that still breathes.                                           | Quiet sine rise (kept)                                                                                              | Triggered                                       |
| 1135 / 1292 `royalConsolidation`            | Scattered authority finds one voice.                                     | **Convergence**: words from both sides to centre                                                                    | Triggered                                       |
| 1157 / … `manuscriptWorld`                  | An archive page opens.                                                   | **Page turn**: lines rotateX from −55° with perspective, clip from left                                             | Triggered                                       |
| 1222 / … `politicalFracture`                | Tension and rupture.                                                     | **Hard cuts**: `steps`-like snap, short expo, tight stagger, lines offset from the right                            | Triggered                                       |
| 1869 / two-bridges `bridgeConstruction`     | The river becomes an engineering problem.                                | **Assembly**: words rise from below, stagger from edges to centre; strokes made perceivable                         | Triggered + scrubbed strokes                    |
| 1912 `bridgeLift`                           | Elevation.                                                               | **Lift**: lines from +y with `power4.out`, date drops from above                                                    | Triggered                                       |
| 1947 `revolutionMachine`                    | Urgency, machine rhythm.                                                 | **Cuts**: alternating-side hard cuts with the fastest stagger on the site                                           | Triggered                                       |
| sugar / people / 1958 `industrialExpansion` | Growth from a small footprint.                                           | **Expansion**: words from centre outward, scale 0.92 → 1                                                            | Triggered                                       |
| 1990 (slug override)                        | A company leaves Kediri for the national market.                         | **Horizontal departure**: lines sweep from the left with a long tail — distinct from 1958                           | Triggered                                       |
| 2024 `runwayTransition`                     | A single line reaches the horizon.                                       | **Tracking opening** on the master line (chars spread from centre) + x sweep                                        | Triggered                                       |
| Finale                                      | Calm resolution.                                                         | **Scale-out** of the image (scrubbed), master line mask reveal, coda dwell stagger, last line tracking collapse     | Scrubbed image + triggered text                 |

Pacing arc: see `docs/MOTION_ARC.md`.

---

## 5. After — ratings and changelog

### 5.1 Ratings before → after

Same three axes. Sections that share a key are rated once. "After" was
verified by the same Playwright pass (rest-state and mid-entrance captures,
desktop 1440×900; mobile 390×844; desktop with reduced motion).

| Section                            | T before → after | V before → after | N before → after | What changed                                                                                                                    |
| ---------------------------------- | ---------------- | ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Prologue                           | 4 → 5            | 4 → 4            | 4 → 4            | Credit and video kept; infinite scroll-cue tween and intro timeline now tracked and killed; overlap bug on reduced/mobile fixed |
| Interlude                          | 3 → 4            | 2 → 4            | 3 → 4            | Clip-path inset wipe per evidence card (scrubbed); pin 550 → 420 %                                                              |
| Act I header                       | 3 → 4            | 2 → 4            | 3 → 4            | Title line-mask reveal (SplitText `mask: "lines"`, `autoSplit`), media dolly kept                                               |
| Opening address                    | 4 → 4            | 4 → 4            | 4 → 4            | Unchanged (already distinct: scrubbed typewriter)                                                                               |
| 879                                | 4 → 5            | 3 → 5            | 4 → 5            | Master line char sweep following the raking light (skew settle, stagger from start)                                             |
| 921                                | 3 → 4            | 3 → 4            | 4 → 5            | KADHIRI tracking collapse from depth (per-char `x` + scale, `settle` ease, no bounce)                                           |
| 1015                               | 4 → 4            | 3 → 3            | 5 → 5            | Deliberate stillness kept (opacity-only, 1.4 s dwell)                                                                           |
| 1042                               | 4 → 5            | 4 → 5            | 5 → 5            | Master words split east/west on top of the spatial territory split                                                              |
| Act II header                      | 2 → 4            | 1 → 4            | 2 → 4            | `wipe` mode: media curtain clip-path + line-mask title                                                                          |
| Daha                               | 3 → 4            | 2 → 3            | 4 → 4            | Quiet sine rise kept; refresh gate covers the video                                                                             |
| 1135 / 1292                        | 3 → 4            | 2 → 4            | 3 → 4            | Words converge from both edges to centre                                                                                        |
| 1157 / 1906 / 1950 / jayabaya      | 3 → 4            | 2 → 4            | 2 → 4            | Page turn: lines rotateX from the left hinge with perspective                                                                   |
| Panji                              | 2 → 2            | 1 → 1            | 2 → 2            | No `choreographyKey` in CMS; intentionally left static (document)                                                               |
| Act III header                     | 2 → 5            | 1 → 5            | 2 → 5            | `scrubWords`: word-by-word emphasis tied to scroll + line-mask title                                                            |
| 1222 / 1293 / shadow / 1678 / 1942 | 3 → 4            | 1 → 4            | 2 → 5            | Hard cuts: `hardCut` CustomEase, 0.32 s, tight stagger, from the right                                                          |
| Act IV–IX headers                  | 2 → 4            | 1 → 4            | 2 → 4            | `card` mode: line-mask title + soft supporting reveal                                                                           |
| sugar / people / 1958              | 3 → 4            | 1 → 4            | 2 → 4            | Expansion: words scale 0.92 → 1 from centre outward (`expo.out`)                                                                |
| 1990                               | 3 → 4            | 1 → 4            | 2 → 4            | Slug override `marketDeparture`: long left sweep — no longer identical to 1958                                                  |
| 1869 / two-bridges                 | 3 → 4            | 2 → 4            | 3 → 4            | Assembly: words rise from edges to centre; strokes made perceivable (opacity 0.62, width 2.5)                                   |
| 1912                               | 3 → 4            | 2 → 4            | 3 → 4            | Lift: `power4.out`, longer travel, date from above                                                                              |
| 1947–1948                          | 3 → 4            | 2 → 5            | 2 → 5            | Machine cuts: alternating sides, 0.24 s, fastest stagger on the site                                                            |
| 2024–2026                          | 3 → 4            | 2 → 4            | 3 → 4            | Tracking opening: chars spread from centre to their seats                                                                       |
| Finale                             | 1 → 4            | 1 → 4            | 2 → 5            | New `FinaleMotion`: scrubbed scale-out, master line mask, coda dwell, last line tracking collapse                               |
| Scene readouts                     | 2 → 4            | 1 → 3            | 2 → 3            | `ScrollTrigger.batch`, `once: true`, viewport-guarded pre-hide                                                                  |
| Brantas thread                     | 4 → 4            | 4 → 4            | 4 → 4            | Unchanged                                                                                                                       |

Adjacency check after: no two adjacent sections share an entrance pattern
(prologue blur → interlude wipe → Act I mask → address typewriter → 879 char
sweep → 921 tracking collapse → 1015 stillness → 1042 split → Act II wipe →
Daha rise → 1135 converge → 1157 page turn → Panji static → Act III scrub
words → 1222 cut → 1292 converge → 1293 cut → … → 1958 expansion → 1990
departure → Act IX mask → two-bridges assembly → 2024 tracking → finale).

### 5.2 Global problems — status

| #   | Status                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Fixed: `SCRIPT_STYLES` table in `director.ts`, one identity per key (+ slug override); act headers, finale, interlude, readouts all have their own technique                                       |
| G2  | Fixed: `modules/motion/refresh.ts` + `MotionRefreshGate` (fonts.ready, first four stage/act media, continuation video), debounced `ScrollTrigger.refresh()`                                        |
| G3  | Fixed: `?motionDebug=1` / `NEXT_PUBLIC_MOTION_DEBUG=1` → markers on every trigger and `window.__kediriMotion.activeTriggers()` (read inside effects only)                                          |
| G4  | Fixed: `ReadoutBatch` island                                                                                                                                                                       |
| G5  | Fixed: `.prologue-opening { display: none }` in the static-flow media block                                                                                                                        |
| G6  | Fixed: nomenclature row rule now applies to all of `(max-width: 47.999rem)`                                                                                                                        |
| G7  | Fixed: bridge strokes visible over the photo                                                                                                                                                       |
| G8  | Not changed (documented): `will-change` on 26 surfaces and readout `backdrop-filter` are design-system CSS; measured scroll sample showed no long frames, so left for a dedicated performance pass |
| G9  | Fixed: ambient tweens tracked and killed in `destroy()`; intro timeline killed too                                                                                                                 |
| G10 | Not changed (low)                                                                                                                                                                                  |
| G11 | Not changed (flagged; `gsap-cinematic/` is Chief's committed reference folder)                                                                                                                     |
| G12 | Not changed: stale e2e contract is pre-existing test debt, see 5.3                                                                                                                                 |
| G13 | Fixed: interlude pin 550 → 420 %                                                                                                                                                                   |
| G14 | Not changed (signature)                                                                                                                                                                            |

### 5.3 Verification evidence

| Check                                                                           | Result                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run typecheck`                                                            | PASS (0 errors)                                                                                                                                                                    |
| `pnpm run lint`                                                                 | PASS (0 errors, 16 pre-existing `noDescendingSpecificity` warnings in `globals.css`)                                                                                               |
| `pnpm run test`                                                                 | PASS — 7 files, 81 tests; token gate 52 contrast checks, 0 raw values                                                                                                              |
| Console (Chromium, `/journey`)                                                  | No page errors; only the pre-existing `favicon.ico` 404                                                                                                                            |
| ScrollTrigger count                                                             | 68 on load with debug flag; 42 after the 26 `once` readout triggers self-kill; 68 again after leaving to `/about` and returning — stable, no orphans                               |
| Scroll frame sample (4 s scripted scroll across 879–1042, headless Chromium)    | 658 frames, mean 6.1 ms, max 12.1 ms, 0 frames over 34 ms. Headless is not a device measurement; DevTools Performance on a real GPU remains a manual check                         |
| Reduced motion (desktop)                                                        | Titles, master lines, act titles, finale, readouts all `opacity: 1` immediately; prologue credit no longer overlaps the plate                                                      |
| Mobile 390×844                                                                  | Prologue readable; 1042 names in their own row below the beats                                                                                                                     |
| Client-side route change (`/journey` → wordmark link to `/` → `history.back()`) | Triggers 68 → 0 → 68; `data-smooth` removed on `/`. Every island reverts; no orphan ScrollTrigger                                                                                  |
| Deep link `/journey#1135-panjalu-jayati` then scroll up to 879                  | Readouts of 879, 921, 1015, 1042 stay `opacity: 1` at landing and after scrolling up (viewport guard works); 1135's own readout is below the landing viewport and reveals on entry |
| Late fonts (CDP `Fetch` pausing the first three `.woff2` requests by 4 s)       | `fonts.ready` at 4.5 s; Act I label stays `opacity: 0` at scrollY 0 both before and after the refresh (no misfire), reaches 1 after scrolling to the header                        |
| Act title line mask                                                             | Two mask wrappers (`overflow: clip`), lines at translateY 92 px before, mid-travel at 4–8 px, 0 at rest                                                                            |
| Playwright e2e (`pnpm test:e2e`, Chromium desktop + Pixel 7)                    | See table below                                                                                                                                                                    |
| Safari (WebKit 2336 via Playwright)                                             | Smoke PASS: no page or console errors, ScrollSmoother active, 1135 master/title and Act I title `opacity: 1` at the rest state                                                     |
| Firefox                                                                         | **Unverified** — the local Playwright Firefox build (`firefox-1538`) has no executable; install it (`npx playwright install firefox`) and rerun the smoke script                   |
| Real-device DevTools Performance panel                                          | **Unverified** — headless frame sampling only                                                                                                                                      |

E2E comparison against the pre-change baseline run in the same environment
(no CMS database attached, so archive/search tests fail identically in both):

| Run                                                                         | Passed | Failed | Skipped |
| --------------------------------------------------------------------------- | ------ | ------ | ------- |
| Baseline (before any change), no database                                   | 52     | 35     | 17      |
| After, no database                                                          | 54     | 33     | 17      |
| Pre-change source (`3a12b87`, checked out temporarily), capsule Postgres up | 72     | 15     | 17      |
| After, capsule Postgres up                                                  | 71     | 16     | 17      |

With the database up, the only test that differs between pre-change source
and HEAD is "home leads into the journey" (desktop). Rerun in isolation on
HEAD three times: 3/3 passed — parallel-worker flakiness already documented
in `.agents/HANDOFF.md`, not a regression. The 15 shared failures are the
stale prologue contracts (G12) and pre-existing early-scene geometry tests.

Production build and gates (run with the capsule compose stack up, after
`db:migrate` + `db:seed`): `pnpm run build` exit 0 (webpack compiled, 15/15
static pages); `check-production-journey.mjs` passed (3 CMS scenes, 0
editorial markers); `verify-production` passed (12 records, 0 critical, 0
warnings).

No test that passed in the baseline fails after the change. Two tests moved
from failing to passing: "home leads into the journey" (desktop; a known
flaky navigation test in this environment) and "prologue disclosure is
complete immediately with reduced motion" (mobile), which is consistent with
the G5 fix. The 33 remaining failures are identical to the baseline set:
archive/search/record tests that need the CMS database, plus the stale
prologue contracts listed under G12.

### 5.4 Changelog

1. `docs/GSAP_AUDIT.md`, `docs/MOTION_ARC.md` — this audit and the pacing arc.
2. `modules/motion/tokens.ts` (new) — shared motion language: CustomEase set
   (`cine`, `cineIn`, `hardCut`, `settle`), `EASES`, `DURATIONS`, `STAGGERS`;
   `MOTION` re-exported for compatibility.
3. `modules/motion/gsap.ts` — registers the ease set from tokens; adds
   `isMotionDebug`, `debugMarkers`, `exposeMotionDebug`.
4. `modules/motion/refresh.ts` + `components/journey/motion-refresh-gate.tsx`
   (new) — refresh after fonts and critical media.
5. `modules/motion/director.ts` — `SCRIPT_STYLES` identities per choreography,
   slug override map, `applyFrom`, ambient tween tracking, intro timeline
   killed on destroy. Cue thresholds unchanged.
6. `modules/motion/scenes.ts` — markers behind the debug flag.
7. `components/journey/act-header-reveal.tsx` — three modes (`card`, `wipe`,
   `scrubWords`), SplitText line masks with `autoSplit`, explicit
   enter/leaveBack control, enabled for every act.
8. `components/journey/prologue-inscription-interlude.tsx` — clip-path wipe,
   pin 420 %.
9. `components/journey/finale-motion.tsx` (new), `readout-batch.tsx` (new).
10. `app/(public)/journey/page.tsx` — mounts the gate, batch, finale island;
    header mode per act.
11. `globals.css` — prologue credit hidden in static flows; nomenclature row
    on all mobile; bridge strokes perceivable.

Design-system changes that motion required (explained): bridge stroke
opacity/width in the photo context (G7) and the interlude pin length (G13).
No content, brand, or token values changed. No new dependencies.

### 5.5 Cinematic pass — 2026-09-04 (Fable 5.1 direction, Opus 5 lanes)

Method: full desktop pass at 1224×1040 and 1440×900 plus a 375×812 mobile pass
of every section of `/journey` on the live dev server, before and after.

| Section(s)                                | Finding                                                                                                                                                                                                                                                                | Change                                                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prologue                                  | Water→copper handoff `transform` rendered as a 54×49 px gold block under the 879 portal; title exit `blur(8px)` left a muddy ghost at ≈0.34; presenter credit sat mid-frame over the city footage; both overture renders carry a tool watermark bottom-right; on mobile the Daha overture copy rendered above "KEDIRI, 2026" | Slim seam; blur 8→3 / 10→6; credit to lower third; interim 1.09× crop on the clips (remove with the clean render); static-flow grid order `"frame" "overture"` |
| Act VI–IX (`data-layout="right"`)         | Shade gradient was left-heavy while the plate sits on the right; in the light era (`colonialIndustrial`) sugar/1906/1912/people were illegible on desktop and mobile                                                                                                    | Mirrored shade for right layout; thicker ivory veil for the light era (desktop + mobile); dark-era right-layout scenes verified unchanged in legibility            |
| 879 / 921 / 1015 / 1042                   | Framing transform had been replaced by `transform: none` (uncommitted 2026-09-03 work), so every Authority Rule 1 window was inert in the browser and the baked "kadhiri" word was visible again                                                                        | Transform restored to the committed form; baked text verified out of frame on desktop and mobile                                                                  |
| 1869 / two-bridges                        | Synthetic renders carry fake archival captions and baked titles (flags F2/F4)                                                                                                                                                                                          | New framing windows + `BAKED_TEXT_BOXES` (REDO-ASSET-005/006), gate-tested                                                                                        |
| Daha / 1135                               | `<video autoPlay>` decoded 19.3 MB from page load, thousands of px below the fold                                                                                                                                                                                       | `media-gate.ts`: IntersectionObserver on `.scene-stage`, reduced motion never plays, poster is the no-JS composition; verified in browser                          |
| Baseline                                  | HANDOFF claimed lint/test green; reality was lint 2 errors and token gate 4 raw values                                                                                                                                                                                  | Fixed; lint 0 errors / 20 legacy warnings, vitest 92, tsc 0, token gate 0 raw, `next build --webpack` exit 0                                                       |

Not run: Playwright e2e (needs a second Next dev server on 4321 while the
4320 server belongs to another session), Sentra-GSAP root gate (script absent
from the Monorepo → FAIL, not neutral), Firefox, real-GPU profiling.
