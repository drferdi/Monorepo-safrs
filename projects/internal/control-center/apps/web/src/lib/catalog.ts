import type {
  AgentRecord,
  DoctorCheck,
  KnowledgeRecord,
  NextAction,
  PackageRecord,
  ProjectRecord,
  RiskTier,
  SafetyClass,
  TaskStateRecord,
} from "./control-center";

export const DOCTOR_CHECKS: DoctorCheck[] = [
  {
    id: "node",
    area: "NODE",
    label: "Node.js 24 LTS",
    meaning: "The machine needs Node.js 24.18 or later on the 24 line.",
    ready: "Node.js 24 LTS is compatible.",
    blocked: "Node.js 24 LTS is not yet compatible.",
    recovery: "Install Node.js 24 LTS, then run Check Readiness.",
    status: "unknown",
  },
  {
    id: "pnpm",
    area: "PNPM",
    label: "pnpm",
    meaning: "The repository package manager must be available.",
    ready: "pnpm is available.",
    blocked: "pnpm is not yet available.",
    recovery: "Enable Corepack or install pnpm, then run Check Readiness.",
    status: "unknown",
  },
  {
    id: "git",
    area: "GIT",
    label: "Git",
    meaning: "Changes and evidence depend on Git.",
    ready: "Git is available.",
    blocked: "Git is not yet available.",
    recovery: "Install Git, then run Check Readiness.",
    status: "unknown",
  },
  {
    id: "docker-installed",
    area: "DOCKER",
    label: "Docker installed",
    meaning: "The local database uses Docker.",
    ready: "Docker is available.",
    blocked: "Docker is not yet available.",
    recovery: "Install Docker Desktop, then run Check Readiness.",
    status: "unknown",
  },
  {
    id: "docker-engine",
    area: "DOCKER",
    label: "Docker engine",
    meaning: "Docker Desktop must actually be running, not merely installed.",
    ready: "Docker Desktop is running.",
    blocked: "The Docker engine is not running.",
    recovery:
      "Open Docker Desktop, wait until it is ready, then start the local app.",
    status: "unknown",
  },
  {
    id: "environment-file",
    area: "ENV",
    label: "Environment file",
    meaning:
      "Local values are stored in the environment file, not typed into this board.",
    ready: "The environment file is available.",
    blocked: "The environment file is not yet available.",
    recovery: "Run Prepare Local Environment.",
    status: "unknown",
  },
  {
    id: "database-url",
    area: "DATABASE",
    label: "Disposable database",
    meaning: "Only disposable local PostgreSQL is accepted.",
    ready: "DATABASE_URL points to disposable local PostgreSQL.",
    blocked: "A safe local DATABASE_URL is not yet available.",
    recovery:
      "Use the value from the environment example. Do not use a production database.",
    status: "unknown",
  },
  {
    id: "postgres-ready",
    area: "POSTGRES",
    label: "Local PostgreSQL",
    meaning: "The Golden Path uses the local safrs_local database.",
    ready: "Local PostgreSQL is ready.",
    blocked: "Local PostgreSQL is not yet ready.",
    recovery:
      "Open Docker Desktop, then run Prepare Local Environment or Start Local App.",
    status: "unknown",
  },
  {
    id: "prisma-client",
    area: "PRISMA",
    label: "Prisma Client",
    meaning: "The app cannot talk to the database without a generated client.",
    ready: "Prisma Client has been generated.",
    blocked: "Prisma Client has not been generated.",
    recovery:
      "Run Prepare Local Environment or apply the local database schema.",
    status: "unknown",
  },
];

