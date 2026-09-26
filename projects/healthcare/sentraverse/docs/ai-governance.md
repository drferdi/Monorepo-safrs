# AI Governance — Sentra AI (sentra-main)

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_

---

## Role of This Site

`sentra-main` is a **marketing and showcase site**. It presents Sentra's AI
capabilities to clinicians, partners, and investors. It does not run inference,
does not process clinical data, and does not make clinical recommendations.

All real AI execution occurs in the operational dashboard —
`app/primary-healthcare/dashboard/` (repo: `intelligence-dashboard`).

---

## AI Components on This Site

### 1. SentraSim (`components/SentraSim.tsx`)

**What it is:** A hardcoded sequential state machine simulating a CDSS workflow
step-by-step.

**What it is NOT:** It does not call any LLM or AI API. It does not process real
patient data.

The simulation case (Female, 46y, CAP) is entirely pre-written static data. The
"analysis" that appears on screen is a scripted reveal sequence, not a live
model inference. This must be clearly understood before making any changes to
the demo data.

**Governance requirement:** Any update to the demo case data — vital signs, lab
results, diagnoses, management steps — must be verified by Chief (Dr. Ferdi
Iskandar) for clinical plausibility before publication. Clinically implausible
demo data undermines trust in the product.

### 2. Audrey Section (`components/Audrey.tsx`)

**What it is:** A static animated conversation demo. The Bayesian analysis
response (Apendisitis Akut, LR+ 8.4, Alvarado 7/10) is pre-written copy.

**What it is NOT:** It does not connect to any live voice runtime or external
voice API.

**Governance requirement:** Confidence values, likelihood ratios, and scoring
tool outputs displayed in the demo must be clinically defensible. Do not change
these values without clinical review.

### 3. ClinicalTrajectory + ClinicalPrognosis

**What they are:** Data visualisation components rendering pre-defined demo
datasets — vital trends, risk probability bars, survival curves, radar charts.

**What they are NOT:** Live patient monitoring. Not connected to any database.

**Governance requirement:** Probability values displayed (e.g. "Krisis
Hipertensi: 72%") are illustrative demo values. They must not be presented as
validated model outputs without a corresponding validation study.

---

## Clinical Claims Policy

All quantitative clinical claims published on `sentrahai.com` require explicit
verification from Chief before appearing in production:

| Claim Type          | Examples                          | Required Action              |
| ------------------- | --------------------------------- | ---------------------------- |
| Efficacy statistics | "40% reduction in misdiagnosis"   | Chief sign-off in PR review  |
| Accuracy metrics    | "97.2% emergency triage accuracy" | Chief sign-off in PR review  |
| Benchmark data      | "3x faster clinical decisions"    | Chief sign-off in PR review  |
| Demo dataset values | Vital signs, lab results, risk %  | Clinical plausibility review |

These claims are currently published in:

- `components/Hero.tsx` — phase narrative copy
- `components/Services.tsx` — service descriptions
- `app/story/page.tsx` — company narrative
- `app/insights/data.ts` — article content

---

## Schema.org Structured Data

`app/layout.tsx` injects `SoftwareApplication` schema with a `featureList`
describing Sentra's 7 clinical protocols. This data is indexed by search engines
and LLMs.

**Governance requirement:** The `featureList` must accurately reflect shipped or
formally committed product capabilities. Aspirational features must not be
listed as current.

Current featureList (v1.0.0):

1. Real-time Clinical Decision Support
2. Audrey AI Voice Assistant
3. Clinical Trajectory Analysis
4. Prognosis Intelligence
5. Patient Risk Scoring
6. EMR Integration
7. Immutable Audit Trail

---

## `public/llms.txt`

This file is a machine-readable summary crawled by LLM-powered search engines
and AI assistants. It contains product metrics, team information, and pilot site
data.

**Governance requirement:** Metrics in `llms.txt` must be kept in sync with
verified data. Outdated or unverified metrics in this file affect how AI systems
describe Sentra to users globally.

---

_Architected and built by Drferdi — Sentra Healthcare Solutions © 2025–2026_
