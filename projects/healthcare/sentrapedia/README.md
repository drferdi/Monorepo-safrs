# Sentrapedia — clinical workspace

A standalone Next.js clinical workspace. Indonesian interface with English medical and technical terminology; Indonesian is the default document language and existing saved language choices are preserved. No account, API key, database, or Monorepo runtime is needed.

## Run

Node.js 22 or newer. From this directory:

```powershell
npm ci --workspaces=false
npm run dev
```

Open http://127.0.0.1:3101. For a production build, use `npm run build` and `npm start`.

## Working local features

- Create, edit, delete, and search fictional patients; patient lists with editable membership.
- Create, rename, link, delete, and revisit encounters. Patient context follows linked encounters.
- Persistent browser-local patients, encounters, lists, preferences, and editable drafts.
- Add typed context or local TXT/Markdown/CSV files (100 KB file limit; 30,000 character context limit).
- Fourteen document modes: clinical question brief, DDx worksheet, A&P, clinic note, HPI, telephone note, chronic care, handoff, checklist, AVS, patient education, referral, prior authorization, and scribe note.
- Structure explicitly labeled English/Indonesian information into note sections. Preserve source text; do not infer missing facts or diagnoses. Checklists are interactive.
- Separate patient statements and explicitly labeled clinician findings, assessment, and plan from visit transcripts.
- Edit, copy, and download drafts; export an entire encounter or JSON workspace backup.
- Choose specialty, Standard/Extended local formatting, output language, and writing preferences. Extended mode includes a review checklist.
- Optional browser speech recognition, with a working typed/pasted transcript fallback. The browser may use its vendor's speech service; no audio is stored by this app.
- Responsive navigation drawer, keyboard shortcuts (Ctrl/Cmd+K for new, Ctrl/Cmd+/ for search), native accessible modal dialogs, and reduced-motion support.

## Oracle and existing MIRA service

The product UI uses neutral labels: Referensi, Referensi penyakit and Analisis kasus. Provider/model branding is omitted from the form and newly generated draft text; full technical metadata remains in the immutable source snapshot for traceability. Existing saved draft text is not rewritten.

Main-composer Enter runs analysis directly and displays the validated diagnostic draft in the main conversation, without opening a dialog. Confirm fictional, identity-free complaint and context using the inline checkbox before submitting. Progress, cancellation and errors appear beside the composer. Editing the complaint, changing mode or finishing analysis resets confirmation. Referensi penyakit opens the separate catalog flow; the analysis shortcut focuses the main input.

Open **Referensi & MIRA** in the sidebar, or **Referensi Oracle / Analisis MIRA** beneath the composer. Oracle searches all 144 original records and 15 actual categories by name/code/category. Source file, record ID, version and SHA-256 remain visible. Repeated ICD codes stay separate. Source narratives are unreviewed and do not provide per-disease PNPK page citations.

MIRA uses the existing local service through a capsule-owned server adapter. The adapter requires the approved pinned DeepSeek Flash model for both planning and assessment; it checks the service profile before sending a case and rejects inconsistent model metadata or missing/out-of-budget reported cost. It does not import Med Assist code at runtime or choose another provider. For optional local configuration, copy `.env.example` to `.env.local`, provide an authorized `OPENROUTER_API_KEY` securely, and use the separate MIRA instance launcher described below. The key stays server-side. An authorized development token in `MIRA_SERVICE_TOKEN` connects the workspace to that instance; restart Sentrapedia after changing the connection. `MIRA_SERVICE_URL` defaults to `http://127.0.0.1:8787`; only HTTP loopback URLs are accepted. Never prefix the token with `NEXT_PUBLIC_`. The adapter does not start MIRA or read another project's environment. A reachable health check does not imply that a token is configured.

Only confirmed fictional cases are accepted. Enter in the built-in **Tanya / Diagnosis Banding** composer sends the complaint, recorded numeric age/sex and raw context/notes directly to the paid service. Patient name/ID are excluded; review narratives for identities before confirming fictional data. Missing clinical fields stay empty. Success appends the original prompt plus validated result to the captured encounter and clears the input. Failure or cancellation preserves the prompt and creates no placeholder draft or automatic retry. Changing mode or encounter cancels the pending main analysis. The optional structured form in Referensi starts blank and retains manual save. Browsing Oracle and checking health do not invoke the model. Same-origin/local-only POST, schema validation, identity-pattern guard, bounded messages, timeout/cancel and a single active request protect the local development flow. Identity-pattern detection is not certified anonymization. This endpoint has no production user authentication and must not be published as a clinical service.

A validated response displays model hypotheses, supporting/opposing reasons, missing information, next actions and disposition for clinician review. Oracle matches use exact codes and never remove diagnoses outside the catalog or create prescriptions. The result becomes a labeled MIRA draft with a fresh unchecked checklist, full case/response/trace/time/source snapshot, existing revisions and manual finalization. Dated verification reports distinguish fixture, live API and main-composer browser checks. None establishes clinical accuracy.

