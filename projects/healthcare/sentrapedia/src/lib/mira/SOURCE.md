# MIRA contract v1 localized for Sentrapedia

Schemas, types.ts and validate-json.ts copied from Med Assist lib/diagnosis-engine on 2026-10-09 with Gaffer's integrate-both authorization. These are capsule-local snapshots, not runtime imports. Med Assist owns its originals; this integration does not modify them. Schema IDs retain their original contract identity.

request.schema.json SHA-256: 8a635a8d9c0e476d7b0227b04d3f4d821c2f973ab94f10b573c0bfd037fc18c1
response.schema.json SHA-256: 6b0ecb098be295426423be0d0542bfe3c6bb07d9809344f00f38abe82f2dabd2 (Med Assist original 6bb903b9…bde4 plus the optional `therapy` block added 2026-10-09 for Sentrapedia; identical to the MIRA service copy except the top-level description)

On 2026-10-17 both top-level descriptions here were rewritten to name the Sentrapedia gateway and files instead of Med Assist (tech-debt row 22); the copies under `mira/service/contract/` keep the vendored text.

Service protocol: POST /v1/diagnosis/step; GET /healthz. Server-held token, X-MIRA-Case-Origin synthetic. No extension/native-host dependency, clinical rule changes, credential copies or new provider choice. Additional input bounds/identity patterns in contract.ts are Sentrapedia guards; they do not guarantee complete anonymization. Only synthetic data is accepted.
