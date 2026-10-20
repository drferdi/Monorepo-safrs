# AADI contract v1 localized for Sentrapedia

Schemas, types.ts and validate-json.ts copied from Med Assist lib/diagnosis-engine on 2026-10-09 with Gaffer's integrate-both authorization. These are capsule-local snapshots, not runtime imports. Med Assist owns its originals; this integration does not modify them. Schema IDs retain their original contract identity.

request.schema.json SHA-256: 9f4b3b79004249e814a14472b81410dd9c2600e89901e417aaf2fd89ecdf76f7
response.schema.json SHA-256: e70b16bfba157b07d57afb0ee7489131fd4b8788ac5879539501fc30704a37ec (Med Assist original 6bb903b9…bde4 plus the optional `therapy` block added 2026-10-09 for Sentrapedia; identical to the AADI service copy except the top-level description)

On 2026-10-17 both top-level descriptions here were rewritten to name the Sentrapedia gateway and files instead of Med Assist (tech-debt row 22); the copies under `aadi/service/contract/` keep the vendored text. On 2026-10-20 MIRA was renamed AADI in titles and descriptions on both sides, and the 2026-10-20 report fields were added; the `$id` values keep the upstream contract identity.

Service protocol: POST /v1/diagnosis/step; GET /healthz. Server-held token, X-AADI-Case-Origin synthetic. No extension/native-host dependency, clinical rule changes, credential copies or new provider choice. Additional input bounds/identity patterns in contract.ts are Sentrapedia guards; they do not guarantee complete anonymization. Only synthetic data is accepted.
