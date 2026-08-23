# Data Privacy by Design (Healthcare & Confidentiality)

This document formalizes the data classification, privacy boundaries, and automated sanitization controls applied to **Medisync**.

---

## 1. Data Classification Matrix

| Data Category | Physical Location | Classification | Repository Policy |
|---|---|---|---|
| **Persona Blueprint** | `ai/profiles/avery/SOUL.md` | Behavioral Definition | **Committed** to git |
| **Skill Instructions** | `ai/profiles/avery/skills/` | Procedural Capabilities | **Committed** to git (sanitized) |
| **Config Template** | `config.example.yaml` | Operational Template | **Committed** to git |
| **WhatsApp Session** | `platforms/whatsapp/session/` | Identity Key (`creds.json`) | **STRICTLY PROHIBITED** (in `.gitignore`) |
| **Model Credentials** | `.env`, `auth.json` | API Keys & Secrets | **STRICTLY PROHIBITED** (in `.gitignore`) |
| **Episodic Memories** | `memories/MEMORY.md`, `USER.md` | Notes on Real Individuals | **STRICTLY PROHIBITED** (in `.gitignore`) |
| **Conversation State** | `state.db`, `sessions/` | Raw Chat Histories | **STRICTLY PROHIBITED** (in `.gitignore`) |
| **Task Boards** | `kanban.db` | Operational Tasks | **STRICTLY PROHIBITED** (in `.gitignore`) |

---

## 2. WhatsApp Session Security (`creds.json`)

The directory `platforms/whatsapp/session/` contains `creds.json` alongside active signal synchronization keys.

> [!CAUTION]
> Possessing `creds.json` is cryptographically equivalent to holding the private access key to the associated WhatsApp phone number. It must **never** be copied off the host, transmitted, or checked into version control.

---

## 3. Automated Leak Prevention Engine (`sync-profile-to-repo.ps1`)

To enable bidirectional synchronization between the live runtime and this git repository without exposing confidential data, `scripts/sync-profile-to-repo.ps1` executes automated pattern matching before committing any changes:

```mermaid
flowchart TD
  SourceFile["File in runtime/hermes-home/profiles/avery/"] --> FilterDir{"In Forbidden Directory?<br/>(platforms, state, memories, sessions)"}
  FilterDir -->|Yes| Skip["Skip File"]
  FilterDir -->|No| FilterExt{"Forbidden Extension?<br/>(*.db, *.key, *.env, creds.json)"}

  FilterExt -->|Yes| Skip
  FilterExt -->|No| ScanRegex["Scan for PII / Credential Patterns"]

  ScanRegex --> CheckResult{"Pattern Match Detected?"}
  CheckResult -->|Yes (Phone, JID, API Key)| Halt["QUARANTINE FILE & HALT SYNC"]
  CheckResult -->|Clean| Copy["Copy to ai/profiles/avery/"]
```

### Monitored Detection Patterns:
- **Indonesian Phone Numbers**: `\b628\d{8,12}\b`
- **WhatsApp User JIDs**: `\b\d{14}@lid\b`
- **WhatsApp Group JIDs**: `\b1203634\d{10}@g\.us\b`
- **OpenRouter API Keys**: `sk-or-v1-[A-Za-z0-9]{8,}`
- **OpenAI API Keys**: `sk-proj-[A-Za-z0-9]{8,}`
