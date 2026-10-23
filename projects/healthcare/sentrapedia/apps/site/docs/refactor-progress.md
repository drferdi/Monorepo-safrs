# SDD ledger — plan: docs/plans/active/2026-10-23-site-frontend-refactor.md

Base: 5044c7eb. Scope: apps/site only, plus capsule plan and handoff.

Pre-flight: tasks 1/2 share renderHomepage and the exact built-tree parity baseline. Runtime tasks consume the same asset-copy pipeline; script loading order must stay fixed. Task 7 cannot infer dead CSS from a single page or viewport.

Ruling: use the native app-managed worktree location rather than manually creating a second worktree — native registration owns checkout lifecycle — cost if wrong: worktree placement differs from repository preference, no product effect.

Ruling: refactor tests characterize existing behavior before extraction; their passing baseline is expected — refactoring does not introduce new behavior — cost if wrong: insufficient edge coverage, mitigated by output parity and browser checks. The new renderer interface test was observed failing before extraction and passing afterward.

Task 0: baseline site tests 49/49; lint exit 0; verify 22 protected files, 72 local targets, no errors; dry-run exit 0. Native checkout initially held LFS pointers; local git lfs checkout restored the assets and the suite passed. Desktop/mobile screenshots captured through the in-app browser at 1440x900 and 390x844; these early screenshots capture arrival, not stable animation checkpoints.

Task 1: complete — unsupported legacy figure fallback removed; missing/reordered fragments reject; checked-in source renders identically. node --test tests/homepage-render.test.mjs: 1/1.

Task 2: complete — renderer and declarative asset groups extracted. node --test tests/output-parity.test.mjs: all public output paths and SHA-256 identical. node --run test: 51/51. Protected presentation baseline unchanged.

Task 3: complete — menu/cards/contact/reveal moved into scripts/browser. Entry initialization order unchanged. Assembly-interface test observed missing-module failure then 1/1 pass. Browser invalid/pending/success/rejected/network contact states match baseline; Enter/Space expand workflow cards; mobile menu Escape closes and updates aria-expanded.

Task 4: complete — hero bindings and timeline extracted verbatim. Browser comparison from the same timeline origin matches labels, duration 38.2s and checkpoints 1.5/8/17/23.8/25/27/34s. Four checks precede Ditinjau at 24.7s. Missing GSAP keeps readable static hero.

Task 5: complete — capability scene and viewport logic extracted. Existing helper exports retained. Browser Home/End/arrows and previous/next/pause work; desktop pinned and mobile native modes tested. Returning from FAQ preserves eight live panels and exactly ten explainers.

Task 6: complete — only the identical visibilitychange/preference listener registration shared by clinical video and workflow playback. Thresholds, callbacks, autoplay and manual-pause rules remain local. Browser clinical-video button goes Jeda then Putar; settled reduced-motion state matches baseline: static hero, stacked capabilities, both videos paused. Product-film's existing visibility policy is intentionally unchanged.

Task 7: complete — only the unused img.wp-smiley/img.emoji style block removed. No matching markup or authored generator references found. Whole-tree parity reinserts that exact stored block before checking the original homepage hash. Vendors and all public media URLs retained.

Ruling: source fragments are concatenated into the existing five JavaScript bundles instead of changing classic scripts to modules — preserves deferred execution order and public URLs without dependencies — cost if wrong: build assembly must be maintained; source/served checks and dedicated assembly tests cover it.

Ruling: public tree parity allows exactly five reviewed JavaScript bundles plus the exact dead emoji style removal — extracting runtime code necessarily changes bundle bytes — cost if wrong: browser behavior regressions inside these bundles; exact extraction review and browser parity supplement the hash gate.

Final review: fresh reviewer gpt-6-astra (high), read-only. No confirmed findings. Independent raw comparisons proved verbatim feature bodies, hero bindings/timeline and normalized capability extractions. Verification-control integrity accepted independently; protected design-integrity.json untouched. Reviewer deferred browser-only judgments; primary browser checks cover layout, timeline, reduced motion and back navigation.

Verification note: manifest generation encountered one Windows UNKNOWN/open error; file remained readable and a single subsequent run succeeded. No manifest content was substituted manually.

Deferred minors: none reported by reviewer.

## Website publication - 2026-10-23

- Gaffer authorized push and deploy. A dedicated-repository checkout based on drferdi/Sentrapedia main a056f65 received only the reviewed apps/site snapshot. Release commit dc3666174cb1be4a12bfb451565b10f6771638f6 was pushed to codex/sentrapedia-site-refactor; main was not merged. Source snapshot: e8488b93.
- Exact release snapshot: install:check, test (53/53), lint (63 JS files), verify (22 protected files, 72 local targets), docs:verify (96 documents) and deploy:dry-run passed. Staged additions had no phone-pattern or private-key matches; repository history scan for private group identifiers had zero matches.
- Vercel project sentrapedia / scope sentraverse: staged production dpl_BYLyJHdcNvMUtY1622FNJnsZF2g6 was READY, seven routes returned 200, all five browser bundles returned 200, and media byte ranges returned 206. One preliminary check used the wrong /assets/ script prefix and returned 404; checked-in markup uses /media/, which passed without code changes.
- Promoted the tested build to https://sentrapedia.vercel.app. All 88 public output files returned 200 and matched local SHA-256, with no mismatches. Media range: 206 and 1024 bytes; contact GET: 405. Deployment runtime error query (last hour) returned zero records. Browser Masuk reached Cloudflare Access "Log in to Sentrapedia BETA" with email/code controls; no email submitted.
- System beta, Cloudflare policy and credentials were not modified. No demo account was created. GitHub reported one existing high Dependabot alert on the default branch; it is outside this website-only release.
# Clerk navigation preparation - 2026-10-24

The reviewed foundation from `c773e692` is preserved. Desktop/mobile navigation now prepares `https://beta.sentrapedia.com/sign-in` and `/apply` using existing classes. Historical output parity normalizes only these exact approved anchors. Publication is blocked until the selected Clerk instances, real invitation/OTP flow and separately authorized Cloudflare cutover are verified; this branch does not deploy the marketing site. See the capsule's `docs/auth-beta-access.md` release checklist.

