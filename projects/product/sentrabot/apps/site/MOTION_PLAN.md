# Motion & Mascot Plan — "bring Sentrabot alive"

Scope: the landing page in `apps/site`. Date: 2026-09-02.

## 0. Inputs and constraints (as found in the repo)

| Input | State |
|---|---|
| Repo | `apps/site` — React 19 shell (`src/App.jsx`) that injects static section markup from `src/html/*.html`; behaviour lives in small DOM hooks in `src/hooks/*`; all custom styling in `src/polish.css`. No router, no Tailwind build (compiled CSS is frozen in `public/assets`). |
| Existing motion | Hero walker (`.sb-walk`), Brief scroll scene (`useBriefSequence`), demo iPad step cascade (`useDemoSequence`), testimonial marquee (CSS), FAQ accordion, pricing pill, header scrolled state, hover recipe. All transform/opacity, all with `prefers-reduced-motion` paths. |
| Mascot assets | **One** raster pose: `public/assets/sentrabot-mascot.png` (320×320, 62 KB, trimmed, alpha). Square clay body, two recessed eye slots, two stub arms, four legs. Face colour `#F6E7D0` (shadow side) / `#FBECD7` (lit side). No SVG, no Lottie, no sprite sheet. Brand logomark exists (`sentra-logomark-white.png`). |
| Libraries | None for animation (GSAP was removed as dead code). Repo policy: no new dependencies without a real need, tests offline, no hosted vendor required. Plan below is **zero-dependency** by default; an optional Lottie track is listed for when a designer delivers vector assets. |
| Targets | Assumed: evergreen Chrome/Safari/Firefox, iOS Safari 16+, Android Chrome; mobile is the majority audience (Indonesian consumer/UMKM). |
| Performance budget | Page already ships ~2.5 MB of images. Budget for this plan: ≤ 120 KB of new assets, no layout shift (CLS 0), no main-thread work on scroll beyond the existing rAF loops, LCP untouched (hero screenshot stays the LCP element), mascot idle CPU < 2% on a mid-range Android. |
| Accessibility | Every animation has a `prefers-reduced-motion: reduce` alternative that keeps the information and drops the motion. Mascot is decorative (`aria-hidden`), never the only carrier of meaning. |

**Open questions for the product owner** (answers change the "full polish" milestone only):
1. Can a designer produce a layered SVG of the mascot (body / left eye / right eye / arm L / arm R / legs as separate groups)? That unlocks real limb motion. Without it, everything below still works on the raster.
2. Is a Lottie pipeline acceptable (adds `lottie-web`, ~60 KB gz)? Default answer here is *no* until the SVG exists.
3. Minimum browser floor — anything below Safari 15.4 loses `@media (width < 800px)` range syntax already used in `polish.css`, so the floor is effectively there.

---

## 1. Mascot state system (foundation for everything)

One mascot component, one attribute, CSS does the rest. The raster gets two overlay "eyelids" in the face colour so it can blink and glance without new artwork; everything else is whole-body transform.

### States

| State | When | Motion (raster) | Motion (layered SVG, later) |
|---|---|---|---|
| `idle` | default | breathe: scaleY 1 → 1.015, 3.2 s ease-in-out alternate; blink every 4–7 s (randomised), 120 ms | same + arm micro-sway |
| `walk` | hero band | existing bob + shadow, 60 px/s | leg cycle 4 frames |
| `greet` | first hero view, footer CTA hover | tilt −8° → +6° → 0 over 640 ms (`--sb-ease`), one blink at the end | arm wave |
| `listen` | permission card visible in demo | lean 4° toward the card, eyes wide (eyelids retract 20%), slow bob | head tilt + ear-like arm raise |
| `think` | agent "typing" dots visible | bob 2 px @ 0.9 s, eyes look up-left (pupil overlay), "…" bubble | same |
| `celebrate` | Izinkan pressed, yearly toggle, Brief settles | squash 0.92/1.08 → jump −14% → land 1.06/0.94 → rest, 520 ms | + arms up |
| `sleep` | footer at rest | slow breathe 4 s, eyelids 90% closed, "z" bubble every 6 s | same |
| `error` | (future in-product) | eyes narrow, tilt −4°, single shake 3 px × 2, 280 ms | same |

