# Sentra Bot — Website Promo

Website promo (landing page) untuk Sentra Bot. Pixel-faithful React rebuild
dari layout marketing yang di-capture, copy sudah di-rebrand ke Sentra Bot.

## App

- `apps/site` — landing page (React + Vite). Lihat
  [`apps/site/README.md`](apps/site/README.md) untuk command dev/build.

## Product runtime

The Sentra Bot product (API, worker, web, desktop, mobile, sandbox supervisor) lives in `apps/*`,
`packages/*`, and `infra/*`. Start here:

- [`docs/architecture.md`](docs/architecture.md) — verified runtime topology, process ownership,
  run lifecycle, trust boundary
- [`docs/self-host.md`](docs/self-host.md) — running it locally, with published images, or on a VM
- [`docs/computer-runtime.md`](docs/computer-runtime.md) — computer and sandbox providers

Quick start from a checkout: copy `.env.example` to `.env`, start Postgres
(`docker compose --env-file .env -f infra/compose/docker-compose.yml up postgres`), run
`pnpm install && pnpm db:migrate && pnpm sandbox:build && pnpm dev`, then open
`http://127.0.0.1:5173`.

## Legal

Apache-2.0, lihat [LICENSE](LICENSE). Atribusi asal desain (Sentra Bot) ada di
[NOTICE](NOTICE).
