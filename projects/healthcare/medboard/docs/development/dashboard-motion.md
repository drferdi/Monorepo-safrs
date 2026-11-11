# Dashboard motion

MedBoard integrates six effects in its React/Next.js shell. Open `/motion` after signing in to explore them. The page contains abstract artwork, no operational metrics or clinical fixtures. Existing Motion and Three.js dependencies are reused; no packages were added.

## Recommended setup

Choose **Cinematic Smooth**, then **Preview preset**. This is the default for browsers without a saved preference: a gentle depth reveal, a portal with concentric tunnel light, slowly moving 3D orbits, floating artwork, smooth tile rearrangement and pointer tilt/light. One preview remixes the panel layout behind the portal. **Balanced** keeps the original shorter timing and static artwork.

| Setting | Cinematic Smooth | Balanced |
| --- | --- | --- |
| Portal | 280 ms cover + 520 ms reveal; richer light | 200 + 340 ms |
| Depth | 120 ms exit + 480 ms reveal; 2 degree entry | 160 + 320 ms; 5 degree entry |
| Curved curtain | 220 + 440 ms | 180 + 300 ms |
| Panel/tile layout | 560 ms | 420 ms |
| Pointer tilt | Maximum 3 degrees per axis | Maximum 1.5 degrees |
| Ambient artwork | Slow transform animation; paused in a hidden tab | Static |

The named preference is saved locally under `medboard.motion-preset.v1`; blocked storage falls back to an in-memory choice. OS reduced motion and the existing **Kurangi gerakan** switch take precedence, including ambient artwork. Preset changes preserve pending navigation intent and cancel the old visual transaction. No clinical route is delayed by either preset. These are curated visual settings, not measured device-specific frame-rate guarantees.

## Effects, in priority order

| Effect | Visual result | Implementation | Platform support |
| --- | --- | --- | --- |
| Shared-panel morph | The feature panel expands while retaining visual continuity | `sharedTransition`: DOM layout measurement + Web Animations FLIP, preset timing | React integrated; DOM core reusable in Vue/Angular |
| Procedural portal | An expanding, rippled aperture with a luminous ring and seeded stars | Lazy Three.js shader, capped pixel ratio 1.5; preset timing/light | React integrated; DOM/callback core reusable in Vue/Angular |
| Depth navigation | The old workspace recedes and the destination enters with perspective | Web Animations, opacity/transform, preset timing/angle | React integrated; same DOM core in Vue/Angular |
| FLIP layout | Tiles reorder smoothly instead of jumping | Motion layout projection, preset timing | React integrated; Vue/Angular can reuse `sharedTransition` for measured elements |
| Curved curtain | An SVG wave covers and reveals a section | SVG path interpolation on requestAnimationFrame, preset timing | React integrated; same DOM core in Vue/Angular |
| Pointer light/depth | Fine pointer movement adds a highlight and restrained 3D tilt | Motion springs + CSS radial highlight; preset tilt/springs | React integrated; Vue/Angular require a local pointer adapter |

These are stable DOM/WebGL techniques. No experimental router transition API is required. Document-scoped View Transitions were removed during review because their captured document can block navigation hit testing. The morph uses element FLIP instead; the surrounding shell remains interactive.

## React examples

The existing shell owns a single coordinator and viewport:

```tsx
<MotionProvider><MotionViewport>{children}</MotionViewport></MotionProvider>
<MotionLink href="/atlas">Atlas Anatomi</MotionLink>
```

Preview each transition with a synchronous React state commit. Studio uses `flushSync` to make both layout measurements reliable:

```tsx
motion?.preview('shared', () => flushSync(() => setExpanded(v => !v)))
motion?.preview('portal', () => flushSync(() => setPanel('portal')))
motion?.preview('depth', () => flushSync(() => setPanel('depth')))
motion?.preview('curtain', () => flushSync(() => setPanel('curtain')))
```

Layout and lighting share a surface; stable keys preserve element identity during reordering:

```tsx
{tiles.map(tile => <MotionSurface key={tile.id}>{tile.title}</MotionSurface>)}
```

The Studio feature uses `layout={false}` because its manual FLIP owns that element's transform. Avoid running two layout engines on one element. Pointer tilt pauses for interactive descendants, focused controls, touch/coarse pointers and reduced motion.

## Framework-independent core

`effects.ts`, `motion-policy.ts` and `portal.ts` accept DOM handles, callbacks and AbortSignals. They import no React or Next.js code. Keep the core inside the consuming application or distribute a pinned package; never introduce a monorepo source dependency.

Vue can commit a local view and wait for the DOM before revealing it:

```ts
const abort = new AbortController()
onBeforeUnmount(() => abort.abort())
await depthTransition(viewport.value!, async () => {
  panel.value = 'atlas'
  await nextTick()
}, abort.signal)
```