Transitions between states: 200 ms `--sb-ease` on `transform`, eyelids 120 ms. Only one state at a time; `celebrate` and `greet` are one-shots that return to the previous state via `animationend`.

### Markup (drop-in anywhere)

```html
<div class="sb-mascot" data-state="idle" aria-hidden="true" style="--sb-size: 64px">
  <img class="sb-mascot__body" src="assets/sentrabot-mascot.png" alt="" width="320" height="320" draggable="false">
  <span class="sb-mascot__lid sb-mascot__lid--l"></span>
  <span class="sb-mascot__lid sb-mascot__lid--r"></span>
  <span class="sb-mascot__bubble" hidden></span>
</div>
```

### CSS (add to `src/polish.css`)

```css
.sb-mascot {
  position: relative;
  width: var(--sb-size, 64px);
  height: var(--sb-size, 64px);
  transform-origin: 50% 100%;
  transition: transform 200ms var(--sb-ease);
  will-change: transform;
}
.sb-mascot__body { display: block; width: 100%; height: 100%; object-fit: contain; }

/* Eyelids: face-coloured slabs over the eye slots. Calibrate the four
   numbers once against the PNG (left eye ≈ 33–41% x, right ≈ 58–66% x,
   both ≈ 31–46% y of the trimmed image). */
.sb-mascot__lid {
  position: absolute;
  top: 30%;
  width: 9%;
  height: 17%;
  background: #f6e7d0;
  border-radius: 40%;
  transform: scaleY(0);
  transform-origin: 50% 0;
  transition: transform 120ms ease-in;
}
.sb-mascot__lid--l { left: 33%; }
.sb-mascot__lid--r { left: 58%; background: #fbecd7; }

/* idle */
.sb-mascot[data-state="idle"] .sb-mascot__body { animation: sb-breathe 3.2s ease-in-out infinite alternate; }
.sb-mascot[data-blink] .sb-mascot__lid { transform: scaleY(1); }

/* one-shots */
.sb-mascot[data-state="greet"] { animation: sb-greet 640ms var(--sb-ease) 1; }
.sb-mascot[data-state="celebrate"] { animation: sb-celebrate 520ms var(--sb-ease) 1; }

/* sustained */
.sb-mascot[data-state="listen"] { transform: rotate(4deg) translateY(-2%); }
.sb-mascot[data-state="listen"] .sb-mascot__lid { transform: scaleY(-0.2); }
.sb-mascot[data-state="think"] .sb-mascot__body { animation: sb-think 0.9s ease-in-out infinite alternate; }
.sb-mascot[data-state="sleep"] .sb-mascot__body { animation: sb-breathe 4s ease-in-out infinite alternate; }
.sb-mascot[data-state="sleep"] .sb-mascot__lid { transform: scaleY(0.9); }

@keyframes sb-breathe { from { transform: scaleY(1); } to { transform: scaleY(1.015); } }
@keyframes sb-think   { from { transform: translateY(0); } to { transform: translateY(-3%); } }
@keyframes sb-greet {
  0%   { transform: rotate(0); }
  35%  { transform: rotate(-8deg); }
  70%  { transform: rotate(6deg); }
  100% { transform: rotate(0); }
}
@keyframes sb-celebrate {
  0%   { transform: scale(1, 1); }
  25%  { transform: scale(1.08, 0.92); }
  55%  { transform: translateY(-14%) scale(0.96, 1.06); }
  80%  { transform: translateY(0) scale(1.06, 0.94); }
  100% { transform: scale(1, 1); }
}

/* speech bubble ("…", "z") */
.sb-mascot__bubble {
  position: absolute;
  right: -18%;
  top: -22%;
  padding: 2px 7px;
  border-radius: 999px;
  background: #fff;
  color: var(--sb-ink);
  font: 600 11px/1.2 var(--next-font-switzer);
  box-shadow: 0 2px 6px rgba(13, 17, 23, 0.18);
  animation: sb-bubble-in 220ms var(--sb-ease) both;
}
@keyframes sb-bubble-in { from { opacity: 0; transform: translateY(4px) scale(0.9); } }

@media (prefers-reduced-motion: reduce) {
  .sb-mascot, .sb-mascot__body, .sb-mascot__lid, .sb-mascot__bubble { animation: none !important; transition: none !important; }
  .sb-mascot[data-state="listen"], .sb-mascot[data-state="celebrate"], .sb-mascot[data-state="greet"] { transform: none; }
}
```

