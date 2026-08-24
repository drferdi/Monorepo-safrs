# Developer & Operator Onboarding (Avery / Avery)

Welcome to **Avery**, the version-controlled configuration home for **Avery** — the institutional Home Agent of **Sentra Artificial Intelligence** and Healthcare domain systems.

---

## 1. Monorepo & Capsule Architecture

Avery does not compile custom application binaries; instead, it configures and version-controls the behavior, skills, and deployment blueprints of **Hermes Studio / Hermes Agent**.

```
D:/DEV/Monorepo/projects/healthcare/avery/
├── ai/profiles/avery/                 # Avery Configuration & Behavior
│   ├── SOUL.md                        # Persona definition (Sentra's Home Agent)
│   ├── config.example.yaml            # Sanitized gateway configuration template
│   └── skills/                        # 33+ specialized operational skills
├── deploy/                            # Deployment Blueprints
│   ├── Dockerfile                     # Custom Hermes container with SQLite 3.53.4
│   ├── docker-compose.yml             # Gateway + Python Dashboard multi-service topology
│   └── .env.example                   # Environment variable template
├── scripts/                           # Operational Automations
│   ├── restart-gateway.bat / .sh      # Safe gateway restart with orphan bridge cleanup
│   ├── sync-profile-to-repo.ps1       # Sanitized runtime-to-repo synchronization
│   ├── check-unregistered-groups.ps1  # WhatsApp allowlist diagnostic tool
│   └── verify-runtime-junctions.ps1   # Directory junction integrity verification
├── docs/                              # Architecture, data governance, and reality audits
└── runtime/                           # Physical Hermes installation (~3.8 GB, git-ignored)
```

### Runtime Directory & Windows Junctions:
Hermes reads all profile and session data from `HERMES_HOME`:
- **Windows**: `%LOCALAPPDATA%\hermes` (directory junction to `%USERPROFILE%\.hermes` ➔ `runtime/hermes-home`).
- **Linux / Container**: `~/.hermes` mounted to `/opt/data`.

The physical binary installation lives in `runtime/` (ignored by `.gitignore` to prevent secret leaks), while directory junctions allow all legacy absolute system paths to function seamlessly.

---

## 2. Local Operational Loop (Gateway Lifecycle)

Hermes operates as a coordinated multi-process architecture:
1. **`whatsapp-bridge`** (Node.js / Baileys, Port 3000): Handles WhatsApp socket connections.
2. **`gateway`** (Python): Manages cognitive reasoning, session context, memories, cron, and skill execution.
3. **`dashboard`** (Python, Port 9119): Local inspection web interface (loopback authentication exempt).
4. **`web UI`** (Node.js `hermes-web-ui`): Electron/Browser interface with JWT database authentication.

### Safe Restart Sequence:
> [!IMPORTANT]
> A terminating gateway process does not always kill its child `whatsapp-bridge`. An orphan bridge process will continue holding **Port 3000** and locking the session directory. Consequently, the next gateway startup fails with **Exit Code 78** (*"WhatsApp enabled but not paired"*).

Always use the provided restart scripts to ensure proper process teardown:
```powershell
# Windows PowerShell / CMD
.\scripts\restart-gateway.bat

# Linux / macOS Bash
bash scripts/restart-gateway.sh
```

### Diagnostic Scripts:
```powershell
# Check for WhatsApp groups that exist in session but are missing from config.yaml allowlist:
pwsh -File scripts/check-unregistered-groups.ps1

# Verify runtime directory junctions:
pwsh -File scripts/verify-runtime-junctions.ps1
```

---

## 3. Git, Profile Sync & Boundary Rules

Because this repository contains persona definitions and skills for real operational teams, strict data boundaries apply:

### Automated Profile Synchronization (`sync-profile-to-repo.ps1`)
To pull updated skills or persona refinements from the live runtime into git:
```powershell
# Preview synchronization without modifying files:
pwsh -File scripts/sync-profile-to-repo.ps1 -WhatIf

# Execute synchronization with automated PII & secret scanning:
pwsh -File scripts/sync-profile-to-repo.ps1
```
The script scans every file with regex patterns for Indonesian phone numbers (`628...`), WhatsApp JIDs (`@g.us`, `@lid`), OpenRouter keys (`sk-or-v1-...`), and OpenAI keys (`sk-proj-...`), automatically halting synchronization if unredacted secrets are detected.

### Non-Negotiable Governance Rules:
- **Never Commit**: `auth.json`, `creds.json`, `.env`, `state.db`, `kanban.db`, `memories/`, `pending/`.
- **Protected File**: Do not modify `ai/profiles/avery/SOUL.md` without explicit approval from Human Owner (**Chief**).
