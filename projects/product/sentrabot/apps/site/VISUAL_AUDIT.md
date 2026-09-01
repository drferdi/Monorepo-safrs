# Visual Audit — Sentra Bot landing (`apps/site`)

Date: 2026-09-02. Scope: visual quality only. Concept, section order, copy, brand tokens are out of scope unless broken.

Method: source read (`src/html/*.html`, `src/hooks/*.js`, `public/assets/*.css`) plus live render of the Vite dev server at 1440×900, 768×1024 and 375×812, with computed-style and layout measurements taken in the page.

Baseline facts that shape every finding below:

- The page is a pixel clone of a captured Next.js/Webflow site. All CSS is pre-compiled (`public/assets/62d1d5e45a60.css`, 62 KB). No Tailwind build exists, so any new rule must be authored as plain CSS.
- Sizing uses a fluid unit: `min(calc(N * 100 / var(--device-width) * 1vw), Npx)`. `--device-width` is 393 below 800px and 1440 above. There is no tablet tier.
- Content is injected as one static HTML string (`src/App.jsx`) and enhanced by four DOM hooks. `src/app.js` (GSAP/ScrollTrigger) and `src/site.css` are never loaded — dead files.
- Page height: 13 045 px at 1440, 12 717 px at 375.

---

## CRITICAL

### C1. "Brief" section is a 3 600 px dead scroll with a frozen frame
`src/html/Brief.html` contains a 77-frame image sequence (3.96 MB) inside a sticky `100svh` block, padded by three spacer divs (1080 + 1080 + 1440 px). The scrubbing script that drove it lived in `src/app.js`, which is not loaded. Result: the reader scrolls almost four screens past a single static phone image. Measured: section height 3 887 px (desktop), 3 619 px (mobile); frames visible = 1 of 77 (38 rendered per breakpoint).
Fix options (layout structure preserved — the sticky stage stays, only the runway is put to use):
- (a) Drive the sequence with the existing `useDemoSequence` measurement loop: map runway progress to frame index, toggle `visibility`. Zero new dependencies, reuses the exact approach used for the two demo iPads.
- (b) If motion is not wanted, collapse the runway to one screen and keep the final frame.
Recommendation: (a). It restores the intended scroll narrative and the 77 frames already shipped stop being wasted bytes.

### C2. Focus ring is invisible on the page's own background
`:focus-visible { outline: 2px solid var(--color-contrast) }` and `--color-contrast: #117bc8` — the same blue as `body` and the sky. Keyboard users get no visible focus on the hero CTA, nav pill, demo CTAs, or FAQ buttons. WCAG 2.4.7 failure.
Fix: two-tone ring (`outline: 2px solid #fff; outline-offset: 3px; box-shadow: 0 0 0 5px rgba(0,0,0,.55)`) that reads on sky, grass, white cards and the navy footer alike.

---

## HIGH

### H1. Background painting ends before the page does — hard seam
The 1440×12467 painting (`3b088bdb031e.webp`) sits in a wrapper with a fixed aspect ratio. The page is taller than the image (13 045 vs 12 121 rendered at 1440; 12 717 vs 12 467 at 375), so the last ~900 px (FAQ tail + footer) sit on flat `#117bc8` after dark green. Visible in every breakpoint.
Fix: make the image fill the wrapper (`inset:0; object-fit: cover; object-position: top center`). The scale factor is ≤ 1.08, so crop is negligible. Add a fallback wrapper background sampled from the image bottom (`#4f8438` before the multiply overlay) so any residual gap matches.

### H2. Tablet (600–799 px) renders the 393 px phone layout, left-aligned
At 768 px: `--device-width` is 393, every `dr-*` value hits its px cap, content column is 357 px (46% of viewport), and the fixed header is `dr-w-393` so the nav pill floats next to the logo instead of at the right edge. Screens 600–799 px wide (small tablets, split-screen laptops, landscape phones) look unfinished.
Fix: a tablet-only override block `@media (min-width: 600px) and (max-width: 799.98px)`: header wrapper `width: 100%`, the four capped columns (`dr-w-357`, `dr-w-393`, `dr-w-451`, testimonial/pricing/FAQ widths) become `min(92vw, 640px)`. No breakpoint restructure, no new markup.

### H3. Text contrast below WCAG AA in four places
Measured against the rendered backgrounds:
| Element | Style | Approx. ratio |
|---|---|---|
| FAQ answers | white @ opacity .56 on 50% black over green | ~3.9:1 |
| Privacy bullet body | white @ .7 on 5% black over mid green | ~3.4:1 |
| Pricing tax note | `#E6ECF4` @ .72 on green | ~3.2:1 |
| Footer copyright | white @ .62 on navy | ~4.3:1 |
Fix: raise opacities to .78–.85 (FAQ/privacy/pricing note), .72 for the copyright. Colours stay white; only alpha moves.