### Hook (matches the repo's DOM-hook pattern)

```js
// src/hooks/useMascot.js
import { useEffect } from "react";

const ONE_SHOT = new Set(["greet", "celebrate"]);

export function useMascot(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const mascots = Array.from(root.querySelectorAll(".sb-mascot"));
    if (mascots.length === 0) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = new Set();

    // Blink: randomised so several mascots never blink in sync.
    const scheduleBlink = (el) => {
      const t = window.setTimeout(() => {
        el.setAttribute("data-blink", "");
        const off = window.setTimeout(() => el.removeAttribute("data-blink"), 120);
        timers.add(off);
        scheduleBlink(el);
      }, 4000 + Math.random() * 3000);
      timers.add(t);
    };
    if (!reduce) mascots.forEach(scheduleBlink);

    // One-shot states return to the previous state when the animation ends.
    const onEnd = (event) => {
      const el = event.currentTarget;
      if (ONE_SHOT.has(el.dataset.state)) el.dataset.state = el.dataset.prev || "idle";
    };
    mascots.forEach((el) => el.addEventListener("animationend", onEnd));

    // Public API for other hooks: window.sbMascot.set(el, "celebrate")
    window.sbMascot = {
      set(el, state) {
        if (ONE_SHOT.has(state)) el.dataset.prev = el.dataset.state;
        el.dataset.state = state;
        if (reduce && ONE_SHOT.has(state)) el.dataset.state = el.dataset.prev || "idle";
      },
      say(el, text, ms = 1600) {
        const b = el.querySelector(".sb-mascot__bubble");
        if (!b) return;
        b.textContent = text; b.hidden = false;
        timers.add(window.setTimeout(() => { b.hidden = true; }, ms));
      },
    };

    return () => {
      for (const t of timers) window.clearTimeout(t);
      mascots.forEach((el) => el.removeEventListener("animationend", onEnd));
      delete window.sbMascot;
    };
  }, [rootRef]);
}
```

React-component equivalent (if a page ever moves to JSX):

```jsx
export function Mascot({ state = "idle", size = 64 }) {
  return (
    <div className="sb-mascot" data-state={state} aria-hidden style={{ "--sb-size": `${size}px` }}>
      <img className="sb-mascot__body" src="/assets/sentrabot-mascot.png" alt="" width={320} height={320} draggable={false} />
      <span className="sb-mascot__lid sb-mascot__lid--l" />
      <span className="sb-mascot__lid sb-mascot__lid--r" />
    </div>
  );
}
```

---

## 2. Section-by-section plan

