# Access page visual redesign

Date: 2026-10-24 Asia/Jakarta. User instruction: total visual redesign of the Sentrapedia access/login page, attractive/modern with motion; not the marketing homepage or Clerk Dashboard. Baseline `cd548056` on the isolated Clerk branch.

## Bounded presentation contract

Replace the former narrow single-column text page with an editorial-tech asymmetric canvas, larger product typography, a decorative workspace schematic and a distinct admission surface. Preserve the actual Clerk flow, server-side eligibility/consent/suspension guards, fixed redirects, legacy/principal storage and clinical behavior. Missing credentials must remain an honest unavailable state, not a fake login form or authentication bypass.

Use existing semantic tokens and fonts, scoped auth styling, finite CSS motion, reduced-motion support, accessible headings/status/navigation and responsive layouts. No runtime dependency, global token, clinical code, deployment or external account-setting change is included.

## Verification record

Before presentation edits, `npx --no-install vitest run tests/ui/auth-design.test.tsx` produced three expected failures: missing distinct product/admission heading composition and unavailable/denied status semantics. This covers real rendered components without provider mocks.

| Check | Observed result |
| --- | --- |
| Targeted auth/design UI suite | 16/16 pass across three files |
| `npm run test:all` | Exit 0: 520 Vitest, 53 site, 47 Node; Python 237 passed, 1 skipped |
| `npm test` after reduced-motion correction | Exit 0: 520 Vitest and 53 site tests |
| `npm run typecheck` | Exit 0, including final production-generated Next types |
| `npm run lint` | Exit 0, three inherited unused-variable warnings; CSS has no dedicated ESLint configuration |
| `npm run build` | Exit 0, without Clerk credentials; CSS compiled by the real app build |
| `npm run deploy:dry-run` | Exit 0, 13 capsule-local traces, zero external source dependencies; no publishing |
| `git.exe diff --check` on changed sources/tests | Exit 0 |

Initial test typecheck caught two unsupported Testing Library `exact` options in the new test; removing those options retained exact string-role matching and passed typecheck. No rule suppression was added.

## Browser evidence

The final standalone production build was restarted on `127.0.0.1:3422` and the user's `/sign-in` tab reloaded. HTTP 200 contains the new `auth-canvas` and unavailable state, without `app-shell`. Direct analysis POST remains 503 `AUTH_UNAVAILABLE`; the redesign grants no anonymous access. No clinical engine or paid inference was started for UI preview.

- Desktop screenshot 1440 x 1000; mobile screenshot 390 x 844. Viewport captures were used because the browser's full-page capture produced a distorted layout. Current viewport JPEGs were visually inspected.
- Responsive DOM measurements at widths 320, 390, 768, 1024 and 1440 found no horizontal overflow. Primary navigation targets measured at least 46px high. Mobile places admission before decorative schematic.
- Keyboard Tab showed a 2px solid focus outline; Enter followed `/apply` successfully.
- An initial real-browser reduced-motion probe failed: H1 `auth-rise` and accent `auth-stroke` survived a weak override despite global near-zero duration. Scoped selectors were corrected. The same probe then passed: H1/accent animation names `none`, zero animated auth descendants, visible content. This was confirmed again against the production build.
- Normal decorative choreography is finite (longest sequence about 1.6 seconds), not an endless ambient loop. Reduced-motion and viewport emulation were reset after QA.

The preview remains running at `http://127.0.0.1:3422/sign-in`. It intentionally does not construct a fake credential form when Clerk is unconfigured.

## Review boundary

The frontend-design workflow delegated the bounded implementation and used independent visual evaluation. Only OpenAI-provider review models are available here; the fresh-context same-provider evaluator was an explicit fallback, not a claimed cross-provider review. It inspected desktop/mobile JPEGs and live 768px tablet/375px mobile, returned **PASS**, and made no checkout edits. No blocking issue was found. Scores: design 2/3, originality 2/3, craft 1/3, functionality 2/3.

Non-blocking refinements not applied in this pass: relax headline tracking slightly; increase the 9-10px supporting microcopy; keep the mobile request-access label on one line. Wrapped labels retain usable targets. These are visual polish suggestions, not authentication failures. The evaluator's live settings were reset.

Real configured Clerk widget and invitation delivery remain external acceptance; they are not inferred from the missing-key preview. The existing Cloudflare gate and published marketing site are unchanged. No merge, push or deployment occurred.
