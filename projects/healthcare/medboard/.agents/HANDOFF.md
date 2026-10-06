# HANDOFF

Last updated: 2026-10-05 (evening: "Asisten Medis" rename, registration fixes, ACARS presence)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Branch `feat/sidepanel-ui-batch`, not pushed; MedBoard has no remote. MedBoard's own diagnosis
engine is retired (`LEGACY_CDSS_ENGINE_ENABLED` brings it back); MIRA in Med-Assist provides the
differential.

2026-10-05 commits: `ef28a942` alerts without colour blocks; `5d0259fe` IBM Plex Sans on the Carbon
scale; `e836d56e` clinical report keeps print sizes; `98cd6fec` (R3) "Ghost Protocols" → "Asisten
Medis" in copy and identifiers (stored values `sourceOrigin: 'ghost-protocols'` and
`engineVersion 'ghost-iskandar-v1'` kept); `083e20c6` registration: a rejected applicant can
reapply, a retried approval creates one user, files documented in `.env.example`; `9c08db4b`
presence: `crew-presence.ts` (globalThis store, web sockets + Assist heartbeat, TTL 90 s),
`POST/DELETE /api/presence` (crew session cookie only), ACARS shows the source, the EMR triage
picker lists only Dashboard users.

Gates: `crew-access` suite 19/19; lint, test:capsule, build, deploy:dry-run green after
`5d0259fe`. Browser pane (demo, synthetic users): ACARS "2 ONLINE", the Assist nurse labelled
"Asisten Medis", gone after DELETE. Not checked: TTL expiry in the pane; cookie forwarding from the
extension to production (`SameSite=None; Secure`, localhost verified only).

## Work in flight

Local demo server (`medboard-demo`, 127.0.0.1:4345, dev, no database) is running for Chief. On
stop: remove the entry from `med-assist/.claude/launch.json`, delete scratchpad `mb-demo/`
secrets, `git restore next-env.d.ts`, delete `runtime/consult-accepted.jsonl`.

## Next action

00. 2026-10-06 server: Biznet Gio NEO Lite MS 4.2 `medboard`, IP 103.89.2.92, Ubuntu 24.04.4,
   user `gaffer` (sudo). Runbook §1 done, `0a66f2cf` built and in `/opt/medboard/app`, 14
   migrations applied to the empty production DB (Chief approved). LIVE: Chief seeded admin
   `sentraone` (`sudo medboard-seed-admin`), added A record `medboard` → 103.89.2.92 in Vercel DNS
   (the `*` ALIAS to Vercel had caught it), Let's Encrypt certificate obtained by Caddy, login page
   served at https://medboard.sentrahai.com. Health `degraded`: only DEEPSEEK, LiveKit, Sentry unset.
0. Host is now `medboard.sentrahai.com` (`4362337a`; crew.puskesmasbalowerti.com retired, and
   it plus the Railway app no longer answer). The new host points at Vercel with no deployment;
   Chief moves its DNS to the VPS (runbook §3.5). Biznet Gio NEO Lite MS 4.2 (2 vCPU, 4 GB,
   Rp 139.000/month) was the suggested VPS.
1. Chief chose to leave Railway (cost) for an Indonesian VPS: runbook `docs/deploy-vps.md`
   (Ubuntu 24.04, Caddy, systemd, local PostgreSQL, whole `runtime/` persistent, daily backup).
   Not run on a real server yet; the `railway.toml` change and the Railway registration env vars
   are moot once moved. Chief: order the VPS, data move and DNS (runbook §3); push
   (`CHIEF_PUSH_OK`); squash of `320ac1af`.
2. Deploy order: Med-Assist with `b2592f0b` before MedBoard `6eb89e69`, or
   `LEGACY_CDSS_ENGINE_ENABLED=true` until it is out.
3. R3 clinical items (Chief's call): ePuskesmas kesadaran → ACVPU; Med-Assist AVPU default 'A';
   CORE score averaging; sepsis, PE (Wells), momentum fixes.
4. MIRA: `ConsultLog` has no differential column (migration needs Chief); MIRA not callable from
   the MedBoard server.
5. Leftovers: `/emr` copy "jalankan Iskandar"; accepted-consult grid overflows below ~1050 px;
   `--text-primary`/`--border-subtle` undefined on telemedicine; inline `letterSpacing` literals;
   docs still describe the engine as live (`README.md`, `SECURITY.md`, `docs/AI_GOVERNANCE.md`).
6. `/verify` reds not from this work: governance (other session's root `HANDOFF.md` and
   Med-Assist `sentra-api.ts`; `med-assist/AGENTS.md` integrity review), Biome in
   `tools/automation/**`, `pnpm test` needs PostgreSQL.
