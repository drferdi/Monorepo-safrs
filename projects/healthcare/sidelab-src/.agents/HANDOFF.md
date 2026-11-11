# HANDOFF

Last updated: 2026-09-27

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Install, typecheck, test, build, `start:local`, and the deploy dry run work from the capsule
root. The engine suite passes (1058 tests) with coverage about 97% against the 80% gate; tests
are isolated from Ollama, the machine's `.env`, and real API keys (see `DECISIONS.md`).

## Work in flight

None.

## Blockers

None.

## Next action

Needs Chief's approval (`sidelab/**` is R3); none of these is encoded in the tests:

1. Add the referral sender variables to `sidelab-engine/.env.example` (agents cannot edit
   `.env*` files): `SIDELAB_REFERRAL_SENDER_NAME=`, `SIDELAB_REFERRAL_SENDER_FACILITY=`,
   `SIDELAB_REFERRAL_SENDER_CITY=`; put real values and `DEEPSEEK_API_KEY` in
   `sidelab-engine/.env`, which is now the only `.env` the engine reads.
2. `llm/local_client.available_models()` catches only `ImportError`; an SSL error while
   importing `ollama` escapes.
3. Clinical logic suspected wrong: `tui._update_sidebar_from_text` labels "belum definitif" and
   "tidak pasti" as DEFINITIVE; `intelligence` aliases never apply, `normalize_query` expands
   "dd" to diabetes and "utk" to ulkus traumatik, vital-sign regexes read "sesak napas 3 hari"
   as RR 3, and free-text vitals discard documented ones; `message_builder.is_referral` treats
   "tidak perlu rujuk" as a referral; `pharma` drops the tablets-per-dose of "3x2";
   `fornas_loader.find_interactions` drops interactions with an unknown level.
4. Config parsing: bool threshold overrides become the string "false" (truthy); nested
   threshold env names drop the parent prefix; `validator_config` replaces a configured 0 with
   3 or 5; explicit-path loads overwrite the module cache.
5. `test_short_query_without_red_flags_down_ranks_severe_disease_name` locks in a 10-point
   penalty for severe diagnoses on short complaints without red-flag cues; confirm or remove.