export const PROJECTS: ProjectRecord[] = [
  {
    id: "golden-path",
    name: "Golden Path",
    kind: "Active product",
    purpose:
      "A readiness table that shows Database → Typed API → Web → Ready, then saves one example.",
    owner:
      "Chief owns the product outcome. The capsule owns only projects/internal/golden-path.",
    boundary:
      "Not a product brand, not a production deploy, not a sign-in system, and not a place for production credentials.",
    state: "Active as the only real product capsule.",
    packages: [
      "@safrs/web",
      "@safrs/api",
      "@safrs/database",
      "@safrs/ui",
      "@sentra/token",
    ],
    commands: [
      "pnpm --filter @safrs/web test",
      "pnpm --filter @safrs/web typecheck",
      "pnpm --filter @safrs/web build",
    ],
    docs: [
      "projects/internal/golden-path/README.md",
      "projects/internal/golden-path/docs/architecture.md",
    ],
    capabilities: [
      "email is recorded as R2; recording is not proof of a live runtime install",
      "stripe is recorded as R2; recording is not proof of a live runtime install",
    ],
    notes:
      "Next.js mounts the typed Hono API at /api. Local Postgres uses Compose. Reset is rejected if the URL is not disposable.",
  },
  {
    id: "template",
    name: "Capsule Template",
    kind: "Governance scaffold",
    purpose: "A starting point for a new project capsule. Not a product.",
    owner: "Repository governance.",
    boundary:
      "Copy the template, replace every placeholder, then register the sensitive paths.",
    state: "Not active as a product.",
    packages: [],
    commands: [],
    docs: ["projects/README.md", "docs/governance/safrs_project_capsules.md"],
    capabilities: [],
    notes: "This template is scaffolding, not a product implementation.",
  },
];

export const PACKAGES: PackageRecord[] = [
  {
    id: "api",
    name: "@safrs/api",
    purpose: "Typed Hono API mounted by the web app at /api.",
    consumers: "Golden Path",
    risk: "Shared-package changes are R2 because they can affect more than one capsule.",
  },
  {
    id: "database",
    name: "@safrs/database",
    purpose:
      "Local PostgreSQL access, migrations, seed, Studio, and the reset guard.",
    consumers: "Golden Path and the doctor tool",
    risk: "Reset is only for a disposable database.",
  },
  {
    id: "ui",
    name: "@safrs/ui",
    purpose:
      "Shared interface components. Currently only StatusCard: Ready or Needs attention.",
    consumers: "Golden Path",
    risk: "Do not add a second design system.",
  },
  {
    id: "token",
    name: "@sentra/token",
    purpose: "The only place raw Sentra color values may appear.",
    consumers: "All Sentra interfaces",
    risk: "Components may use semantic tokens only.",
  },
  {
    id: "env",
    name: "@safrs/env",
    purpose: "Separates client and server environment values.",
    consumers: "Golden Path",
    risk: "DATABASE_URL remains server-only.",
  },
  {
    id: "schemas",
    name: "@safrs/schemas",
    purpose: "Shared data contracts.",
    consumers: "API and web",
    risk: "Contract changes propagate to more than one package.",
  },
  {
    id: "telemetry",
    name: "@safrs/telemetry",
    purpose: "Package observability traces.",
    consumers: "API, database, web",
    risk: "Telemetry must not carry secrets.",
  },
  {
    id: "config",
    name: "@safrs/config",
    purpose: "Shared TypeScript configuration.",
    consumers: "Packages and applications",
    risk: "Not a product surface.",
  },
];

