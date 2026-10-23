# Website refactor parity evidence — 2026-10-23 Asia/Jakarta

Baseline 5044c7eb at localhost:3401; refactor worktree at localhost:3402. Tests used the Codex in-app browser. The optional agent-browser CLI was unavailable. No live contact delivery occurred.

| Check | Observed result |
| --- | --- |
| Seven routes, 390x844 | Matching titles, heading arrays, disclosure/form counts; no broken loaded images or horizontal document overflow |
| Seven routes, 1440x900 | Matching rendered text and dimensions, no horizontal overflow; both tabs explicitly emulated at identical size |
| Mobile menu | aria-expanded true after click, false after Escape |
| Workflow cards | Enter opens AADI; Space opens Anamnesis; aria-expanded true |
| Capability navigation | End = 10 Library; Home = 1 Cockpit; ArrowRight = 2 Document Studio; next = 3 Gateway; desktop previous from 10 = 9 Privacy |
| Capability pause | aria-pressed true after pause |
| FAQ keyboard | Enter opens second native disclosure |
| Back navigation | Eight live panels, ten explainers; no duplicate initializer content; no browser console errors observed |
| Contact invalid | attempted=true and state=error |
| Contact pending | state=sending and submit disabled |
| Contact success, mocked fetch | state=success, fields reset, submit enabled |
| Contact rejected/network failure, mocked fetch | state=error, entered fields retained, submit enabled |
| Hero timeline | Baseline/refactor labels and seven checkpoints identical after seek(0,false); duration 38.2s; checklist before Ditinjau |
| Reduced motion | Static hero, hidden hero toggle, stacked capabilities, videos paused; normal preference restores pinned desktop capabilities |
| Manual clinical-video controls | Jeda after play, Putar after pause |
| Forced autoplay rejection | Mocked media play rejection yields paused=true, playback=autoplay-blocked and label=Putar identically before/after; prototype restored |
| Missing GSAP | Static hero, case text present, eight live panels |
| JavaScript disabled | Eight live panels, eight disclosures, case text present |
| CSS deletion | No img.wp-smiley/img.emoji matches; exact removed block retained as test evidence |
| Protected presentation | 22 unchanged protected files; 72 local targets; verifier errors=[] |

Screenshots were captured inline for baseline arrival and refactor reduced-motion desktop/mobile inspection. They are not a pixel-diff benchmark. Timeline states and content were compared separately; do not infer pixel-perfect animated-frame equality from unsynchronized screenshots.

Environment observations: viewport override applied only to the selected tab, so desktop comparison was repeated with explicit per-tab dimensions. An initial hero comparison began mid-loop; initializing both timelines at zero produced identical checkpoints. These mismatched setups are not counted as parity failures.

Limits: full OS background-tab lifecycle, every pointer-hover/focus combination and an automated screenshot pixel-diff suite were not exhaustively exercised. Existing policy code was mechanically preserved and independently reviewed. These limits are not new behavior changes.