### Approved Gemini Flash profile

Chief approved switching from DeepSeek Flash to Gemini Flash to evaluate latency. Both stages are pinned to `google/gemini-2.5-flash`, an experimental technical profile rather than a clinically validated model. Existing prompts, the assessment schema and clinical postchecks are preserved. Catalog availability, endpoint pricing and quotas can change; an OpenRouter API key and available credit are required. The target is a complete result within five seconds; this is an acceptance target, not a verified performance claim.

`config/mira-deepseek.env.example` and `scripts/run-mira-deepseek.ps1` configure Gemini Flash in a separate installed MIRA runtime on loopback 8791. Their legacy filenames and the existing audit directory are retained to preserve budget history. Startup checks the catalog, price thresholds and compatible structured-output endpoints, then writes only this capsule's ignored `.env.local` URL/token. Chief explicitly requested removing ZDR: this runner sets `MIRA_OPENROUTER_ZDR=false` to omit the provider retention filter, and `MIRA_PROVISIONAL_DIFFERENTIAL=true` so a complaint-only case still gets a low-confidence differential, and `MIRA_FAST_ASSESSMENT=true` (no planning call; two parallel assessment parts, each raced in three copies) so a diagnosis returns in about 3 s. No-data-collection and required-parameters restrictions, synthetic-only input checks and clinical postchecks remain. The shared MIRA adapter defaults to ZDR on; port 8787 and Med Assist are not restarted or reconfigured. There are no installs or model calls at startup. Secrets stay in private environment files/processes, outside Git, arguments and UI.

```powershell
# Metadata/runtime check only; no keys, inference, service launch or configuration writes.
./scripts/run-mira-deepseek.ps1 -MiraRoot D:/DEV/gafferverse/mira-system -ValidateOnly
# Once an authorized key is in the process environment or Sentrapedia .env.local:
./scripts/run-mira-deepseek.ps1 -MiraRoot D:/DEV/gafferverse/mira-system
```

The server refuses old, mixed or unknown model profiles before forwarding cases. It requires valid response metadata and a nonnegative cost no greater than US$0.10 before using output. The isolated MIRA guard has a US$0.10 step budget, US$1 daily budget, two-call limit and 120-second deadline; the workspace timeout is 135 seconds. Cost guards record usage after calls and block subsequent calls, rather than guaranteeing that a provider cannot charge for a rejected/aborted response. There is no fallback to another model. Health/preflight are configuration checks, not proof of successful analysis. See the dated verification reports for observed live results. Legacy free-profile files remain historical and are not selected by the application.

Unavailable analysis responses use safe error-code messages for deadlines, budget limits, provider policy, provider errors and invalid output. Raw provider messages are never forwarded. An increased deadline does not guarantee provider completion; failed analysis preserves the main prompt and creates no placeholder draft.

References: [Gemini 2.5 Flash](https://openrouter.ai/google/gemini-2.5-flash), [provider policies](https://openrouter.ai/docs/guides/routing/provider-selection).

## Important integration boundaries

The default seeded patient and encounter titles are fictional demonstration content based on the screenshot. Browser storage is unencrypted and unsuitable for real patient data. The workspace account dialog can export a backup or clear all local records.

Built-in Tanya and Diagnosis Banding now use the explicit MIRA case-review flow. Existing local briefs stay unchanged; reuse their prompt to start a new analysis. Personal templates and other document modes, including A&P, still use deterministic text organization. Custom writing preferences and Standard/Extended apply to those local formats, not the MIRA model. AI output remains a draft requiring clinical review, not an active recommendation or a verified PNPK citation.

Real clinical use needs clinician-reviewed AI/evidence retrieval, a secure database, authentication/authorization, audit logs, validated transcription and consent, EHR connections, and any billing/subscription integrations. No keys or services are silently substituted from other capsules. Sentrapedia is an independent development workspace; footer links explain the local application's limits.

## Verification and deployment

```powershell
npx tsc --noEmit
npx eslint app components lib tests --fix
npm test -- tests/workspace.test.ts
npm run build
npm run deploy:dry-run
```

`capsule.json` contains lifecycle argv contracts. The deployment dry run checks build outputs, dependency traces, and absence of capsule escapes without deploying or writing remote state. The Dockerfile packages the standalone server with static assets, runs as a non-root user, and listens on port 3000. The Docker image itself must be tested when deploying; a dry run does not claim a live deployment.

All configs, dependencies, lock state, design-token snapshot, tests, and deployment files are capsule-local. `app/sentra-tokens.css` is a project-owned snapshot of Sentra Foundation Tokens v1.0; screenshot-specific semantic overrides live in `app/globals.css`. No root package is required.