| # | Section | Current state | Motion idea & purpose | Detailed spec | Mascot role & states | Assets | Snippet | Complexity |
|---|---|---|---|---|---|---|---|---|
| 1 | **Hero** | Whole page fades in 240 ms; headline/subhead/CTA static; mascot walks the band under the CTA. | Staggered entrance so the eye lands headline → subhead → CTA; walker greets once when the hero is first seen, then glances at the CTA on hover. Purpose: hierarchy + a first "hello". | Trigger: first paint. Headline `opacity 0→1, translateY(12px→0)`, 420 ms, `cubic-bezier(.22,.9,.28,1)`, delay 80 ms; subhead same, delay 160 ms; CTA same, delay 240 ms. Walker: on `IntersectionObserver` first entry, pause walk 700 ms, play `greet`, resume. CTA `:hover` → walker `listen` (leans toward CTA) while hovered. Mobile: durations ×0.8, no hover branch. | walk → greet (once) → walk; listen on CTA hover | none (raster) | §3.1 | Low — 3 h |
| 2 | **Header** | Logomark + wordmark, scroll state shrinks the tile. | Logomark draws its three strokes once on load (stroke-dashoffset) — a 600 ms "signature". Purpose: brand moment without a mascot in the chrome. | Requires an SVG logomark (`docs/brand` has PNG only). Stroke-dash 600 ms ease-out, once, then static. | none | `sentra-logomark.svg` from design | §3.2 | Low — 2 h once SVG exists |
| 3 | **Testimonials marquee** | Continuous CSS marquee, pauses on hover. | Leave as is. Adding a mascot here competes with real faces/quotes. | — | — | — | — | — |
| 4 | **Demo iPad (DemoDesktop / DemoMobile)** | 8-step chat reveals on scroll; agent messages use the logomark glyph; typing dots exist; permission card (Diizinkan) appears at step 4. | Make the mascot the agent avatar in the chat and let it react to the steps. Purpose: the product's key idea (agent asks, you decide) gets a face. | Avatar 28 px beside agent messages. Step 2 (typing dots): `think` + "…" bubble. Step 3 (asks permission): `listen`. Step 4 (Diizinkan): `celebrate` one-shot. Step 8 (draft ready): `greet`. All driven from `useDemoSequence.paint()` via `window.sbMascot.set`. Scroll-scrubbed: reversing the scroll reverses the state. | think → listen → celebrate → idle → greet | none | §3.3 | Medium — 1 day |
| 5 | **Brief scene** | Notifications fan out, converge, digest slides into the device. | When the digest settles (p ≥ 0.96), mascot peeks up from behind the device bottom-right corner and does `celebrate` once ("done, here's your Brief"). Purpose: closes the scene with the character, not a static screen. | Peek: `translateY(60% → 0)` 360 ms `--sb-ease`, then `celebrate`. Hides again if user scrolls back below p 0.9 (`translateY 0 → 60%`, 200 ms ease-in). Size 72 px desktop, 52 px mobile. | hidden → peek → celebrate → idle | none | §3.4 | Low — 3 h |
| 6 | **Features iPad (3 steps)** | Step chips Pilih bot → Sambungkan → Jalankan cascade on enter. | Mascot hops chip to chip as each step lights up. Purpose: makes the three-step story legible at a glance. | Mascot 26 px sits on the active chip. On step change: `translateX` to next chip, 320 ms `--sb-ease`, with a `celebrate`-style hop (translateY −40%) at the midpoint. Position measured from chip rects at paint time (same approach as `usePricingTabs`). | idle → hop → idle | none | §3.5 | Medium — 4 h |
| 7 | **Privacy** | Lock icon + 4 bullets, static. | Bullets rise in with a 60 ms stagger when the card enters; a small mascot sits on the card's top edge in `sleep` ("nothing to worry about"). Purpose: reinforces the calm message. | `IntersectionObserver` at 35 % → bullets `opacity 0→1, translateY(10px→0)`, 300 ms, stagger 60 ms. Mascot `sleep` with a "z" bubble every 6 s. | sleep | none | §3.6 | Low — 2 h |
| 8 | **Pricing** | Yearly/monthly pill slides; cards static. | Card lift on hover already exists via CTA. Add: toggling to *Tahunan* triggers `celebrate` on a small mascot beside the "hemat 20%" tab; card prices count from the old value to the new one over 320 ms. Purpose: rewards the cheaper choice, makes the delta legible. | Price tween: `requestAnimationFrame`, 320 ms ease-out, format with `Intl.NumberFormat('id-ID')`. Mascot 32 px, absolute-positioned at the right of the tabs. Reduced-motion: prices swap instantly, no mascot animation. | idle → celebrate | none | §3.7 | Low — 3 h |
| 9 | **FAQ** | Accordion with height transition (600 ms `--ease-out-expo`) and chevron rotate. | Shorten to 320 ms (current 600 ms is above the 500 ms ceiling), add 8 px translateY on the answer text. No mascot. | Height 320 ms `--ease-out-expo`; answer `opacity 0→1, translateY(8px→0)` 240 ms, delay 60 ms. | — | — | §3.8 | Low — 1 h |
| 10 | **Footer** | CTA card, static logomark. | Mascot in `sleep` beside the copy "Bebaskan diri dari kerjaan rutin" — it did the work, now it rests. On CTA hover it wakes: `greet`. Purpose: ends the page on the character. | Mascot 72 px desktop / 56 px mobile, left of the CTA. `sleep` by default with "z" bubble every 6 s; CTA `:hover`/`:focus-visible` → `greet` once, then `idle` for 4 s, then back to `sleep`. | sleep → greet → idle → sleep | none | §3.9 | Low — 2 h |
| 11 | **Global: eye gaze** | Eyes are fixed. | Pupils follow the pointer within ±3 px on desktop. Purpose: the cheapest "alive" signal there is. | Two 3 px pupils (dark ink) overlaid inside the eye slots; `pointermove` throttled by rAF sets `--gx/--gy` in [−1, 1] on `.sb-mascot`; pupils `translate(calc(var(--gx) * 3px), calc(var(--gy) * 2px))`. Off on touch devices and under reduced-motion. | idle | none | §3.10 | Low — 2 h |