### H4. Body text on mobile is 12–13 px in the narrative sections
`p-xxl` (demo body copy) resolves to 13.36 px / 16.6 px line-height on a 375 px viewport; `p-s` (privacy, FAQ answers) and `cta-md-s` (testimonials) likewise 13.36 px. The hero subhead is 17 px, so the jump to 13 px immediately after reads as a downgrade.
Fix: mobile floor of 15 px for `.p-xxl`, 14 px for `.p-s`/`.cta-md-s`, line-height 1.45. Desktop untouched.

### H5. Interactive targets under 44 px on touch
Hero CTA 42 px tall, pricing CTAs 39 px, header pill 34 px, pricing tabs 38 px, `Masuk` link 13 px text with no padding. Apple HIG / WCAG 2.5.8 minimum is 44 px (24 px absolute floor).
Fix: mobile-only `min-height: 44px` on pill buttons; give `Masuk` vertical padding equal to the pill so its hit area matches.

---

## MEDIUM

### M1. Hover states are inconsistent and the shadow is off-axis
Three different hover vocabularies exist: white pills go grey `#d6d6d6` + `-3px 4px 4px` shadow + `backdrop-blur 20px` (hero, header, footer); glass buttons lighten `#ffffff15` (demo, brief); black pricing CTAs only reveal an arrow. The negative-x shadow implies a light source from the right that nothing else on the page uses. `backdrop-blur` on a solid white pill does nothing.
Fix: one hover recipe per button family. White pill: `translateY(-1px)` + `0 6px 16px -6px rgba(0,0,0,.35)` with `--ease-out-quint`, 220 ms. Black pill: same lift, arrow slides in. Glass: keep the lighten, add the lift. Remove the dead `backdrop-blur` and the off-axis shadow.

### M2. Marquee has no reduced-motion path and 5× the DOM it needs
`useMarquee` animates `translate3d(-50%)`, which requires exactly two copies of the card list. `Testimonials.html` ships ten copies (80 cards, 95 KB of markup). `prefers-reduced-motion` is ignored; the two rows keep scrolling.
Fix: keep two copies (structure and visual output identical); pause the animation under `prefers-reduced-motion: reduce` and on `:hover` of the row so quotes can be read.

### M3. Testimonial avatars mix photos and monograms
Raka, Andi, Bima etc. use JPEG portraits; Sari and Dewi use text monograms (`SW`, `DL`). In the same row the eye reads this as an error.
Fix (visual only, no content change): render every avatar as a monogram on a brand-tinted disc, or every one as a photo. Monograms are recommended — `IMAGE-SWAP.md` records that real faces were deliberately removed, and monograms sidestep the fictional-endorsement risk logged there.

### M4. Fixed header has no scrolled state
The logo tile and nav pill are the same at scroll 0 and at 11 000 px over the dark-green FAQ. Modern landing pages shrink or tint the bar once content passes beneath it; here the white tile hard-cuts against every background.
Fix: `scrollY > 24` toggles a class that drops the tile shadow, tightens padding by 4 px, and gives the pill a 1 px `rgba(255,255,255,.35)` inner border. 80 ms of transition. Purely additive; markup unchanged.

### M5. Demo iPad stage is mostly empty at step 1
On mobile the first demo screen (`DemoMobile.html`) shows a 460 px dark panel whose only content is one message bubble at the bottom; the top 60% is empty `#0D1117`. Same at 768 px.
Fix: anchor the conversation to the top of the stage (`justify-content: flex-start`) with the composer pinned bottom, so step 1 reads as a chat that has started, not a blank screen.

### M6. Display type is set too tight for the serif
`.h2` and `.h4` use `line-height: 102%`; `.h4-l` at 24.8 px renders with 25.3 px leading, so multi-line demo headings ("Agen menyiapkan hal yang benar-benar Anda butuhkan") collide at ascender/descender. Signifier's tall ascenders need ≥ 1.1.
Fix: `.h2`/`.h4`/`.h4-l` line-height 1.1; add `letter-spacing: -0.01em` to `.h1`/`.h2` at desktop size for optical tightness that the tight leading was trying to fake. Sizes unchanged.

