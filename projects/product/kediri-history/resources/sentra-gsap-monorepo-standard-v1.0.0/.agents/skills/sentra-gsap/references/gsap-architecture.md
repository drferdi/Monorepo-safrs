# GSAP Architecture Reference

Verified against current GSAP documentation/repositories on 2026-08-25.

## 1. Architecture Goal

A GSAP-first website separates **structure**, **motion vocabulary**, **scene choreography**, and **application orchestration**.

```text
src/
├─ app/ or pages/
├─ components/
├─ motion/
│  ├─ gsap.ts
│  ├─ tokens.ts
│  ├─ effects/
│  ├─ scenes/
│  ├─ transitions/
│  └─ scroll/
└─ styles/
```

- `components/`: semantic DOM and local interaction ownership.
- `motion/effects/`: reusable primitives such as reveal, parallax, text split.
- `motion/scenes/`: section-level timelines and ScrollTriggers.
- `motion/transitions/`: route/page transition choreography.
- `motion/gsap.ts`: imports + one-time registration.

Avoid both extremes: a 3,000-line `animations.ts` and dozens of tiny abstraction layers with no repeated need.

## 2. Plugin Registration

GSAP recommends explicit registration in build environments because bundlers can tree-shake plugins. Since GSAP 3.13+, all plugins are available from public npm; legacy private `npm.greensock.com` configuration should be removed.

```ts
'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export { gsap, ScrollTrigger, SplitText };
```

Only import plugins the site actually uses.

## 3. Ownership Model

### Component-owned
Use for button feedback, card hover/press, local disclosure, cursor response.

### Scene-owned
Use for hero intro, pinned chapter, image reveal sequence, horizontal story.

### Application-owned
Use for loader handoff, persistent navigation, page transition overlay, global cursor, optional smooth scroll.

An owner must also own teardown.

## 4. React / Next.js

Use client-only GSAP execution. `@gsap/react` documents `useGSAP()` as a replacement for `useEffect`/`useLayoutEffect` for GSAP work; it wraps `gsap.context()` cleanup and supports selector scoping.

```tsx
'use client';

const root = useRef<HTMLElement>(null);
const tl = useRef<gsap.core.Timeline | null>(null);

const { contextSafe } = useGSAP(() => {
  tl.current = gsap.timeline({ paused: true })
    .from('.title', { y: 40, autoAlpha: 0 });
}, { scope: root });

const onEnter = contextSafe(() => {
  gsap.to('.media', { scale: 1.03, duration: 0.3 });
});
```

Rules:
- Keep animation values out of React state unless application logic genuinely needs them.
- Use scoped selectors or explicit refs.
- Deferred callbacks/event handlers that create GSAP objects must be context-safe.
- If dependencies rebuild animation state, use `revertOnUpdate: true` when appropriate.
- Do not call GSAP/ScrollTrigger during SSR.

## 5. Vue 3

```ts
const root = ref<HTMLElement | null>(null);
let ctx: gsap.Context | undefined;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.from('.box', { y: 30, autoAlpha: 0 });
  }, root.value!);
});

onUnmounted(() => ctx?.revert());
```

## 6. Svelte 5

```svelte
<script>
  import { gsap } from 'gsap';
  let root;

  $effect(() => {
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.from('.box', { autoAlpha: 0 });
    }, root);
    return () => ctx.revert();
  });
</script>
```

## 7. Reusable Effects vs Scene Timelines

A reusable effect answers **how this motion behaves**. A scene answers **when and why multiple effects coordinate**.

```ts
export function createReveal(targets: gsap.TweenTarget) {
  return gsap.from(targets, {
    y: 32,
    autoAlpha: 0,
    duration: 0.65,
    ease: 'power3.out',
    stagger: 0.06,
  });
}
```

Then compose in a scene timeline. Do not hide global selectors inside reusable utilities.

## 8. Page Transitions

For SPA transitions:
1. Prevent scroll/wheel/touch changes while transition ownership is ambiguous.
2. Capture current scroll position.
3. Fix the outgoing page visually (`position: fixed; top: -scrollY`) so unmount does not produce a viewport jump.
4. Run exit timeline.
5. Tear down outgoing page ScrollTriggers and other page-owned resources. If the application treats every trigger as route-local, `ScrollTrigger.getAll().forEach(t => t.kill())` is acceptable; otherwise preserve/recreate explicitly persistent global triggers.
6. Mount incoming route.
7. Restore intended scroll position.
8. Wait until layout-critical assets/DOM are stable.
9. `ScrollTrigger.refresh()` once.
10. Run entrance timeline and release input lock.

Do not call refresh repeatedly during the transition.

## 9. Loader / Intro Architecture

A loader exists only if meaningful above-the-fold assets need time to become animation-safe. Avoid fake waits.

Initialization order:
1. Static HTML/CSS visible/safe state.
2. Load critical fonts/media.
3. Register GSAP/plugins.
4. Build page contexts/scenes.
5. Refresh ScrollTrigger after geometry is stable.
6. Play intro/loader handoff.
7. Lazy-init below-fold expensive experiences where practical.

## 10. Dependency Rule

Install a capability because the interaction semantics require it, not because it appears in a showcase. Every additional animation/smooth-scroll/3D dependency adds lifecycle, bundle, debugging, mobile, and accessibility cost.