---

## 3. Snippets

### 3.1 Hero entrance + greet on first view (vanilla, fits `useHeaderState`/`useMascot` pattern)

```css
.sb-enter { opacity: 0; transform: translateY(12px); }
.sb-enter[data-in] { opacity: 1; transform: none; transition: opacity 420ms cubic-bezier(.22,.9,.28,1), transform 420ms cubic-bezier(.22,.9,.28,1); }
.sb-enter[data-in]:nth-child(1) { transition-delay: 80ms; }
.sb-enter[data-in]:nth-child(2) { transition-delay: 160ms; }
.sb-enter[data-in]:nth-child(3) { transition-delay: 240ms; }
@media (width < 800px) { .sb-enter[data-in] { transition-duration: 340ms; } }
@media (prefers-reduced-motion: reduce) { .sb-enter { opacity: 1; transform: none; transition: none; } }
```

```js
// after mount
const hero = root.querySelector("main section");
hero.querySelectorAll(":scope > div:first-child > *").forEach((el) => el.classList.add("sb-enter"));
requestAnimationFrame(() => hero.querySelectorAll(".sb-enter").forEach((el) => el.setAttribute("data-in", "")));

// greet once when the walker's band is on screen
const walker = root.querySelector(".sb-walk__runner");
const io = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  io.disconnect();
  walker.style.animationPlayState = "paused";
  window.sbMascot.set(walker, "greet");
  setTimeout(() => { walker.style.animationPlayState = ""; }, 700);
}, { threshold: 0.6 });
io.observe(walker);
```

Note: the current walker markup (`.sb-walk__runner > img`) needs the two `.sb-mascot__lid` spans added to blink; it already has the transform-origin at the feet.

### 3.2 Logomark stroke draw (needs SVG)

```css
.sb-brand__mark path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: sb-draw 600ms cubic-bezier(0,0,.2,1) forwards; }
.sb-brand__mark path:nth-child(2) { animation-delay: 90ms; }
.sb-brand__mark path:nth-child(3) { animation-delay: 180ms; }
@keyframes sb-draw { to { stroke-dashoffset: 0; } }
```
Use `pathLength="1"` on each path so the dash maths is unit-free.

### 3.3 Demo chat avatar reacting to steps (hook into `useDemoSequence`)

