# Shared Context: API Reference

## Overview

This document establishes the canonical API patterns, endpoint standards, authentication flows, and integration contracts used across all Sentra AI product capsules. It serves as the primary reference for backend developers, frontend developers consuming APIs, and integration engineers connecting external services.

## API Architecture

### Base Pattern: Hono + oRPC
All Sentra API servers use:
- **Hono** as the HTTP framework (lightweight, fast, TypeScript-native)
- **oRPC** as the RPC layer for type-safe command routing
- **Zod** for request validation and response typing
- **Better Auth** for authentication and session management

### Server Configuration
```
Default bind: API_HOST:API_PORT (127.0.0.1:3100)
Protocol: HTTP (local dev), HTTPS (production via reverse proxy)
CORS: Configured per-environment, strict in production
Body limit: 10MB default (configurable per route)
Timeout: 30s default (configurable per route)
```

### API Router Structure (oRPC)
```typescript
// Canonical router organization
router({
  // Core entities
  bots: botRouter,           // Bot creation, configuration, management
  threads: threadRouter,     // Conversation threads, messaging
  runs: runRouter,           // Execution runs, lifecycle management
  routines: routineRouter,   // Scheduled tasks, recurring jobs
  computers: computerRouter, // Sandbox compute instances
  integrations: integrationRouter, // External service connections
  deployment: deploymentRouter,    // Deployment settings, managed AI
  
  // Platform services
  platform: platformRouter,  // Workspace management, billing
  billing: billingRouter,    // Usage, quotas, payments
  webhook: webhookRouter,    // Incoming webhooks from external services
  
  // Auth
  auth: authRouter,          // Better Auth routes (login, logout, sessions)
})
```

## Authentication

### Better Auth Integration
All authentication flows use Better Auth, configured through `@safrs/auth`.

#### Supported Methods
| Method | Status | Notes |
|--------|--------|-------|
| Email + Password | Active | Default, local-first |
| OAuth (Google) | Active | Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| OAuth (GitHub) | Planned | — |
| Magic Link | Planned | — |
| SSO (SAML) | Future | Enterprise requirement |

#### Session Management
- Sessions stored in PostgreSQL via Better Auth's Prisma adapter
- Session cookie: `httpOnly`, `secure` (production), `sameSite=lax`
- Session lifetime: 7 days default, configurable
- Workspace membership: every session resolves to a workspace via `requireMembership` middleware

### Authorization Model
```
User
  ↓ belongs to
Workspace (via workspace_memberships table)
  ↓ owns
Bots, Threads, Runs, Routines, Computers, Integrations
```

All API routes require workspace membership resolution. Unauthorized requests return `403 Forbidden`.

Role-based access within workspace (planned, not yet implemented):
- `owner` — full access, billing management, member invitation
- `admin` — full access except billing
- `member` — limited access, cannot invite members
- `viewer` — read-only access

## Request / Response Standards

### Request Format
```http
POST /rpc/bots/create
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "workspaceId": "ws_123456",
  "name": "Clinical Assistant",
  "template": "medical-nursing",
  "config": {
    "model": "anthropic/claude-3.5-sonnet",
    "systemPrompt": "..."
  }
}
```

### Success Response (2xx)
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "bot_789012",
    "name": "Clinical Assistant",
    "workspaceId": "ws_123456",
    "createdAt": "2026-09-14T10:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z"
  }
}
```

### Error Response (4xx, 5xx)
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      {
        "field": "config.model",
        "message": "Model 'invalid-model' is not supported"
      }
    ]
  }
}
```

### Standard Error Codes
| Code | HTTP Status | Meaning | Action |
|------|-------------|---------|--------|
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation | Fix request payload |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid session | Re-authenticate |
| `AUTHORIZATION_ERROR` | 403 | Valid session but insufficient permissions | Request access or use different workspace |
| `NOT_FOUND` | 404 | Resource does not exist | Verify resource ID |
| `CONFLICT` | 409 | Resource already exists or state conflict | Resolve conflict or use idempotency key |
| `RATE_LIMITED` | 429 | Too many requests | Implement exponential backoff |
| `INTERNAL_ERROR` | 500 | Server-side unexpected error | Report to Chief with request ID |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service degradation | Retry with exponential backoff |

### Idempotency
For mutating operations (POST, PUT, DELETE), clients should include an `Idempotency-Key` header:
```http
Idempotency-Key: <uuid>
```
The server stores the idempotency key for 24 hours. Duplicate requests with the same key return the original response without re-executing the operation.

## Real-Time Communication

