# HANDOFF

Last updated: 2026-10-06 (missing images on the live site; grey profession logos)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

LIVE at https://medboard.sentrahai.com: Biznet Gio NEO Lite MS 4.2 VPS, IP 103.89.2.92, Ubuntu
24.04, SSH `gaffer` (key on Chief's laptop). Runbook `docs/deploy-vps.md`. Running code is
`0a66f2cf`; 14 migrations applied; admin `sentraone`. Health `degraded` only for DEEPSEEK,
LiveKit, Sentry (unset, Chief's call). DNS A `medboard` → 103.89.2.92 resolves on 1.1.1.1, 8.8.8.8
and Windows; Git Bash `curl` on this laptop still lands on Vercel (dugaan: local tool resolver).
Presence route live: `POST /api/presence` without a session → 401.

2026-10-06 commits (branch `feat/sidepanel-ui-batch`, not pushed):
- `7bc0895f` runbook §2: `git archive` ships Git LFS pointers for `*.png` (root
  `.gitattributes`), so the server serves 130-byte files for all 17 `public/` PNGs (avatars,
  `sentralogo.png`, `admin.png`, `audrey.png`…). Second tarball of LFS files from the working
  tree + a guard that stops the deploy if a pointer is left in `public/`.
- `842461d5` profession logos (IDI, PDGI, IBI, PPNI, IAI) never came over in the migration
  (`fbe291bf`); now grey 128×128 PNGs on transparent background in `public/profesi/`; PPNI/IAI
  paths `.jpg` → `.png`; white box behind the logo removed. Sources: seeklogo (IDI, PDGI, IBI),
  perawat.org (PPNI), iai.id banner (IAI); Chief approved each download. Test `src/lib/crew-access.test.ts` red first (ENOENT
  `ppni.jpg`), now in the `crew-access` group.

Gates: `tsc --noEmit` 0 (capsule `lint` = tsc); `pnpm run test crew-access` 228 pass 0 fail;
crew-access group alone 20/20. Browser pane (demo :4345): all five logos load, 128 px, transparent.

## Next action

1. Done 2026-10-06: Chief ran the image hotfix (17-image tarball into `/opt/medboard/app`,
   no restart). Live check: all 17 return their local byte sizes and decode in the browser
   (`/audrey.png` is a JPEG named .png, same as the repo file).
2. Redeploy `842461d5` for the logos (runbook §2 with the new LFS tarball): R3, Chief's call.
3. End-to-end with Chief: log in as `sentraone`, reload extension from
   `med-assist\.output\chrome-mv3-dev`, sign in to Asisten Medis, ACARS shows "Asisten Medis";
   offline after logout / ~90 s TTL. Cookie forwarding from the extension to production still
   unverified (dugaan: works; host permission bypasses CORS, cookie `SameSite=None; Secure`).
4. Chief's decisions: `CHIEF_PUSH_OK`; squash of `320ac1af`; optional env; patient data on this
   VPS (PP 71/2019); R3 clinical items and MIRA follow-ups (unchanged, see DECISIONS).
5. Leftovers: `/emr` copy "jalankan Iskandar"; accepted-consult grid overflow below ~1050 px;
   undefined `--text-primary`/`--border-subtle` on telemedicine; docs still describe the engine as
   live; `/logo/profession-default.png` fallback does not exist (only used for unsafe URLs).

## Local demo cleanup (when Chief says "selesai")

Stop preview `medboard-demo` (:4345); delete `medboard/.claude/launch.json` (added this session)
and the entry in `med-assist/.claude/launch.json`; delete scratchpad `mb-demo/`;
`git restore next-env.d.ts`; delete `runtime/consult-accepted.jsonl` and
`runtime/crew-access-institutions.json` (written by the demo server).
