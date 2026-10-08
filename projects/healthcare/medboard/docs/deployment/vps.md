# VPS Deployment Runbook — MedBoard

Production setup, deployment pipeline, rollback procedures, and automated backup routines on an Ubuntu 24.04 VPS (Biznet Gio, Hetzner, IDCloudHost, or any standard Ubuntu 24.04 LTS host).

---

## Server Specifications & Directory Layout

### Minimum Hardware Requirements
- **vCPU:** 2 Cores
- **RAM:** 4 GB + 2 GB Swap (Headless Chromium for Playwright EMR automation and PDF report generation requires sufficient memory headroom)
- **Disk:** 40 GB NVMe / SSD

### Filesystem Layout

| Path | Purpose & Ownership |
|---|---|
| `/opt/medboard/app` | Active application codebase (previous release backed up at `app.old`) |
| `/var/lib/medboard/runtime` | Persistent runtime state (`bridge-queue`, registrations, crew profiles, EMR history, PDFs). `/opt/medboard/app/runtime` is a symlink pointing here. |
| `/opt/medboard/browsers` | Headless Chromium binaries for Playwright (`PLAYWRIGHT_BROWSERS_PATH`) |
| `/etc/medboard/medboard.env` | Environment configuration file (readable only by root and `medboard` group) |
| `/var/backups/medboard` | Daily automated database and runtime directory backups (retained for 14 days) |

**Network Flow:** `Public Internet` → **Caddy** (`:443`, automatic TLS termination, WebSocket proxy) → `127.0.0.1:3000` (`server.ts`, Next.js + Socket.IO managed by systemd) → Local **PostgreSQL** Unix domain socket.

---

## 1. Initial Host Setup (Executed Once as Root)

Log in to the server via SSH (e.g. `ssh gaffer@IP_VPS`, then elevate with `sudo -i`):

```bash
# System updates and package installations
apt update && apt -y upgrade
apt -y install postgresql caddy ufw curl
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

# Node.js 24 and Corepack
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt -y install nodejs
corepack enable   # Activates pnpm 11.21.0 pinned in package.json

# System user and directory structure
adduser --system --group --home /opt/medboard medboard
mkdir -p /opt/medboard/app /opt/medboard/browsers /var/lib/medboard/runtime /etc/medboard /var/backups/medboard
chown -R medboard:medboard /opt/medboard /var/lib/medboard
chown root:postgres /var/backups/medboard && chmod 770 /var/backups/medboard
install -m 640 -o root -g medboard /dev/null /etc/medboard/medboard.env

# Database provisioning (local peer authentication)
sudo -u postgres createuser medboard
sudo -u postgres createdb -O medboard medboard
```

### Environment Configuration (`/etc/medboard/medboard.env`)

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
TRUST_PROXY_HEADERS=true
DATABASE_URL=postgresql://medboard@localhost/medboard?host=/var/run/postgresql
NEXT_PUBLIC_BASE_URL=https://medboard.sentrahai.com
PLAYWRIGHT_BROWSERS_PATH=/opt/medboard/browsers
```

Generate cryptographically secure secrets directly on the host machine:

```bash
echo "CREW_ACCESS_SECRET=$(openssl rand -hex 32)" >> /etc/medboard/medboard.env
echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> /etc/medboard/medboard.env
```

*For optional provider keys (LiveKit, Resend, Sentry, DeepSeek), refer to [Deployment Overview](overview.md).*

### Systemd Service Definition (`/etc/systemd/system/medboard.service`)

```ini
[Unit]
Description=MedBoard Production Service
After=network.target postgresql.service

[Service]
User=medboard
WorkingDirectory=/opt/medboard/app
EnvironmentFile=/etc/medboard/medboard.env
ExecStartPre=/usr/bin/pnpm exec prisma migrate deploy
ExecStart=/usr/bin/pnpm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Caddy Reverse Proxy Configuration (`/etc/caddy/Caddyfile`)

```caddyfile
medboard.sentrahai.com {
	reverse_proxy 127.0.0.1:3000
}
```

