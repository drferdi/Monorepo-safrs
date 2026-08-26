# Sentra-GSAP Verification & Visual Review

## Evidence hierarchy

A claim is not evidence. Sentra-GSAP completion requires:
1. static source audit;
2. repository typecheck/lint/test/build;
3. live browser QA;
4. visual screenshot evidence;
5. independent motion/design review;
6. final verifier PASS.

Missing required evidence is `NOT-RUN`, and `NOT-RUN` is a failure for required gates.

## Browser matrix

Default coverage:
- Chromium: mobile 390×844, tablet 768×1024, laptop 1024×768, desktop 1440×900.
- Firefox: mobile + desktop.
- WebKit: mobile + desktop.
- Chromium reduced-motion smoke: mobile + desktop.

The browser QA captures screenshots and checks page/console errors, global horizontal overflow, basic semantic/accessibility failures, cumulative layout shift, and severe long tasks. These checks are guardrails, not a replacement for DevTools profiling.

## Route-transition journey

For multi-route sites configure a journey such as:

```js
browser: {
  routes: ['/', '/work'],
  journeys: [
    {
      name: 'home-work-home',
      from: '/',
      click: 'a[href="/work"]',
      expectPath: '/work',
    },
  ],
}
```

The QA returns to the start route and detects obvious pin-spacer growth as one lifecycle-leak signal. The implementation must still own all contexts, listeners, ticker callbacks, SplitText instances, and smoother instances correctly.

## Visual review rubric

A fresh reviewer scores each category from 1–5:
- hierarchy
- timing
- easing
- typography
- scroll
- microinteraction
- mobileAdaptation
- transitionCoherence
- restraint
- polishAccessibility

Default PASS requires every score ≥4, average ≥4.2, zero blocking issues, screenshot evidence, `verdict: "PASS"`, and `reviewer.independent: true`.

The reviewer must judge the rendered result, not only source code. Look for: visual hierarchy, coherent motion grammar, awkward pauses, over-animation, text legibility, scroll resistance, pin fatigue, mobile adaptation, discontinuities, jank, clipping, layout jumps, hover/touch mismatch, and reduced-motion integrity.

## Anti-gaming

Do not:
- remove failing tests;
- change required gates to false to avoid work;
- lower thresholds only to pass;
- delete browser routes/journeys that expose bugs;
- mark the visual-review JSON PASS without reviewing evidence;
- call environmental failure a quality PASS.

If infrastructure genuinely prevents a gate, report `SENTRA-GSAP FAIL` with the blocker. Human-approved exceptions must be explicit and auditable.