An Angular component can do the same after explicitly rendering its new local state:

```ts
private abort = new AbortController()
async showAtlas() {
  await depthTransition(this.viewport.nativeElement, async () => {
    this.panel = 'atlas'; this.changeDetector.detectChanges()
  }, this.abort.signal)
}
ngOnDestroy() { this.abort.abort() }
```

For router integration, resolve the commit callback only after the intended destination DOM has rendered. Route-promise completion alone is not universal proof of DOM readiness. Reuse the coordinator's cancellation/deadline policy, and cancel before starting a replacement request. The Vue/Angular examples are integration guidance, not independently built applications in this repository.

The remaining DOM effect calls are intentionally small:

```ts
await sharedTransition(panel, commitDOM, signal)
await curtainTransition(svgPath, commitDOM, signal)
const portal = createPortal(canvas, primaryToken, accentToken)
try { await portal.play(commitDOM, signal) } finally { portal.dispose() }
```

## Integration checklist

- Keep one `MotionProvider` mounted around the persistent shell; `MotionViewport` wraps page content.
- Use `MotionLink` for plain internal page URLs. Next.js owns external links, downloads, modified clicks, query/hash links, object hrefs and replace/as navigation.
- Add route prefixes to `motion-policy.ts` deliberately. `/calculator`, `/icdx`, EMR, telemedicine, voice, dashboard, audit, reports, admin and sign-in use immediate navigation in both directions.
- Atlas selects the portal; Hub/Network selects the curtain; transitions between reference/team groups use depth. Shared route policy uses depth presentation to keep the shell clickable. Shared-panel morphing is demonstrated in Studio.
- A transaction is armed when its own router push is dispatched. Only its exact target pathname releases the render gate. Redirects and slow rendering release through the 1200 ms deadline. The deadline bounds decorative presentation, not page/network completion.
- New requests cancel older visuals. Hidden tabs, back/forward, reduced motion, failed chunks and rendering errors clear overlays. Navigation focus moves to the destination heading unless focus already belongs to destination content.
- Honor OS reduced motion; the Studio switch can additionally reduce motion for the current provider lifetime. The named preset is saved locally; the reduced-motion override is session-only. Touch/coarse input receives no pointer tilt.
- Keep overlays `aria-hidden`, noninteractive and limited to the content viewport. Keep all effects outside clinical decision logic and authentication.
- Preserve local design tokens, font scale and keyboard focus outlines. Run the design-token suite after CSS changes.

## Performance, accessibility and maintenance

| Consideration | Bound or trade-off |
| --- | --- |
| GPU | Portal code loads on demand; one reusable WebGL context, no idle draw loop; geometry/material/renderer disposed on provider unmount. Context loss hides the canvas; subsequent portals use SVG. |
| Ambient motion | Cinematic artwork uses five slow transform/opacity animations while visible. Hidden tabs and offscreen artwork pause them; Balanced/reduced motion removes them. This adds compositing work beyond the static Balanced scene. |
| Main thread | FLIP reads two layouts per morph. Tile projection and pointer springs add work on large grids; keep animated collections bounded. |
| Rendering | Animations favor opacity/transform. The curtain updates one SVG path; portal shader fills the viewport. Avoid stacking more expensive effects. |
| Accessibility | OS/user reduced motion disables transitions, projection, tilt and light. Preview buttons expose pressed state; preference is a keyboard-operable switch; changes have a polite live announcement. |
| Reliability | 1200 ms visual deadline, abortable dynamic import, target commit gate and single-current cleanup. Router failures can still prevent the destination itself from loading. |
| Portability | Core effects use DOM APIs; framework lifecycle, router commit and pointer bindings remain adapter responsibilities. React is the only application compiled here. |
| Verification limits | In-app Chromium evidence does not establish Safari/Firefox behavior, OS media emulation, frame-rate budgets or authenticated clinical workflows. |

## Local verification

```powershell
npx --no-install tsc --noEmit
node --import tsx --test src/components/motion/motion-policy.test.ts src/components/motion/effects.test.ts
node scripts/pnpm.mjs run test:capsule
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run deploy:dry-run
node scripts/motion-preview.mjs
```

The final command serves a local component harness at `http://127.0.0.1:4347/motion`. It imports production visual components into an isolated generated app under ignored `output/playwright/motion-harness`. Its destination pages are clearly labeled navigation fixtures. It uses no account, database or operational data and does not change the production access gate. A harness-only control can simulate WebGL loss. `--prepare` regenerates files without launching another server.

Separate ESLint is N/A under `project.contract.json`; the capsule's `lint` script is TypeScript. Browser checks and command logs are recorded in `.agents/HANDOFF.md`. Remotion's router skill was consulted; no video composition or export is included because this task implements interactive dashboard motion.
