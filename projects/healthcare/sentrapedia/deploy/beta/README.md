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
4. Put the Gemini key in `/etc/sentrapedia/beta.env`, then run `bash /opt/sentrapedia/deploy/beta/update.sh`. The first build downloads the 1.2 GB model and takes several minutes.
5. Cloudflare → Zero Trust → Networks → Tunnels → create a `cloudflared` tunnel, run the install command it shows on the server, and add the public hostname `beta.sentrapedia.com` → `http://localhost:<port>` (3201 unless `SENTRAPEDIA_HOST_PORT` is set).
6. Cloudflare → Zero Trust → Access → Applications → add a self-hosted application for `beta.sentrapedia.com` with an Allow policy that includes the invited emails. Login method: one-time PIN.

## Settings (`/etc/sentrapedia/beta.env`)

| Name | Value |
| --- | --- |
| `GEMINI_API_KEY` | Paid-tier Gemini API key. Never commit it. |
| `SENTRAPEDIA_PUBLIC_ORIGIN` | `https://beta.sentrapedia.com`, the only origin the gateway accepts besides loopback. |
| `MIRA_MAX_CONCURRENT` | `3`, analyses that may run at once (1-8). The 5 USD daily budget still applies. |

On a shared server, `update.sh` also reads `SENTRAPEDIA_HOST_PORT` (default `3201`, beside medboard on `3000`; change it only together with the tunnel's service URL) and `SENTRAPEDIA_MEMORY` (default `2500m`) from its own environment, for example `SENTRAPEDIA_HOST_PORT=3202 bash update.sh`.

## Update and roll back

- Update: `bash /opt/sentrapedia/deploy/beta/update.sh` (pulls `main`, rebuilds, restarts, waits until ready).
- Roll back: `git -C /opt/sentrapedia checkout <previous commit>`, then run the same build and run commands from `update.sh` without `git pull`.
- Logs: `docker logs -f sentrapedia-beta`.
