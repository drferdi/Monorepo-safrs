# Self-Hosting Deployment Guide (Docker)

This guide provides technical operators and *self-hosted beta* users with step-by-step instructions to deploy **Sentra Bot** securely on private servers (KVM VPS such as Hostinger, DigitalOcean, Hetzner, AWS) or local machines.

---

## 1. Docker Compose Topology

Sentra Bot operates on a multi-container architecture that strictly isolates public-facing ingress from high-privilege background execution engines.

```mermaid
flowchart TB
  subgraph PublicNetwork["Public Ingress (Bridge Network)"]
    ReverseProxy["Reverse Proxy (Nginx / Caddy / Traefik)<br/>Port 80 / 443 (HTTPS)"]
    Web["sentrabot-web (Next.js Dashboard + Hono API)<br/>Port 3000 / Harness Port 8799"]
  end

  subgraph InternalNetwork["Internal Private Network (No Published Ports)"]
    Worker["sentrabot-worker<br/>(Background Job Executor)"]
    Supervisor["sandbox-supervisor<br/>(Container/Browser Controller)"]
    BrowserSandbox["browser-sandbox<br/>(Isolated Headless Chromium)"]
    Postgres[("PostgreSQL 17 Database<br/>(Prisma Storage)")]
    Redis[("Redis / Graphile Queue<br/>(Job Scheduler)")]
  end

  User["Web User / Operator"] -->|HTTPS| ReverseProxy
  ReverseProxy --> Web
  Web -->|Internal Query| Postgres
  Web -->|Internal Job| Redis
  Web -->|Control Token| Worker
  Worker --> Redis
  Worker -->|Supervisor Token| Supervisor
  Supervisor --> BrowserSandbox
```

### Container Service Definitions (`docker-compose.yml`):
- **`sentrabot-web`**: Next.js App Router frontend dashboard and in-process Hono API server (`/api/sentrabot`). The only container reachable via the reverse proxy.
- **`sentrabot-worker`**: Private background Node.js service for agent execution, routine scheduling, and cognitive reasoning loops.
- **`sandbox-supervisor`**: Bounded sandbox controller with stripped privileges (`read_only: true`, `cap_drop: ALL`, `no-new-privileges: true`).
- **`browser-sandbox`**: Isolated headless Chromium container for web automation without access to host network interfaces.
- **`postgres`**: PostgreSQL 17 Alpine database for persistent storage of users, bots, threads, messages, and memory documents.
- **`redis`**: Message broker and task queue for routine scheduling (*Graphile Worker*).

---

## 2. Environment Variables Configuration (`.env`)

All runtime secrets and service parameters are managed via a root `.env` file.

### Template `.env` File:
```env
# --- SERVER & PORT CONFIGURATION ---
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://bot.yourcompany.com

# --- AUTHENTICATION & SECURITY (BETTER AUTH) ---
# Generate via: openssl rand -base64 32
BETTER_AUTH_SECRET=replace_with_a_secure_random_string_at_least_32_characters
BETTER_AUTH_URL=https://bot.yourcompany.com

# Initial signup mode: closed | invite | open (Recommended: closed)
SENTRABOT_SIGNUP_MODE=closed

# --- POSTGRESQL DATABASE ---
POSTGRES_USER=sentra_admin
POSTGRES_PASSWORD=replace_with_a_strong_database_password
POSTGRES_DB=sentrabot
DATABASE_URL=postgresql://sentra_admin:replace_with_a_strong_database_password@postgres:5432/sentrabot?schema=public

# --- REDIS / TASK QUEUE ---
REDIS_URL=redis://redis:6379

# --- INTERNAL CONTROL TOKENS (PRIVATE TOKENS) ---
# Communication tokens between Web, Worker, and Sandbox Supervisor
WORKER_CONTROL_TOKEN=private_worker_control_secret_token_32chars
SUPERVISOR_TOKEN=private_supervisor_control_secret_token_32chars

# --- MASTER ENCRYPTION KEY (BYOK VAULT) ---
# AES-256-GCM Master Key (64 Hexadecimal Characters = 32 bytes)
# Generate via: openssl rand -hex 32
CREDENTIAL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# --- MODEL PROVIDER KEYS (BYOK - BRING YOUR OWN KEY) ---
# Operators may provide default fallback keys or allow tenants to provide their own via Web UI
OPENROUTER_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

> [!CAUTION]
> **Never commit or share a populated `.env` file.** If `CREDENTIAL_ENCRYPTION_KEY` is lost, all tenant API keys stored in the database will become permanently unrecoverable.

---

## 3. Installation & Container Deployment

### 1. Prepare Directory Structure
```bash
mkdir -p ~/sentrabot && cd ~/sentrabot
# Copy docker-compose.yml and .env to this directory
```

### 2. Launch Container Stack
```bash
# Start all containers in detached mode
docker compose up -d
```

### 3. Apply Database Migrations
```bash
docker compose exec sentrabot-web pnpm --filter @safrs/database prisma migrate deploy
```

### 4. Claim Initial Administrator Account
Navigate to `https://bot.yourcompany.com` (or `http://SERVER_IP:3000`) and complete registration. The first registered user is automatically provisioned as the `Deployment Owner`.

---

## 4. Backup & Disaster Recovery Procedures

Persistent state is stored in two locations:
1. PostgreSQL Database Volume (`sentrabot_pgdata`).
2. Local user configuration, file storage, and agent memory in `~/.openmausbot` (or `sentrabot_data` volume).

### Automated Backup Script
Set up a daily cron job on the host machine:

```bash
#!/usr/bin/env bash
# backup-sentrabot.sh
BACKUP_DIR="/var/backups/sentrabot"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "[1/2] Backing up PostgreSQL database..."
docker compose exec -T postgres pg_dump -U sentra_admin sentrabot > "$BACKUP_DIR/db_$TIMESTAMP.sql"

echo "[2/2] Backing up local storage volume..."
tar -czf "$BACKUP_DIR/data_$TIMESTAMP.tar.gz" -C /var/lib/docker/volumes/sentrabot_data/_data .

# Retain backups for 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

### Disaster Recovery / Restore Procedure
In the event of a host failure:

1. Provision a new server and install Docker.
2. Restore the original `.env` file (ensure `CREDENTIAL_ENCRYPTION_KEY` matches exactly).
3. Start the `postgres` container:
   ```bash
   docker compose up -d postgres
   ```
4. Restore the database dump:
   ```bash
   docker compose exec -T postgres psql -U sentra_admin -d sentrabot < /var/backups/sentrabot/db_YYYYMMDD_HHMMSS.sql
   ```
5. Extract the file storage archive into the new Docker volume.
6. Launch the full application stack:
   ```bash
   docker compose up -d
   ```