### Server-Sent Events (SSE)
Endpoint: `GET /rpc/threads/subscribe`

Purpose: Real-time event delivery for thread updates, agent responses, and system events.

```javascript
const eventSource = new EventSource('/rpc/threads/subscribe?threadId=thread_123');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data: { seq: number, event: string, payload: object }
};
```

Event types:
| Event | Description |
|-------|-------------|
| `message` | New message in thread |
| `agent_response` | Agent generated a response |
| `run_update` | Execution run status changed |
| `error` | Error occurred in thread |

### WebSocket (Future)
WebSocket support planned for bidirectional real-time communication (voice, collaborative editing). Currently SSE covers all use cases.

## Integration Contracts

### External Service Integration Pattern
All external services are integrated through the `integrations` router with a consistent pattern:

1. **OAuth Connection**: User initiates OAuth flow via `/rpc/integrations/connect`
2. **Credential Storage**: OAuth tokens stored encrypted in `secrets` table
3. **Provider Adapter**: `@safrs/adapters` provides normalized interface per provider kind
4. **Tool Exposure**: External service capabilities exposed as "tools" that agents can invoke
5. **Rate Limiting**: Per-workspace rate limits enforced at adapter layer

### Supported Integrations
| Service | Type | Capsules | Status |
|---------|------|----------|--------|
| OpenRouter | Model provider | All AI features | Active |
| Anthropic | Model provider | All AI features | Active |
| E2B | Sandbox compute | SentraBot | Active |
| Daytona | Sandbox compute | SentraBot | Active |
| Box | Sandbox compute | SentraBot | Active |
| Composio | Integration platform | SentraBot | Active |
| Pipedream | Integration platform | SentraBot | Active |
| SendBlue | SMS provider | SentraBot | Active |
| WhatsApp Cloud API | Messaging | SentraBot | Active |
| Vapi | Voice calling | SentraBot | Active |
| Xendit | Payments | Future finance | Planned |
| PostHog | Analytics | All (optional) | Active |
| Supermemory | Memory | SentraBot | Active |

### Integration Health Check
Every integration must implement a health check endpoint:
```
GET /rpc/integrations/{integrationId}/health
```

Response:
```json
{
  "status": "healthy", // healthy | degraded | unhealthy
  "lastChecked": "2026-09-14T10:00:00Z",
  "details": {
    "connection": "connected",
    "rateLimitRemaining": 450,
    "rateLimitReset": "2026-09-14T11:00:00Z"
  }
}
```

## API Versioning

### Current Version: v1 (implicit)
All routes are currently unversioned (v1). Future breaking changes will introduce `/v2/` prefix.

### Deprecation Policy
- New API versions announced 90 days before breaking changes
- Deprecated endpoints continue to function for 180 days after announcement
- Sunset headers included in all deprecated endpoint responses:
  ```http
  Deprecation: true
  Sunset: Sat, 14 Dec 2026 00:00:00 GMT
  ```

## Performance Standards

| Metric | Target | Measurement |
|--------|--------|-------------|
| API p50 latency | < 100ms | Server logs |
| API p99 latency | < 500ms | Server logs |
| Error rate | < 0.1% | Server logs |
| SSE connection stability | > 99.5% uptime | Connection monitoring |
| Rate limit enforcement | < 1s | Request handling |

## Security Standards

### Input Validation
- All request bodies validated with Zod schemas
- No unvalidated input reaches business logic
- String length limits enforced (prevent DoS via large payloads)
- File upload size limits and type validation

### Output Sanitization
- No raw database objects returned directly — always map to DTOs
- Sensitive fields (passwords, tokens, internal IDs) stripped from responses
- Error messages do not leak internal implementation details

### Rate Limiting
| Tier | Requests/minute | Burst |
|------|----------------|-------|
| Free | 60 | 10 |
| Pro | 600 | 100 |
| Enterprise | Custom | Custom |

Rate limits are per-workspace and per-endpoint category.

### Audit Logging
All API requests logged with:
- Timestamp
- Workspace ID
- User ID (if authenticated)
- Endpoint
- Request method
- Response status
- Request ID (for tracing)
- IP address (hashed for privacy)

Logs retained for 90 days for security analysis.

## Testing APIs

### Local Development
```bash
# Start API server
pnpm dev --filter=api

# Default endpoint
http://127.0.0.1:3100

# Health check
curl http://127.0.0.1:3100/health
```

### Integration Testing
```bash
# Run integration test suite
pnpm test:integration

# Test specific API module
pnpm test:integration -- --grep "bot router"
```
