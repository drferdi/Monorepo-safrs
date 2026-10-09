# MIRA contract v1 localized for Sentrapedia

Schemas, types.ts and validate-json.ts copied from Med Assist lib/diagnosis-engine on 2026-10-09 with Gaffer's integrate-both authorization. These are capsule-local snapshots, not runtime imports. Med Assist owns its originals; this integration does not modify them. Schema IDs retain their original contract identity.

request.schema.json SHA-256: 84eba75c9810b794d1875dde77fc204dd5515b879056a8b47c60eef398e607dc
response.schema.json SHA-256: b5048ad8fa750886dd7780435e1e09aabfb8299bbb1b49d0f1ca753154aef171 (Med Assist original 6bb903b9…bde4 plus the optional `therapy` block added 2026-10-09 for Sentrapedia; identical to the MIRA service copy)

Service protocol: POST /v1/diagnosis/step; GET /healthz. Server-held token, X-MIRA-Case-Origin synthetic. No extension/native-host dependency, clinical rule changes, credential copies or new provider choice. Additional input bounds/identity patterns in contract.ts are Sentrapedia guards; they do not guarantee complete anonymization. Only synthetic data is accepted.
