# API & Process Interface Contracts (Hermes / Medisync)

This document formalizes the internal HTTP APIs, process interfaces, and authentication boundaries governing the Hermes Agent runtime in Medisync.

---

## 1. WhatsApp Bridge HTTP Interface (Port 3000)

The Node.js Baileys bridge exposes an internal HTTP surface on `http://127.0.0.1:3000`:

```mermaid
flowchart LR
  Baileys["Baileys WebSocket"] <--> Bridge["Bridge Server (:3000)"]
  Bridge -->|GET /health| Gateway["Hermes Gateway (Python)"]
  Gateway -->|POST /send| Bridge
```

### Endpoints:
- **`GET /health`**:
  - *Response (200)*: `{"status": "connected"}` or `{"status": "connecting"}`.
  - Used by gateway startup checks to verify socket health.
- **`POST /send`**:
  - *Payload*: `{ "chatId": "1203634... @g.us", "text": "...", "replyTo": "..." }`
  - *Response (200)*: `{ "ok": true, "messageId": "..." }`

---

## 2. Python Dashboard Interface (Port 9119)

The Python dashboard (`hermes_cli/web_server.py`) provides real-time inspection of skills, configurations, and logs:

### Loopback Authentication Rule:
```python
def should_require_auth(host, allow_public=False) -> bool:
    return host not in _LOOPBACK_HOST_VALUES
```
- **Loopback Hosts (`127.0.0.1`, `localhost`, `::1`)**: Authentication exempt.
- **RFC1918 LAN & Public IPs**: Authentication is **mandatory**; the legacy `--insecure` flag is ignored by security policy. Remote access must use SSH tunneling:
  ```bash
  ssh -L 9119:localhost:9119 user@vps-ip
  ```

---

## 3. Node.js Web UI Authentication (`hermes-web-ui`)

The Electron and standalone browser interface uses an independent authentication table:

- **Database**: `~/.hermes-web-ui/hermes-web-ui.db` (SQLite `users` table).
- **Session Transport**: JSON Web Tokens (JWT) in Authorization headers.
- **Brute-Force Lockout**: Failed attempts are recorded in `.login-lock.json`. Reaching 10 consecutive failed attempts locks authentication for 15 minutes.

---

## 4. Gateway MCP Server Surface (`hermes mcp serve`)

Hermes provides a Model Context Protocol (MCP) server for external agent orchestration:

| Tool Name | Parameters | Purpose |
|---|---|---|
| `messages_send` | `recipient: string, message: string` | Dispatches outbound messages to paired messaging channels. |
| `skills_list` | `—` | Lists all 33+ active skills available in the runtime profile. |
| `skill_view` | `skill_name: string` | Retrieves the full markdown instruction set for a designated skill. |
| `memory_propose` | `file: "MEMORY.md" \| "USER.md", mode: "append" \| "replace", content: string` | Emits a pending memory mutation to `pending/memory/`. |
