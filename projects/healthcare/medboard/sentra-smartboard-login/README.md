# Sentra Medical Smartboard — Sign-in

Single-page sign-in experience: an animated intelligence field beside a calm,
accessible authentication column. React 18, Tailwind CSS 4, Vite. One runtime
dependency beyond React (`lucide-react` for icons).

## Run

```bash
npm install
npm run dev        # local development
npm run build      # production build in dist/
```

## Structure

| Path | Role |
| --- | --- |
| `src/components/LoginPage.jsx` | Page layout, seam, entrance sequence |
| `src/components/IntelligenceVisual.jsx` | React wrapper around the canvas field |
| `src/visual/engine.js` | Canvas engine: procedural neurons on depth planes, signals, sparks, pointer response |
| `src/components/LoginForm.jsx` | Fields, validation, submission state |
| `src/components/TextField.jsx`, `PasswordField.jsx` | Labelled inputs with announced errors |
| `src/components/SentraBrand.jsx`, `StatusIndicator.jsx` | Brand lockup, status line |
| `src/components/AccessNotice.jsx` | Authorized-roles notice (edit `AUTHORIZED_ROLES`) |
| `src/lib/auth.js` | **Authentication boundary** (stub, see below) |
| `src/index.css` | Design tokens (`@theme`) and accent palettes |

## Opening sequence

On load, lines sweep in and draw the lockup, release into the full-screen field,
then the field moves left and the sign-in column opens. Any key, a click, or
"Skip intro" jumps straight to sign-in; reduced-motion users never see it.

`LoginPage` takes `intro="session"` (default: once per browser session),
`"always"`, or `"never"`. Timings live at the top of `LoginPage.jsx` and in
`INTRO` in `src/visual/engine.js`. The lockup (mark, wordmark, descriptor) is
in `src/components/IntroLockup.jsx`.

## Connecting authentication

`src/lib/auth.js` is the only place the UI touches authentication. Both
functions currently reject with `AuthNotConfiguredError`; no credentials are
sent anywhere. Replace their bodies with real API calls: resolve on success,
throw an `Error` with a user-readable `message` on failure. Remove the
`previewPause` helper at the same time.

## Before production

- The logo in `src/assets/sentraLogo.js` is traced from the official PNG. Swap in the original vector paths when available.
- Set `intro="session"` in `src/main.jsx` (the preview uses `"always"`).
- Remove the `reviewControls` prop in `src/main.jsx` and settle on one accent
  (`accent="clinical"` or `accent="sentra"` on `LoginPage`).
- Point "Forgot password?" at the real recovery flow (`onForgotPassword`).
- Self-host the fonts if the deployment network blocks Google Fonts.

## Accessibility and motion

Semantic form with visible labels, `autocomplete` hints, announced field and
form errors, focus moved to the first invalid field, and visible focus rings.
The canvas is decorative (`aria-hidden`), pauses when hidden or off-screen,
caps device pixel ratio at 2, lowers its own render resolution if frames stay
slow, and renders a single still frame under `prefers-reduced-motion`.

## The visual

The field is a real 3D scene with no graphics library.

| File | Role |
| --- | --- |
| `src/visual/neuralGL.js` | WebGL2 renderer: procedural neurons, wet-glass shading, activation waves, depth of field, bloom, bokeh particles, camera |
| `src/visual/lens.js` | Opening lens lines (2D overlay, intro only) |
| `src/visual/engine.js` | 2D canvas renderer used as fallback, and the colour palettes (`PALETTES`) |

Renderer selection is automatic: WebGL2 when a hardware GPU is present; the
2D renderer when WebGL2 is missing, software-rendered (virtual desktops), or
still slow at the lowest internal resolution. `LoginPage` accepts
`visualRenderer="auto" | "webgl" | "canvas"`; in the preview entry, adding
`#webgl` or `#canvas` to the URL forces one.

Tuning points in `neuralGL.js`: cell positions and counts in `buildNetwork()`,
firing rhythm in `FIRE_PERIOD`, camera and focus in `draw()`.
