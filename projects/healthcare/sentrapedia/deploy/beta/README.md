# Closed beta deployment

One Ubuntu 24.04 server (2 vCPU, 4 GB RAM, Jakarta) runs the Docker image on loopback. Cloudflare Tunnel connects it to `https://beta.sentrapedia.com`, and Cloudflare Access lets in only invited email addresses (one-time code by email). The app listens on loopback only, so the server needs no open port for it; firewall rules of other apps on the same server stay untouched. Fictional cases only.

## First time

1. On the server, as root: copy and run `setup-server.sh` (packages, swap, firewall, `/etc/sentrapedia/beta.env`, a deploy key).
2. On GitHub, `drferdi/Sentrapedia` → Settings → Deploy keys → add the printed key, read-only.
3. On the server:
   ```bash
   GIT_SSH_COMMAND="ssh -i /root/.ssh/sentrapedia_deploy" git clone git@github.com:drferdi/Sentrapedia.git /opt/sentrapedia
   git -C /opt/sentrapedia config core.sshCommand "ssh -i /root/.ssh/sentrapedia_deploy"
   ```
4. Image registry (since 2026-10-20, once). CI builds the image on every push to `main` and publishes it to private GHCR as `ghcr.io/drferdi/sentrapedia-beta`, so the server only pulls it.
   - Before the first merge with this setup: GitHub → Settings → Billing → set a spending limit for Packages. The free tier holds 500 MB of private storage and the first image is about 1.8 GB, so without a limit above $0 the first publish fails. Estimate, not measured: about US$1-3 a month (storage of five images that share most layers, plus about 0.1-0.3 GB transfer per code update; a `package-lock.json` change moves the 1.2 GB model again).
   - GitHub → Settings → Developer settings → Personal access tokens (classic) → a token with `read:packages` only (fine-grained tokens do not cover packages). On the server, as root, paste it when asked: `docker login ghcr.io -u drferdi --password-stdin`. Docker keeps it in `/root/.docker/config.json`, readable by root only.
   - After the first publish, check that the package on GitHub shows **Private**.
5. Put the Gemini key in `/etc/sentrapedia/beta.env`, then run `bash /opt/sentrapedia/deploy/beta/update.sh`. The first pull fetches the 1.2 GB model layer; later updates fetch only the changed layers.
6. Cloudflare → Zero Trust → Networks → Tunnels → create a `cloudflared` tunnel, run the install command it shows on the server, and add the public hostname `beta.sentrapedia.com` → `http://localhost:<port>` (3201 unless `SENTRAPEDIA_HOST_PORT` is set).
7. Cloudflare → Zero Trust → Access → Applications → add a self-hosted application for `beta.sentrapedia.com` with an Allow policy that includes the invited emails. Login method: one-time PIN.

## Settings (`/etc/sentrapedia/beta.env`)

| Name | Value |
| --- | --- |
| `GEMINI_API_KEY` | Paid-tier Gemini API key. Never commit it. |
| `SENTRAPEDIA_PUBLIC_ORIGIN` | `https://beta.sentrapedia.com`, the only origin the gateway accepts besides loopback. |
| `AADI_MAX_CONCURRENT` | `3`, analyses that may run at once (1-8). The 5 USD daily budget still applies. |

`/etc/sentrapedia/index.env` is separate and holds one line, `SENTRAPEDIA_INDEX_TOKEN=<token>` (chmod 600): a GitHub
token with read access to the contents of `drferdi/Sentrapedia`. The generated TheOracle vectors left git on
2026-10-25 and come from the pinned `theoracle-index` release instead, so a **local build** needs this token. An
image pull does not: CI fetched the index when it built the image.

On a shared server, `update.sh` also reads `SENTRAPEDIA_HOST_PORT` (default `3201`, beside medboard on `3000`; change it only together with the tunnel's service URL) and `SENTRAPEDIA_MEMORY` (default `2500m`) from its own environment, for example `SENTRAPEDIA_HOST_PORT=3202 bash update.sh`.

## Update and roll back

- Update: after CI on `main` is green, `bash /opt/sentrapedia/deploy/beta/update.sh` (pulls `main`, pulls the image `sha-<commit>` built by CI, restarts, waits until ready). If CI is still running or failed, it stops with a message and the running container stays.
- Build on the server instead (CI down, or no `docker login`): `SENTRAPEDIA_BUILD=local bash /opt/sentrapedia/deploy/beta/update.sh`. It takes 12-18 minutes and squeezes medboard's memory, so use it only when needed. It first downloads the TheOracle index artefact (about 53 MB) in a throwaway `node:24-bookworm-slim` container, because this host has no Node; it never rebuilds the index, which would need the 1.2 GB embedding model and far more memory than this server has.
- Roll back: `SENTRAPEDIA_IMAGE_TAG=sha-<previous commit> bash /opt/sentrapedia/deploy/beta/update.sh` (no `git pull`). CI keeps the five newest images; earlier tags pulled on this server also stay until removed.
- Logs: `docker logs -f sentrapedia-beta`.
