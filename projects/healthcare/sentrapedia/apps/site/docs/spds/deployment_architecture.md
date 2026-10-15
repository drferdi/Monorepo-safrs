---
document_id: "28"
title: "Deployment Architecture"
status: active
authority: Gaffer
owner: "dr. Ferdi Iskandar"
version: "1.1.0"
created: "2026-10-14"
last_verified: "2026-10-15"
applies_to: "projects/healthcare/sentrapedia/apps/site"
source_of_truth: true
supersedes: []
related_requirements: []
related_decisions: []
related_evidence: []
agent_readable: true
agent_editable: false
human_approval_required: true
classification: CONDITIONAL
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Deployment Architecture

## Function
Define deployment assumptions and unresolved topology.

**FACT:** the local runtime is a single Node process (`scripts/serve.mjs`) serving `site/` and the contact endpoint.

**FACT (2026-10-15, Gaffer's decision):** the site is hosted on Vercel, team Sentraverse, project `sentrapedia` (`prj_tJejwcrthTPy78qBtdqbnYoyRvcW`), at `https://sentrapedia.vercel.app` with Vercel-managed TLS and CDN. It is public as a work-in-progress pre-beta site and shows a "Work in progress · Persiapan beta" notice. Only `apps/site` is uploaded; the clinical workspace is never deployed here.

- Build: `node scripts/transform.mjs`, output `site/`, no install step.
- Contact: `api/contact.mjs` is a Vercel Function that reuses `scripts/contact.mjs`. `CONTACT_PUBLIC_ORIGIN` is set. Delivery stays off (HTTP 503) until Gaffer adds `RESEND_API_KEY` and `RESEND_FROM_EMAIL` as Vercel secrets.
- Deploys run from this machine with the Vercel CLI in `apps/site`, using `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (no `.vercel/` folder). A deploy without `--prod` is a login-protected preview.
- Rollback: promote a previous deployment in Vercel.
- Git deployment is not connected: the Vercel account has no GitHub login connection. Two activation paths: (1) connect `drferdi/Sentrapedia` in Vercel with Root Directory `apps/site` and Git LFS on; or (2) a GitHub Actions deploy with SHA-pinned actions, checkout `lfs: true`, and a `VERCEL_TOKEN` secret. Both need a working Vercel dashboard login.

**UNKNOWN:** custom domain, WAF rules, monitoring and alerting, log retention, and an incident owner.