```js
// in paint(group, step), after the data-seq attributes are applied:
const avatar = group.runway.querySelector(".sb-mascot");
if (avatar && window.sbMascot) {
  const state = step <= 1 ? "idle" : step === 2 ? "think" : step === 3 ? "listen" : step === 4 ? "celebrate" : step >= 8 ? "greet" : "idle";
  if (avatar.dataset.state !== state) window.sbMascot.set(avatar, state);
  if (step === 2) window.sbMascot.say(avatar, "…", 1200);
}
```
Markup: replace the glyph next to each agent message with `<div class="sb-mascot" data-state="idle" style="--sb-size:28px">…</div>` once per iPad (one shared avatar positioned beside the latest agent message is enough — fewer animating nodes).

### 3.4 Brief scene ending (hook into `useBriefSequence.paint`)

```js
const peek = stage.querySelector(".sb-brief-peek");
const shown = p >= 0.96;
if (peek && peek.dataset.shown !== String(shown)) {
  peek.dataset.shown = String(shown);
  peek.style.transform = shown ? "translateY(0)" : "translateY(60%)";
  if (shown && window.sbMascot) window.sbMascot.set(peek.querySelector(".sb-mascot"), "celebrate");
}
```
```css
.sb-brief-peek { position: absolute; right: calc(50% - var(--shell-half, 275px) - 20px); bottom: 8%; transform: translateY(60%); transition: transform 360ms var(--sb-ease); z-index: 4; }
```

### 3.5 Features hop between chips

```js
const chips = [...runway.querySelectorAll("[data-step-chip]")];
const rider = runway.querySelector(".sb-mascot");
function ride(step) {
  const chip = chips[step - 1]; if (!chip) return;
  const c = chip.getBoundingClientRect(), r = runway.getBoundingClientRect();
  rider.style.transform = `translate3d(${c.left - r.left + c.width / 2}px, ${c.top - r.top}px, 0) translate(-50%, -100%)`;
  window.sbMascot.set(rider, "celebrate"); // the hop
}
```
`.sb-mascot` here gets `transition: transform 320ms var(--sb-ease)` and `position:absolute; left:0; top:0`.

### 3.6 Privacy bullets stagger

```css
.privacy-module__DjJjcq__privacy li { opacity: 0; transform: translateY(10px); }
.privacy-module__DjJjcq__privacy[data-in] li { opacity: 1; transform: none; transition: opacity 300ms cubic-bezier(0,0,.2,1), transform 300ms cubic-bezier(0,0,.2,1); }
.privacy-module__DjJjcq__privacy[data-in] li:nth-child(2) { transition-delay: 60ms; }
.privacy-module__DjJjcq__privacy[data-in] li:nth-child(3) { transition-delay: 120ms; }
.privacy-module__DjJjcq__privacy[data-in] li:nth-child(4) { transition-delay: 180ms; }
```
Trigger with the same `getBoundingClientRect` visibility test the demo hook uses (IntersectionObserver misfires under device emulation — see comment in `useDemoSequence.js`).

### 3.7 Price count-up (in `usePricingTabs.apply`)

```js
function tween(el, from, to, ms = 320) {
  const t0 = performance.now(); const fmt = new Intl.NumberFormat("id-ID");
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
    el.textContent = `Rp${fmt.format(Math.round(from + (to - from) * e))}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