### M7. First paint is blank blue until React runs
Everything is injected client-side. Until `main.jsx` executes, the viewport is a flat `#117bc8` rectangle. Fonts are only discovered after the CSS parses.
Fix: `<link rel="preload" as="font">` for the two faces used above the fold (Signifier 300, Switzer), `<link rel="preload" as="image">` for the hero screenshot and the top of the painting; a one-shot `opacity 0 → 1` (240 ms) on `#root` so the content fades in instead of popping. No skeleton needed — the page is static and the JS bundle is small.

### M8. Page weight 6.3 MB of images, 1.5 MB of it a single background
`3b088bdb031e.webp` (1440×12467) is loaded eagerly at 1.49 MB on every device, including 375 px phones that display it at 1440 px wide and translated -10%. The 77 Brief frames add 3.96 MB, all requested at once because they are `loading="lazy"` inside a sticky container that is already in view.
Fix: `srcset` with a 720 px variant of the painting for ≤ 799 px; once C1 drives the sequence, only the current ± 2 frames need `visibility: visible` but all still download — acceptable after the fix since they finally serve a purpose. No image content changes.

---

## LOW

### L1. Dead code shipped in the bundle
`src/app.js` (8.7 KB, GSAP hooks for sections that do not exist), `src/site.css` (39 KB, a separate token system), `src/vendor/*.js`. None is imported. Delete or move to `original/`.

### L2. Hidden developer palette in the DOM
`src/html/PostMain.html` carries a hidden floating-ui dialog with six emoji buttons (`grid / studio / stats / dev / minimap / webgl`) from the source site's debug overlay. Remove.

### L3. Pricing CTAs open a new tab for an internal route
All four plan buttons carry `target="_blank" rel="noopener"` to `/workspace`, as do the demo, brief, features and footer CTAs. Hero and header CTAs do not. Inconsistent, and new-tab for an in-product link is unexpected. (Behavioural, listed for completeness; change only with product owner OK.)

### L4. Footer wordmark asset is a low-contrast raster
`5c034dcd3ece.png` (47 KB) renders at 147 px as a dark tile with barely legible micro-text ("SENTRA HAI — …"). Either export an SVG wordmark or drop the tile and use the type lockup that already exists in the header.

### L5. `color-scheme: light dark` on `:root` with a light-only design
Form controls and scrollbars may flip to dark UI on users with a dark OS theme while the page stays light. Set `color-scheme: light`.

### L6. `lenis` class on `<html>` with no Lenis instance
Harmless (`height:auto` rules), but misleading. Remove the class.

---

## Not changed on purpose