export const AGENTS: AgentRecord[] = [
  {
    id: "observer",
    name: "Observer",
    kind: "role",
    purpose: "Read and search without changing anything.",
    may: "Read and search.",
    mayNot: "Plan, change, review for release, or deploy.",
    risk: "R0",
  },
  {
    id: "analyst",
    name: "Analyst",
    kind: "role",
    purpose: "Read and plan without changing the repository.",
    may: "Read, search, and plan.",
    mayNot: "Change code, merge, or deploy.",
    risk: "R0 through planning. Mutation remains outside this role.",
  },
  {
    id: "implementer",
    name: "Implementer",
    kind: "role",
    purpose: "Change the assigned scope, test, and open a pull request.",
    may: "Make limited changes, test, create a branch, and open a pull request.",
    mayNot: "Merge or deploy.",
    risk: "R1 by default. Rises to R2 if a sensitive path is touched.",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    kind: "role",
    purpose:
      "Review independently. Must not be the only approver of their own work.",
    may: "Read, review, and test.",
    mayNot: "Be the only approver of a change they wrote themselves.",
    risk: "R2 requires independent review or a code owner.",
  },
  {
    id: "maintainer",
    name: "Maintainer",
    kind: "role",
    purpose: "Manage scope and merge when policy allows.",
    may: "Make limited changes, test, open a pull request, and merge when policy allows.",
    mayNot: "Deploy production or weaken a gate so a task can pass.",
    risk: "Merges still follow policy, not convenience.",
  },
  {
    id: "release-agent",
    name: "Release Agent",
    kind: "role",
    purpose: "Prepare release artifacts, not execute production.",
    may: "Prepare a release, test, and open a pull request.",
    mayNot: "Run a production deploy.",
    risk: "R3 remains prepare-only until a human authorizes it.",
  },
  {
    id: "security-agent",
    name: "Security Agent",
    kind: "role",
    purpose: "Analyze security and remediate within a limited scope.",
    may: "Analyze security, remediate within limits, test, and open a pull request.",
    mayNot: "Deploy or ignore a security control.",
    risk: "Security changes and verification rise to R2.",
  },
  {
    id: "coding-agent",
    name: "Coding agent",
    kind: "automation",
    purpose:
      "A machine identity that may change contracted scope and open one pull request.",
    may: "Read, write within contracted scope, create a branch, open and update one pull request, and request review.",
    mayNot:
      "Merge, enable auto-merge, approve review, bypass branch rules, release, run R3, or read production credentials.",
    risk: "Tool capability is not authority.",
  },
  {
    id: "publisher",
    name: "Publisher",
    kind: "automation",
    purpose: "Ask GitHub to enable auto-merge for one already verified head.",
    may: "Enable auto-merge for one exact head that has already passed.",
    mayNot:
      "Push source, approve review, bypass branch rules, release, or run R3.",
    risk: "Evaluation only at present. Main-branch protection is not yet proof of Controlled.",
  },
];

export const TASK_STATES: TaskStateRecord[] = [
  {
    id: "PROPOSED",
    meaning: "A proposal that has not been claimed.",
    mutation: false,
  },
  {
    id: "CLAIMED",
    meaning: "Owned and allowed to begin changing.",
    mutation: true,
  },
  {
    id: "PLANNED",
    meaning: "The plan is recorded. Work has not started.",
    mutation: true,
  },
  { id: "EXECUTING", meaning: "Changes are in progress.", mutation: true },
  { id: "VERIFYING", meaning: "Checks are being run.", mutation: true },
  {
    id: "REVIEW",
    meaning: "Waiting for the required review or approval.",
    mutation: true,
  },
  {
    id: "MERGED",
    meaning: "The change is in. It is not necessarily closed.",
    mutation: false,
  },
  {
    id: "CLOSED",
    meaning: "The task is finished and closed.",
    mutation: false,
  },
  {
    id: "BLOCKED",
    meaning: "Cannot continue until the blocker is resolved.",
    mutation: true,
  },
  {
    id: "CONFLICT",
    meaning: "A scope or ownership collision.",
    mutation: true,
  },
  {
    id: "FAILED",
    meaning: "The attempt failed and needs a decision.",
    mutation: false,
  },
  { id: "ABORTED", meaning: "Stopped before completion.", mutation: false },
  { id: "SUPERSEDED", meaning: "Replaced by another task.", mutation: false },
];