```
Keep `PLANS` as numbers and format on paint; reduced-motion → set text directly.

### 3.8 FAQ timing

```css
.accordion-module__tWMLDa__body { transition-duration: 320ms; }
.accordion-module__tWMLDa__body p { opacity: 0; transform: translateY(8px); transition: opacity 240ms 60ms cubic-bezier(0,0,.2,1), transform 240ms 60ms cubic-bezier(0,0,.2,1); }
.faq-module__O8tnPq__faq__item[data-open] .accordion-module__tWMLDa__body p { opacity: 1; transform: none; }
```
`useFaqAccordion` already toggles height; add `data-open` on the item.

### 3.9 Footer sleeper

```html
<div class="sb-mascot sb-footer-mascot" data-state="sleep" aria-hidden="true" style="--sb-size:72px">…</div>
```
```js
const cta = footer.querySelector('a[href="/workspace"]'); const m = footer.querySelector(".sb-mascot");
const wake = () => { window.sbMascot.set(m, "greet"); setTimeout(() => window.sbMascot.set(m, "sleep"), 4000); };
cta.addEventListener("pointerenter", wake); cta.addEventListener("focus", wake);
setInterval(() => m.dataset.state === "sleep" && window.sbMascot.say(m, "z", 1400), 6000);
```

### 3.10 Eye gaze

```css
.sb-mascot__pupil { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--sb-ink); top: 39%; transform: translate(calc(var(--gx, 0) * 3px), calc(var(--gy, 0) * 2px)); transition: transform 120ms ease-out; }
.sb-mascot__pupil--l { left: 36%; } .sb-mascot__pupil--r { left: 61%; }
@media (hover: none), (prefers-reduced-motion: reduce) { .sb-mascot__pupil { transform: none; } }
```
```js
let raf = 0;
window.addEventListener("pointermove", (e) => {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    for (const m of document.querySelectorAll(".sb-mascot")) {
      const r = m.getBoundingClientRect();
      const gx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 200));
      const gy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 200));
      m.style.setProperty("--gx", gx.toFixed(2)); m.style.setProperty("--gy", gy.toFixed(2));
    }
  });
}, { passive: true });
```

---

## 4. Storyboard — the mascot's arc down the page

```
HERO        walk ──► (first view) greet ──► walk ──► [CTA hover] listen
              │
DEMO iPad   think "…" ──► listen (asks permission) ──► celebrate (Diizinkan) ──► greet (draft ready)
              │
BRIEF       (hidden while notifications fly) ──► peek from behind the device ──► celebrate ──► idle
              │
FEATURES    hop chip 1 ──► hop chip 2 ──► hop chip 3
              │
PRIVACY     sleep, "z"
              │
PRICING     [Tahunan] celebrate
              │
