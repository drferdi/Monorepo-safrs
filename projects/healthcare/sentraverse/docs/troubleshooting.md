# Troubleshooting Guide — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Build Errors

### TypeScript errors on `npm run build`

The build runs a full strict TypeScript check before bundling. Common causes:

**Missing `"use client"` directive**

```
Error: You're importing a component that needs `useState`. It only works in a Client Component...
```

Fix: Add `"use client";` as the first line of the component file. All components
in `components/` require this due to Framer Motion.

**`any` type inferred**

```
Error: Parameter 'x' implicitly has an 'any' type.
```

Fix: Add explicit TypeScript type annotation. `any` is not permitted in strict
mode.

**Non-null assertion needed**

```
Error: Object is possibly 'undefined'.
```

Fix: Use optional chaining (`?.`), nullish coalescing (`??`), or a non-null
assertion (`!`) if the value is guaranteed non-null in context.

---

## Runtime Issues

### `SentraSim` simulation does not progress

1. Check browser console for JavaScript errors
2. Ensure the component is fully visible — `IntersectionObserver` triggers on
   scroll-into-view
3. Click the Start button — the simulation requires a manual trigger, it does
   not auto-start
4. If stuck mid-simulation: the Reset button returns to idle state

### `Clients` logo marquee stops scrolling

The marquee uses a CSS animation (`animate-marquee`, 60s linear infinite). If it
freezes:

- Check `app/globals.css` — `@keyframes marquee` must be present
- Ensure `tailwindcss` is not purging the animation class — it is defined in
  `globals.css`, not a utility class, so it should not be purged

### Images not loading from external domains

Next.js `next/image` only loads from allowlisted domains. If an image is 404 or
broken:

1. Check the image URL hostname
2. Only `framerusercontent.com` and `images.unsplash.com` are currently
   allowlisted in `next.config.mjs`
3. Add additional hostnames to `remotePatterns` if required

### Font layout shift on first load

This should not happen — fonts are loaded via `next/font/google` which inlines
CSS and self-hosts font files. If shift occurs:

```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

---

## Development Issues

### Port 3000 already in use

```bash
# Kill the process using port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

### Turbopack compilation errors

Switch to webpack mode:

```bash
npm run dev   # webpack — stable
```

Turbopack (`npm run dev:turbo`) is experimental and may fail with certain
plugins or edge cases.

### ESLint errors blocking development

```bash
npm run lint 2>&1 | head -40
```

Common ESLint errors in this codebase:

- **react-hooks/exhaustive-deps**: Add missing dependency to `useEffect`
  dependency array
- **@next/next/no-img-element**: Use `<Image>` from `next/image` instead of
  `<img>`

---

## Content Issues

### New article not appearing at `/insights/[slug]`

1. Verify the article was added to the `articles` array in
   `app/insights/data.ts`
2. Verify the `slug` field has no spaces or uppercase letters (URL-safe slugs
   only)
3. Run `npm run build` — `getArticle(slug)` calls `notFound()` for missing
   slugs, which will show as a build warning if the dynamic route cannot be
   pre-rendered

### Navigation link scrolls to wrong section

All anchor targets are defined in `lib/site-links.ts`. The corresponding
`<section>` element must have `id="about"` (or the matching anchor value).
Verify the section component has the correct `id` attribute.

---

## Deployment Issues

### Railway build fails

```
Error: node: version not supported
```

Ensure Railway is using Node 22. In Railway project settings → Variables, set:

```
NODE_VERSION=22
```

### Security headers missing after deploy

Check `next.config.mjs` — the `headers()` async function must be present and
exported correctly. Verify with:

```bash
curl -I https://sentrahai.com | grep -i "x-frame-options"
```

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