- **Brand blue.** Real controls use `#117bc8` (the source site's theme) while the illustrative mockups use Sentra's `#5B8CFF` / `#0D1117`. `IMAGE-SWAP.md` (Wave 19) already flags this as an open product decision. This audit does not touch it; it needs an explicit go from the product owner because it changes the page's dominant colour.
- **Fictional testimonials, unconfirmed annual prices, unverified security claims.** Content matters, logged in `REBRAND.md`; outside a visual audit.
- **Section order and the dual desktop/mobile demo markup.** Structure is frozen by the brief.

---

## Resolution log (2026-09-02)

All changes live in `src/polish.css` (overrides, loaded after the compiled stylesheet), two new hooks, and small attribute-level edits to the section markup. Section order, copy, and images are unchanged.

| Finding | Status | Where |
|---|---|---|
| C1 Brief dead scroll | Fixed. New `useBriefSequence` drives a three-phase scene on the existing runway: lock-screen holds, six notifications fan out, they converge back and the phone becomes the white shell, the digest slides in clipped to the screen and settles on its last section. Both 38-frame "sequences" turned out to be 38 copies of one image each; they are now one `<img>` each, cutting 3.8 MB of duplicate requests. Reduced-motion shows the settled state. | `src/hooks/useBriefSequence.js`, `src/html/Brief.html` |
| C2 Focus ring | Fixed. Two-tone ring, verified by keyboard on the hero CTA (`outline: 2px #fff`, `box-shadow: 0 0 0 5px rgba(13,17,23,.6)`). | `polish.css` |
| H1 Background seam | Fixed. Painting fills the page (`top:0; bottom:0; object-position: top`), gradient placeholder while it decodes. | `polish.css`, `MainPreamble.html` |
| H2 Tablet tier | Fixed. 600–799 px: header spans the viewport, columns widen to `min(92vw, 640px)`, hero shot and Brief phone capped separately. | `polish.css` |
| H3 Contrast | Fixed. FAQ answers .56 → .84, privacy body .70 → .88, tax note .72 → .90, copyright .62 → .76. | `polish.css`, `Pricing.html`, `Footer.html` |
| H4 Mobile type | Fixed. `.p`/`.p-xxl` 15 px, `.p-s`/`.cta-md-s`/`.username` 14 px, line-height 1.45 below 800 px. | `polish.css` |
| H5 Touch targets | Fixed. Hero/pricing/footer CTAs 44 px, header pill and `Masuk` 42 px, pricing tabs 44 px on mobile. | `polish.css` |
| M1 Hover recipe | Fixed. One lift + soft shadow recipe per button family; off-axis shadow and dead `backdrop-blur` removed from hero/header/footer pills (`sb-pill`). | `polish.css`, `Hero.html`, `Header.html`, `Footer.html` |
| M2 Marquee | Fixed, and a worse bug found on the way: the ten inner copies were each animated independently in alternating directions, so the right half of the row went blank after ~45 s. Now one inner with two copies of the eight cards (second copy `aria-hidden`), pure CSS animation, paused on hover and under reduced-motion. `useMarquee.js` deleted. | `polish.css`, `Testimonials.html` |
| M3 Avatars | Not an issue. On inspection every avatar is already a monogram image (`RP`, `SW`, …); the earlier "photo" read was wrong. No change. | — |
| M4 Header scrolled | Fixed. `data-scrolled` after 24 px: logo tile scales to .9, nav pill gains a shadow. | `useHeaderState.js`, `polish.css` |
| M5 Empty demo stage | Accepted as is. Bottom-anchored messages are the chat convention and the stage fills over the eight steps; moving them to the top would read as a list, not a conversation. | — |
| M6 Display leading | Fixed. `.h2` 1.08, `.h3` 1.14, `.h4`/`.h4-l` 1.12, `-0.01em` tracking on `.h1`/`.h2`. | `polish.css` |
| M7 First paint | Fixed. Preload for Signifier 300, Switzer, and the breakpoint-matched hero screenshot; 240 ms fade on the page wrapper React injects (not `#root`, which exists before React runs). Ground colour behind the painting and before first render stays the sampled sky blue, not the accent. | `index.html`, `polish.css` |
| M8 Page weight | Partly fixed via C1 (−3.8 MB). The 1.5 MB painting is unchanged; a 720 px variant needs an asset export and is left for the asset owner. | — |
| L1 Dead code | Fixed. `src/app.js`, `src/site.css`, `src/vendor/`, `src/hooks/useMarquee.js` removed. | — |
| L2 Debug palette | Fixed. Hidden floating-ui dialog removed from `PostMain.html`. | — |
| L3 `target="_blank"` | Left as is (behavioural, needs product owner). | — |
| L4 Footer wordmark | Left as is (needs an asset export). | — |
| L5 `color-scheme` | Fixed: `light`. | `polish.css` |
| L6 `lenis` class | Fixed: removed from `<html>`. | `index.html` |
| Brand blue | Product owner chose the brand accent. `--color-primary`/`--color-contrast` are now `#5B8CFF`; the header pill uses ink text (`#0D1117`) on it because white on `#5B8CFF` is 3.2:1. Body fallback colour follows. | `polish.css` |

Follow-up (same day, product owner request): header and footer now use the official white logomark from `docs/brand/00-MASTER-LOGO` (trimmed to 256 px, 19 KB) with a Switzer wordmark; the logo button scrolls to top as its label promised. The clay mascot (`sentrabot-mascot.png`, 320 px) walks left to right in the empty band between the hero CTA and the screenshot card at 60 px/s, with an alternate-direction bob and counter-scaling ground shadow; hover pauses it, reduced-motion parks it at the right end. Transform/opacity only.

Follow-up 2: the digest overflowed the device frame. The panel is now clipped on all four sides to the shell's screen (bezel 2.6% × 1.6%, corner radius 7%), sized to the screen width minus a gutter, kept clear of the camera island and home indicator, and drawn on a light screen surface with an iOS-style frosted status bar (time, signal, wifi, battery). Heading and the "Semua agen" chip switch to ink so they read on the surface.

Verified on the Vite dev server at 1440×900, 768×1024 and 375×812: no horizontal overflow, no console errors on a fresh load, `npm run build` clean.

## Verification plan

1. `npm run build` completes with no warnings beyond the pre-existing ones.
2. No console errors at 375 / 768 / 1440.
3. Keyboard `Tab` through the page: every focus stop is visible on its background.
4. Contrast spot-checks on the four H3 elements ≥ 4.5:1.
5. Brief sequence: frame index advances with scroll and rewinds; under `prefers-reduced-motion` the final frame shows.
6. No horizontal overflow at any of the three widths (`scrollWidth === innerWidth`).
7. Tablet 768: header spans the viewport, content column ≥ 600 px.