FOOTER      sleep ──► [CTA hover] greet ──► idle ──► sleep
```
The same character, one attribute, states escalate from "working" (hero/demo) to "done" (Brief/pricing) to "resting" (privacy/footer) — that is the product's promise told by the mascot.

---

## 5. Roadmap

**Status 2026-09-02:** milestones 1 and 2 are implemented (`src/hooks/useMascot.js`, `useMascotScenes.js`, scene wiring in `useDemoSequence`, `useBriefSequence`, `usePricingTabs`, `useFaqAccordion`; styles under "Mascot system" in `src/polish.css`). Milestone 3 waits on design assets.

**Milestone 1 — quick wins (1–2 days)**
1. Mascot state system: CSS + `useMascot` + eyelids on the existing walker (§1) — 4 h
2. Hero entrance stagger + greet-on-first-view + listen-on-CTA-hover (§3.1) — 3 h
3. Footer sleeper (§3.9) — 2 h
4. FAQ timing fix (§3.8) — 1 h
5. Eye gaze (§3.10) — 2 h

**Milestone 2 — mid-level (3–5 days)**
6. Demo iPad avatar reacting to steps, desktop + mobile trees (§3.3) — 1 day
7. Brief ending peek + celebrate (§3.4) — 3 h
8. Features chip hop (§3.5) — 4 h
9. Privacy stagger + sleeper (§3.6) — 2 h
10. Pricing count-up + celebrate (§3.7) — 3 h

**Milestone 3 — full polish (1–2 sprints, needs design)**
11. Layered SVG mascot (body, eyes, arms, legs) → real wave, real leg cycle for the walker, ear-raise for `listen`. Replace the raster in `.sb-mascot__body` with inline SVG; keep the same `data-state` contract so nothing else changes.
12. Optional Lottie track for `celebrate`/`greet` if the designer prefers After Effects: `lottie-web` light build, lazy-loaded on first `IntersectionObserver` hit, `renderer: 'svg'`, JSON ≤ 25 KB each after `lottie-compress`.
13. SVG logomark stroke-draw (§3.2).
14. Walker sprite sheet (4 frames × 320 px, WebP, ~40 KB) if the SVG route is not taken — `steps(4)` animation on `background-position`.

---

## 6. Acceptance criteria

- [ ] Every animation is `transform`/`opacity` only (DevTools > Rendering > Paint flashing shows no repaint on the mascot while idle).
- [ ] `prefers-reduced-motion: reduce`: no mascot movement, no entrance offsets, all content visible; blink and gaze disabled; one-shots resolve to their end state instantly.
- [ ] No animation runs longer than 700 ms except sustained idle loops (breathe 3.2 s, walk, marquee), each of which pauses on hover or is off-screen-paused.
- [ ] Off-screen mascots do not animate: `useMascot` pauses `data-state` loops when the element is not intersecting (add an IO with `rootMargin: 20%`).
- [ ] CLS = 0: every mascot slot has explicit `width`/`height`; eyelids and bubbles are absolutely positioned.
- [ ] LCP element unchanged (hero screenshot); Lighthouse mobile performance score does not drop by more than 2 points against the pre-change baseline.
- [ ] New asset weight ≤ 120 KB total; the raster mascot is reused (no second copy).
- [ ] Keyboard: nothing here is focusable; footer/hero greet also fires on `:focus-visible` of the CTA.
- [ ] Screen readers: all mascot nodes `aria-hidden="true"`; bubbles carry no information that is not in the page text.
- [ ] Works at 375, 768, 1440 with no horizontal overflow (`scrollWidth === innerWidth`).

## 7. QA test cases

| # | Steps | Expected |
|---|---|---|
| 1 | Load at 1440, wait 1 s | Headline, subhead, CTA appear in order 80/160/240 ms; walker pauses, tilts, resumes once. |
| 2 | Hover hero CTA | Walker leans 4° toward the CTA while hovered; returns within 200 ms after leaving. |
| 3 | Scroll the demo iPad slowly | Avatar: think with "…" at step 2, listen at 3, one hop at 4, greet at 8; scrolling back reverses without stuck states. |
| 4 | Scroll to the end of the Brief scene | Mascot peeks from the device corner and hops once; scroll back above 90 % → it slides away. |
| 5 | Toggle Tahunan ↔ Bulanan | Prices tween 320 ms; mascot hops only when switching to Tahunan. |
| 6 | Enable OS reduced motion, reload | None of 1–5 animate; states show final frames; page fully usable. |
| 7 | Mobile 375, touch | No gaze; walker 48 px; entrance durations ~340 ms; no overflow. |
| 8 | Leave tab for 60 s, return | Idle loops resume without a burst of queued blinks (timers are cleared on `visibilitychange`). |
| 9 | Tab through the page | Every CTA still shows the two-tone focus ring; greet fires on focus of hero/footer CTAs. |
| 10 | Lighthouse mobile, 3 runs | Performance within 2 points of baseline; no new "Avoid non-composited animations" warnings. |

## 8. Trade-offs

- **Raster + overlays now, SVG later.** The only mascot asset is a PNG. Face-coloured eyelids and whole-body transforms give idle/blink/greet/celebrate today without waiting for design; the `data-state` contract stays the same when a layered SVG arrives, so nothing built in milestones 1–2 is thrown away.
- **No animation library.** CSS keyframes + the repo's existing rAF hooks cover every spec here; GSAP/Framer would add 30–60 KB gz for timelines we do not need. Lottie is deferred until there is a Lottie file worth loading.
- **State attribute over class soup.** One `data-state` per mascot keeps the rules readable and makes "one state at a time" a structural guarantee.
- **Scroll-scrubbed states in the iPads** (reversible) rather than time-based one-shots, because the demo already scrubs — a state that fires once and cannot rewind would desync from the scroll.
- **Few, meaningful moments** over ambient motion everywhere. The marquee and FAQ get no mascot on purpose; the character shows up where the product does something (asks, delivers, rests).
