---
description: Router GSAP resmi — pilih skill gsap-* yang tepat lalu kerjakan tugas animasi.
argument-hint: "[tugas animasi/GSAP]"
---

Anda adalah router untuk skill GSAP resmi yang terpasang di `.claude/skills/`.

Tugas user: $ARGUMENTS

## Aturan routing

Analisis tugas, lalu muat skill yang relevan via tool Skill (boleh lebih dari satu, muat semua yang relevan SEBELUM menulis kode):

| Sinyal pada tugas | Skill |
| --- | --- |
| Tween dasar: `gsap.to/from/fromTo`, easing, stagger, duration, `matchMedia`, reduced-motion, animasi umum tanpa library spesifik | `gsap-core` |
| Sekuens, urutan animasi, `gsap.timeline()`, position parameter, nesting, kontrol playback | `gsap-timeline` |
| Animasi berbasis scroll, parallax, pinning, scrub, ScrollTrigger | `gsap-scrolltrigger` |
| Plugin: SplitText, Flip, Draggable, Observer, ScrollSmoother, ScrollTo, DrawSVG, MotionPath, CustomEase, registrasi plugin | `gsap-plugins` |
| React / Next.js: `useGSAP`, refs, cleanup, `gsap.context()` | `gsap-react` |
| Vue / Nuxt / Svelte / SvelteKit / vanilla lifecycle | `gsap-frameworks` |
| Helper: `gsap.utils` (clamp, mapRange, snap, interpolate, toArray, wrap, random, pipe) | `gsap-utils` |
| Jank, FPS, optimasi, layout thrashing, will-change, smooth 60fps | `gsap-performance` |

Default bila ambigu: `gsap-core` + `gsap-timeline`. Proyek React/Next (mis. `projects/product/*` dengan Next.js) hampir selalu butuh `gsap-react` juga.

## Setelah routing

1. Kerjakan tugas mengikuti pedoman skill yang dimuat.
2. Patuhi konvensi repo: token desain Sentra, cleanup animasi saat unmount, hormati `prefers-reduced-motion`.
3. Verifikasi hasil (lint/test/preview) sesuai standar repo sebelum melapor selesai.