export const KNOWLEDGE: KnowledgeRecord[] = [
  {
    id: "spec",
    title: "SAFRS Specification",
    kind: "normative",
    path: "SAFRS_SPEC.md",
    purpose: "The official rule. It wins if another document conflicts.",
  },
  {
    id: "agents",
    title: "Agent router",
    kind: "canonical",
    path: "AGENTS.md",
    purpose: "The read order and the rules that are not negotiable.",
  },
  {
    id: "read-first",
    title: "Read first",
    kind: "canonical",
    path: ".agents/knowledge/00_READ_FIRST.md",
    purpose: "Agent collaboration principles before substantial work.",
  },
  {
    id: "conformance",
    title: "Conformance levels",
    kind: "canonical",
    path: "docs/governance/safrs_conformance.md",
    purpose:
      "The repository declares SAFRS Core. Controlled, Secure, and Regulated are not claimed.",
  },
  {
    id: "permissions",
    title: "Agent permission framework",
    kind: "canonical",
    path: "docs/governance/SAFRS_AGENT_PERMISSIONS.md",
    purpose:
      "Effective authority is the intersection of identity, role, scope, environment, policy, and risk.",
  },
  {
    id: "approvals",
    title: "Approval rules",
    kind: "canonical",
    path: "docs/governance/SAFRS_APPROVALS.md",
    purpose: "Approval is bound to exact content, not a standing permission.",
  },
  {
    id: "control-matrix",
    title: "Control matrix",
    kind: "canonical",
    path: "docs/governance/SAFRS_CONTROL_MATRIX.md",
    purpose:
      "Required controls for R0 through R3 and the eight publication gates.",
  },
  {
    id: "evidence",
    title: "Evidence rules",
    kind: "canonical",
    path: "docs/governance/SAFRS_EVIDENCE.md",
    purpose:
      "Evidence must be reconstructable and already redacted before it is written.",
  },
  {
    id: "readme",
    title: "Repository summary",
    kind: "explanatory",
    path: "README.md",
    purpose:
      "An explanatory entry point. Not a substitute for the specification.",
  },
  {
    id: "golden-path",
    title: "Golden Path documentation",
    kind: "reference",
    path: "projects/internal/golden-path/README.md",
    purpose: "How to use the only real product capsule.",
  },
];

export const RISK_COPY: Record<
  RiskTier,
  { title: string; meaning: string; mutation: string; approval: string }
> = {
  R0: {
    title: "R0 · Read",
    meaning: "Observe without changing.",
    mutation: "No mutation.",
    approval: "Human approval is not required.",
  },
  R1: {
    title: "R1 · Local",
    meaning: "May change assigned local scope.",
    mutation: "Mutation is allowed on one's own branch or worktree.",
    approval: "Human review is not required by default.",
  },
  R2: {
    title: "R2 · Review",
    meaning: "The change has a wider effect or touches a sensitive path.",
    mutation:
      "Mutation is allowed, but publication requires independent review or a code owner.",
    approval: "Approval is bound to exact content.",
  },
  R3: {
    title: "R3 · Authorization",
    meaning: "Real consequences beyond an ordinary code change.",
    mutation: "Agents may only prepare. Execution waits for a human.",
    approval: "An authorized human must approve the exact operation proposed.",
  },
};

export const NEXT_ACTIONS: NextAction[] = [
  {
    id: "start-doctor",
    title: "Check local machine readiness",
    reason:
      "This board cannot see Node, Docker, or the database. Readiness is the first safe step.",
    actionId: "doctor",
  },
  {
    id: "start-status",
    title: "Review governance status",
    reason:
      "Pending approvals and active tasks are not observed here. Governance status is the honest way to see them.",
    actionId: "status",
  },
  {
    id: "start-dev",
    title: "Start the Golden Path locally",
    reason: "The only real product is Golden Path. Production remains blocked.",
    actionId: "dev",
  },
];

export const UNUSED_PACKS = ["ai", "electron", "python", "wxt"] as const;

export const SAFETY_LABEL: Record<SafetyClass, string> = {
  safe: "Safe",
  caution: "Caution",
  approval: "Approval required",
  destructive: "Destructive",
};

export const STATUS_LABEL = {
  unavailable: "Unavailable here",
  available: "Available here",
  unknown: "Not observed here",
  pass: "Ready",
  attention: "Needs attention",
  fail: "Blocked",
} as const;
