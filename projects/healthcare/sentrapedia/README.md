# Sentrapedia — clinical workspace

A standalone Next.js clinical workspace. Indonesian interface with English medical and technical terminology; Indonesian is the default document language and existing saved language choices are preserved. MIRA and the Oracle II knowledge store are bundled inside this capsule. An OpenRouter key is required for analysis; no external MIRA repository or Monorepo runtime is needed.

## Run

Node.js 24+ and Python 3.11+ (the Docker image includes both). Put `OPENROUTER_API_KEY` in the process environment or capsule `.env.local`. From this directory:

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

## Oracle and integrated MIRA engine

The product UI uses neutral labels: Referensi, Referensi penyakit and Analisis kasus. Provider/model branding is omitted from the form and newly generated draft text; full technical metadata remains in the immutable source snapshot for traceability. Existing saved draft text is not rewritten.

Main-composer Enter runs analysis directly and displays the validated diagnostic draft in the main conversation, without opening a dialog. Confirm fictional, identity-free complaint and context using the inline checkbox before submitting. Progress, cancellation and errors appear beside the composer. Editing the complaint, changing mode or finishing analysis resets confirmation. Referensi penyakit opens the separate catalog flow; the analysis shortcut focuses the main input.

Open **Referensi & MIRA** in the sidebar, or **Referensi Oracle / Analisis MIRA** beneath the composer. Oracle searches all 144 original records and 15 actual categories by name/code/category. Source file, record ID, version and SHA-256 remain visible. Repeated ICD codes stay separate. Source narratives are unreviewed and do not provide per-disease PNPK page citations.

`npm ci --workspaces=false` installs Node dependencies and a local Python environment under `.runtime/mira/venv`. `npm run dev` / `npm start` launch the bundled `mira/service`, verify its profile and Oracle II capability, then start the workspace. The supervisor generates a private loopback URL/token in memory and overrides old connection settings. Both processes stop together; Windows guardians also clean up if the supervisor is forcibly terminated. No separate install, `MiraRoot`, manual service startup, or external environment file is used. See [integrated runtime](docs/mira-integration.md).

Only confirmed fictional cases are accepted. Enter in the built-in **Tanya / Diagnosis Banding** composer sends the complaint, recorded numeric age/sex and raw context/notes directly to the paid service. Patient name/ID are excluded; review narratives for identities before confirming fictional data. Missing clinical fields stay empty. Success appends the original prompt plus validated result to the captured encounter and clears the input. Failure or cancellation preserves the prompt and creates no placeholder draft or automatic retry. Changing mode or encounter cancels the pending main analysis. The optional structured form in Referensi starts blank and retains manual save. Browsing Oracle and checking health do not invoke the model. Same-origin/local-only POST, schema validation, identity-pattern guard, bounded messages, timeout/cancel and a single active request protect the local development flow. Identity-pattern detection is not certified anonymization. This endpoint has no production user authentication and must not be published as a clinical service.

A validated response displays model hypotheses, supporting/opposing reasons, missing information, next actions and disposition for clinician review. Oracle matches use exact codes and never remove diagnoses outside the catalog or create prescriptions. The result becomes a labeled MIRA draft with a fresh unchecked checklist, full case/response/trace/time/source snapshot, existing revisions and manual finalization. Dated verification reports distinguish fixture, live API and main-composer browser checks. None establishes clinical accuracy.

### Approved Gemini Flash profile

Gaffer approved switching from DeepSeek Flash to Gemini Flash to evaluate latency. Both stages are pinned to `google/gemini-2.5-flash`, an experimental technical profile rather than a clinically validated model. Existing prompts, the assessment schema and clinical postchecks are preserved. Catalog availability, endpoint pricing and quotas can change; an OpenRouter API key and available credit are required. The target is a complete result within five seconds; this is an acceptance target, not a verified performance claim.

The unified launcher preserves Gemini Flash for both stages, provisional differentials, fast assessment and fast therapy, provider throughput routing, and the approved `MIRA_OPENROUTER_ZDR=false`. Synthetic-only, no-data-collection and required-parameter guards remain. The engine uses a 20-second deadline, a US$0.10 step guard, and a US$5 daily budget with the existing `.runtime/mira-deepseek/audit` history. The web timeout remains 135 seconds. Up to nine raced calls are allowed by the existing fast engine. Usage guards record reported cost after calls and do not guarantee a provider cannot charge for an aborted/rejected response. Startup reads public catalog/endpoint metadata and preserves the prior price limits and structured-output checks without sending a key or case. No model calls occur at startup; readiness proves local configuration, not provider quota or clinical accuracy. The legacy DeepSeek-named wrapper delegates to the unified launcher; the historical free launcher is retired. Shared services 8787/8791 are not selected by normal Sentrapedia startup.

Unavailable analysis responses use safe error-code messages for deadlines, budget limits, provider policy, provider errors and invalid output. Raw provider messages are never forwarded. An increased deadline does not guarantee provider completion; failed analysis preserves the main prompt and creates no placeholder draft.

References: [Gemini 2.5 Flash](https://openrouter.ai/google/gemini-2.5-flash), [provider policies](https://openrouter.ai/docs/guides/routing/provider-selection).

## Important integration boundaries

The default seeded patient and encounter titles are fictional demonstration content based on the screenshot. Browser storage is unencrypted and unsuitable for real patient data. The workspace account dialog can export a backup or clear all local records.

Built-in Tanya and Diagnosis Banding now use the explicit MIRA case-review flow. Existing local briefs stay unchanged; reuse their prompt to start a new analysis. Personal templates and other document modes, including A&P, still use deterministic text organization. Custom writing preferences and Standard/Extended apply to those local formats, not the MIRA model. AI output remains a draft requiring clinical review, not an active recommendation or a verified PNPK citation.

Real clinical use needs clinician-reviewed AI/evidence retrieval, a secure database, authentication/authorization, audit logs, validated transcription and consent, EHR connections, and any billing/subscription integrations. No keys or services are silently substituted from other capsules. Sentrapedia is an independent development workspace; footer links explain the local application's limits.

## Verification and deployment

```powershell
npx tsc --noEmit
npm run lint
npm run test:all
npm run build
npm run deploy:dry-run
```

`project.contract.json` contains the canonical lifecycle argv contracts. The deployment dry run checks build outputs, dependency traces, and absence of capsule escapes without deploying or writing remote state. The Dockerfile installs the bundled engine and packages the standalone server with static assets, runs as a non-root user, and listens on port 3000. The Docker image itself must be tested when deploying; a dry run does not claim a live deployment.

All configs, dependencies, lock state, design-token snapshot, tests, and deployment files are capsule-local. `src/app/sentra-tokens.css` is a project-owned snapshot of Sentra Foundation Tokens v1.0; screenshot-specific semantic overrides live in `src/app/globals.css`. No root package is required.
