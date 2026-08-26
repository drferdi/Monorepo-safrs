---
name: sentra-gsap
description: Use when the user invokes Sentra-GSAP or requests an agency-grade GSAP website, page, redesign, scroll experience, motion system, or GSAP-heavy frontend that must meet Sentra production quality.
compatibility: Agent Skills-compatible coding agents. Node.js 20+ for bundled verification; @playwright/test is required for browser QA.
metadata:
  owner: Sentra Artificial Intelligence
  version: "1.0.0"
  standard: Sentra-GSAP
---

# Sentra-GSAP

## Authority

This is the canonical operational standard for Sentra GSAP work. A literal `/Sentra-GSAP` or `/sentra-gsap` invocation activates it explicitly. Do not downgrade, summarize away, or silently skip its gates.

The user defines product intent; the agent owns technical execution. Do not ask a non-technical user to choose routine implementation details. Surface only trade-offs that materially change product behavior, visual direction, scope, cost, or risk.

## Mandatory Workflow

1. **Inspect before changing.** Understand existing framework, layout, routes, styling, motion, dependencies, and repo rules. Preserve working conventions; make surgical changes.
2. **Establish the static baseline.** Semantic content, navigation, layout, keyboard access, and responsive reading order must work without motion.
3. **Write the motion brief internally.** For each scene define purpose, trigger, ownership, properties, timing/ease, mobile/touch variant, reduced-motion behavior, and cleanup owner.
4. **Choose the minimum stack.** Start with GSAP core. Add ScrollTrigger/SplitText/Flip/etc. only when interaction semantics require them. Native scroll is default.
5. **Assign ownership.** Component owns local interaction; section owns scene choreography; page/app owns persistent motion and route transitions. Every owner owns teardown.
6. **Build timelines without scroll first.** A scene timeline MUST work independently before ScrollTrigger controls it.
7. **Attach scroll architecture.** Create triggers top-to-bottom, use development markers, consolidate coordinated motion under one timeline, stabilize media/font geometry, then refresh deliberately.
8. **Build responsive motion variants.** Use `gsap.matchMedia()`; do not scale desktop choreography down mechanically. Touch and reduced-motion are distinct behaviors.
9. **Profile before polish.** Fix layout/paint cost, duplicate loops, media decoding, trigger drift, and mobile jank before adding effects.
10. **Run production QA.** Configure routes/journeys, run browser evidence, complete independent visual review, then run the Sentra verifier.

**HARD GATE:** Do not proceed from a broken standalone timeline by adding ScrollTrigger timing hacks.

## Architecture Invariants

- React/Next.js: use `@gsap/react` `useGSAP()` with `scope`; use `contextSafe()` for deferred GSAP callbacks; keep timelines in refs, not render state.
- Vue/Svelte: create scoped `gsap.context()` after mount and revert it on teardown.
- Register plugins once in a central GSAP module.
- Separate reusable effects, scene timelines, and application orchestration. No giant global animation file.
- Prefer `x/y/xPercent/yPercent/scale/rotation/autoAlpha`; avoid layout-property animation when transforms can produce the result.
- Never combine CSS transitions and GSAP on the same target/property.
- Use `gsap.quickTo()` or reused setters for high-frequency pointer tracking.
- One coordinated scene normally has one timeline and one ScrollTrigger.
- Scrubbed motion normally uses linear tween easing (`ease: "none"`).
- Horizontal child triggers use `containerAnimation`; the horizontal driver must be linear.
- Pin only when one narrative scene intentionally evolves in place.
- Smooth scrolling is an opt-in subsystem, never a prestige dependency.
- Reduced motion removes smoothing, large spatial travel, heavy parallax, long scrub choreography, ambient loops, and nonessential pins while preserving functional state feedback.
- Motion cannot be the only carrier of information.

## Decision Rules

- **Native scroll** unless smoothing materially improves the concept and passes QA.
- **ScrollSmoother** when GSAP-native smoothing/effects best fit the architecture.
- **Lenis** only when its features justify another runtime; synchronize with ScrollTrigger + GSAP ticker and keep one RAF owner.
- **SplitText** for purposeful kinetic typography; preserve ARIA/interactive semantics and responsive re-splitting.
- **Flip** for layout/state transitions; **Draggable** for genuine drag; **Observer** for gesture intent; SVG plugins only for meaningful SVG behavior.
- DOM/SVG for normal interface motion; Canvas for large frame sequences; WebGL only for real 3D/shader/particle requirements.

## Required Verification

Before claiming completion:

1. Run the bundled standard tests after changing verifier infrastructure.
2. Run `sentra:gsap:qa` against a live/preview URL. Missing browser evidence is FAIL.
3. Ensure multi-route sites configure at least one route round-trip journey for transition/lifecycle evidence.
4. Have a fresh independent reviewer inspect captured screenshots and motion behavior against the visual rubric and complete `.sentra-gsap/reviews/visual-review.json`.
5. Run `sentra:gsap:verify` with the app URL. Required typecheck, lint, test, build, browser, static-architecture, and visual-review gates must all PASS.

Never delete, skip, weaken, lower thresholds, or rewrite a failing gate merely to obtain PASS. Fix the implementation. A material exception requires explicit human approval and must remain visible as an exception; never silently convert it into success.

## Completion Contract

If every required gate passes, report `SENTRA-GSAP PASS` with concise evidence. If any required gate fails or is not run, report `SENTRA-GSAP FAIL`, list blockers, continue fixing when possible, and do **not** describe the implementation as finished or production-ready.

## Load References Only When Needed

- Architecture/lifecycle/page transitions → `references/gsap-architecture.md`
- ScrollTrigger/pinning/smooth scroll → `references/scrolltrigger-patterns.md`
- Motion language/timing/type/media → `references/motion-system.md`
- Rendering/profiling/media performance → `references/performance.md`
- Breakpoints/touch/reduced motion → `references/responsive.md`
- Verification and visual review → `references/verification.md`
- Official sources/tools → `references/resources.md`