Enable and reload services:
```bash
systemctl reload caddy && systemctl enable --now medboard
```

---

## 2. Release Deployment Workflow

From your local machine (PowerShell), archive the committed workspace and transfer to the server:

```powershell
# Archive repository at HEAD
git -C D:\DEV\monorepo archive --format=tar.gz -o $env:TEMP\medboard.tar.gz HEAD:projects/healthcare/medboard
scp $env:TEMP\medboard.tar.gz root@IP_VPS:/tmp/

# Archive Git LFS binary assets from public/
$m = 'D:\DEV\monorepo\projects\healthcare\medboard'
git -C $m diff --quiet HEAD -- public; if ($LASTEXITCODE) { throw 'public/ has uncommitted modifications' }
[IO.File]::WriteAllText("$env:TEMP\medboard-lfs.txt", ((git -C $m lfs ls-files -n -I 'projects/healthcare/medboard/public/**') -replace '^projects/healthcare/medboard/','' -join "`n") + "`n")
tar.exe -czf $env:TEMP\medboard-lfs.tar.gz -C $m -T $env:TEMP\medboard-lfs.txt
scp $env:TEMP\medboard-lfs.tar.gz root@IP_VPS:/tmp/
```

On the production server (execute as root):

```bash
set -euo pipefail
cd /opt/medboard && rm -rf app.new && mkdir app.new && tar -xzf /tmp/medboard.tar.gz -C app.new
tar -xzf /tmp/medboard-lfs.tar.gz -C app.new

# Assert no Git LFS pointers remain in public/
! grep -rlq '^version https://git-lfs' app.new/public || { echo 'Error: Git LFS pointers detected in public/'; exit 1; }

cp -rn app.new/runtime/. /var/lib/medboard/runtime/
chown -R medboard:medboard app.new /var/lib/medboard/runtime
cd app.new

# Install dependencies with build tooling
sudo -u medboard env -u NODE_ENV HOME=/opt/medboard COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install --frozen-lockfile
PLAYWRIGHT_BROWSERS_PATH=/opt/medboard/browsers ./node_modules/.bin/playwright install-deps chromium
sudo -u medboard env HOME=/opt/medboard PLAYWRIGHT_BROWSERS_PATH=/opt/medboard/browsers ./node_modules/.bin/playwright install chromium

# Compile production bundle
rm -rf .next
sudo -u medboard bash -c 'set -a; . /etc/medboard/medboard.env; set +a; export HOME=/opt/medboard; pnpm run build'

# Link persistent runtime directory
rm -rf runtime && ln -s /var/lib/medboard/runtime runtime && chown -h medboard:medboard runtime

# Atomic blue/green swap and restart
cd /opt/medboard && rm -rf app.old && { [ -d app ] && mv app app.old || true; } && mv app.new app
systemctl restart medboard && sleep 15 && curl -fsS http://127.0.0.1:3000/api/health
```

---

## 3. Initial Administrative Account Seeding

MedBoard requires at least one active user account to boot. Seed the administrator account via:

```powershell
ssh -t gaffer@IP_VPS sudo medboard-seed-admin
```

---

## 4. Emergency Rollback

If a release exhibits unexpected behavior:

```bash
cd /opt/medboard && mv app app.bad && mv app.old app && systemctl restart medboard
```
*Note: Code rollback preserves persistent runtime state and database records, but does not reverse executed SQL migrations.*

Log inspection:
```bash
journalctl -u medboard -f
```

---

## 5. Daily Backup Automation (`/etc/cron.d/medboard-backup`)

```cron
30 2 * * * postgres pg_dump -Fc medboard > /var/backups/medboard/db-$(date +\%F).dump
45 2 * * * root tar -czf /var/backups/medboard/runtime-$(date +\%F).tar.gz -C /var/lib/medboard runtime
0 3 * * * root find /var/backups/medboard -type f -mtime +14 -delete
```

> [!TIP]
> Ensure offsite snapshots or cloud provider backup policies are active alongside local dumps to protect against hardware failure.
