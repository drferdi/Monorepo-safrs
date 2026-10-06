# Deployment — MedBoard

---

## Environments

| Environment | Provider | URL | Cara |
| --- | --- | --- | --- |
| Lokal | localhost | http://localhost:3000 | `pnpm run dev` |
| Production | VPS Biznet Gio (Ubuntu 24.04) | https://medboard.sentrahai.com | Manual, lihat [`deploy-vps.md`](./deploy-vps.md) |

Alur production: internet → Caddy (HTTPS otomatis, WebSocket ikut diteruskan) →
`127.0.0.1:3000` (`server.ts`, Next.js + Socket.IO, service systemd `medboard`) → PostgreSQL
lokal. Langkah lengkap menyiapkan server, deploy setiap rilis, rollback dan backup ada di
runbook [`deploy-vps.md`](./deploy-vps.md).

---

## Build & start

```bash
pnpm run build        # prisma generate lalu next build
pnpm run start        # NODE_ENV=production, server.ts
pnpm run deploy:dry-run   # cek build dan setelan wajib sebelum rilis
```

Build dijalankan dengan environment production dimuat, karena `NEXT_PUBLIC_*` dibakukan saat build.

---

## Environment variables production

Di server, semua nilai ada di `/etc/medboard/medboard.env` (dibaca systemd dan saat build).
Nama variabel saja yang ditulis di dokumentasi; nilainya tidak pernah.

### Wajib untuk boot production

```
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=                        # PostgreSQL production
CREW_ACCESS_SECRET=                  # HMAC session signing secret
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=  # Harus stabil lintas deploy
TRUST_PROXY_HEADERS=true             # Wajib di belakang Caddy
NEXT_PUBLIC_BASE_URL=https://medboard.sentrahai.com
```

Akun crew disimpan di database (tabel `User`). `CREW_ACCESS_AUTOMATION_TOKEN` diisi bila
Asisten Medis memakai bridge, dan nilainya harus sama dengan token di ekstensi.

### Opsional, tetapi fitur akan degraded bila kosong

```
DEEPSEEK_API_KEY=                    # CDSS, tinjauan AI kontribusi Sentrapedia
LIVEKIT_URL=                         # MedLink (telemedicine)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
RESEND_API_KEY=                      # Email notifikasi
EMAIL_FROM=
SENTRY_DSN=                          # Error tracking
PLAYWRIGHT_BROWSERS_PATH=            # Chromium untuk PDF, robot ePuskesmas, ekspor LB1
```

### Opsional lanjutan

```
SENTRY_AUTH_TOKEN=                   # Source map upload
SENTRY_ORG=
SENTRY_PROJECT=
LANGFUSE_PUBLIC_KEY=                 # LLM observability
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
EPUSKESMAS_URL=                      # Target EMR auto-fill
EPUSKESMAS_USERNAME=
EPUSKESMAS_PASSWORD=
WHATSAPP_CLOUD_API_URL=
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
GROQ_API_KEY=                        # Speech-to-text Audrey
PERPLEXITY_API_KEY=
```

### Checklist sebelum rilis

1. `DATABASE_URL` valid dan migrasi sudah berjalan (`npx prisma migrate deploy`).
2. `CREW_ACCESS_SECRET` dan `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` terisi dan tidak berubah.
3. `TRUST_PROXY_HEADERS=true`.
4. `NEXT_PUBLIC_BASE_URL` mengarah ke domain production.
5. `pnpm run deploy:dry-run` lulus.
6. Setelah restart, cek `GET /api/health`.

---

## Rollback

`cd /opt/medboard && mv app app.bad && mv app.old app && systemctl restart medboard`.
Rollback kode tidak membatalkan migrasi database. Detail di [`deploy-vps.md`](./deploy-vps.md).

---

## Health check

```
GET /api/health
```

- `status: "ok"`: tidak ada blocker boot.
- `status: "degraded"`: app hidup, tetapi ada env opsional yang belum siap.
- `status: "error"`: masih ada blocker production yang wajib dibereskan.
