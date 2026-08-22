export type NavId =
  | "home"
  | "projects"
  | "agents"
  | "tasks"
  | "health"
  | "activity"
  | "governance"
  | "knowledge";

export type RiskTier = "R0" | "R1" | "R2" | "R3";
export type SafetyClass = "safe" | "caution" | "approval" | "destructive";
/**
 * Both statuses used to be locked to a single literal because this board ran as
 * a Cloudflare Worker: no filesystem, no child processes, so nothing could ever
 * be observed or executed. Running inside the repository on the Node runtime
 * removes that limit, so the unions now carry states a real reading produces.
 */
export type ActionStatus = "unavailable" | "available";
export type ObservationStatus = "unknown" | "pass" | "attention" | "fail";

export type NavItem = {
  id: NavId;
  seq: string;
  label: string;
  hint: string;
};

export type ControlAction = {
  id: string;
  name: string;
  purpose: string;
  why: string;
  effect: string;
  expected: string;
  next: string;
  command: string;
  source: string;
  category:
    | "system"
    | "projects"
    | "agents"
    | "tasks"
    | "development"
    | "testing"
    | "quality"
    | "security"
    | "governance"
    | "database"
    | "telemetry"
    | "knowledge"
    | "deployment"
    | "maintenance";
  risk: RiskTier;
  safety: SafetyClass;
  mutation: boolean;
  approval: string;
  timeout: string;
  confirmation: string;
};

export type DoctorCheck = {
  id: string;
  area: string;
  label: string;
  meaning: string;
  ready: string;
  blocked: string;
  recovery: string;
  status: ObservationStatus;
};

export type ProjectRecord = {
  id: string;
  name: string;
  kind: string;
  purpose: string;
  owner: string;
  boundary: string;
  state: string;
  packages: string[];
  commands: string[];
  docs: string[];
  capabilities: string[];
  notes: string;
};

export type PackageRecord = {
  id: string;
  name: string;
  purpose: string;
  consumers: string;
  risk: string;
};

export type AgentRecord = {
  id: string;
  name: string;
  kind: "role" | "automation";
  purpose: string;
  may: string;
  mayNot: string;
  risk: string;
};

export type TaskStateRecord = {
  id: string;
  meaning: string;
  mutation: boolean;
};

export type KnowledgeRecord = {
  id: string;
  title: string;
  kind: "normative" | "canonical" | "explanatory" | "reference";
  path: string;
  purpose: string;
};

export type NextAction = {
  id: string;
  title: string;
  reason: string;
  actionId: string;
};

export const SITE = {
  title: "Sentra Developer Control Center",
  product: "Control Center",
  path: "Monorepo-safrs / Control Center",
  promise:
    "Turn Monorepo-safrs complexity into plain-language decisions, with authority kept visible.",
  honesty:
    "Papan ini membaca repository langsung pada setiap permintaan. Status fitur diderivasi dari bukti di disk dan git — tidak pernah ditulis tangan. Perintah dalam daftar izin dapat dijalankan dari papan ini dengan konfirmasi; di luar daftar itu tidak ada yang dieksekusi.",
  repo: "https://github.com/drferdii/Monorepo-safrs",
  declaration: "SAFRS Core",
  operatingModel: "Human-Governed · Agent-Executed · Machine-Enforced",
  observedAt: "Read live from the repository working tree.",
} as const;

/**
 * The live reading handed from the server component to the board. Everything in
 * here comes from `lib/repo/registry.ts`; the board renders it and adds nothing.
 */
export type LiveSnapshot = {
  readAt: string;
  repoRoot: string;
  branch: string;
  head: string;
  dirtyPaths: number;
  gitAvailable: boolean;
  unmergedBranches: { name: string; commitsAhead: number }[];
  features: LiveFeature[];
  counts: Record<string, number>;
  problems: string[];
  workspace: LiveWorkspace;
  activity: LiveActivity;
  health: LiveHealth;
  library: LiveLibrary;
  plane: LivePlane;
  gates: {
    available: boolean;
    gates: {
      check_id: string;
      verdict: string;
      reason: string;
      checked: number | null;
      errors: string[];
    }[];
    problem: string | null;
  };
  roles: { available: boolean; roles: Record<string, string[]> };
  knowledge: {
    available: boolean;
    documents: {
      id: string;
      path: string;
      type: string;
      status: string;
      normativity: string;
      read_order?: number | undefined;
      scope: string;
    }[];
  };
};

/** SAFRS control plane, read through `tools/status --json`. */
export type LivePlane = {
  available: boolean;
  status: string;
  observedAt: string | null;
  tasks: {
    id: string;
    title: string;
    state: string;
    risk: string;
    owner_label?: string;
    worktree_id?: string;
    updated_at?: string;
  }[];
  activeTasks: { id: string; state: string }[];
  ownershipOk: boolean;
  conflicts: string[];
  governance: string | null;
  failedChecks: string[];
  leases: { task_id: string; events: number; chain_valid: boolean }[];
  nextAction: string | null;
  warnings: string[];
  problem: string | null;
};

/** Medical library figures, read from the corpus data root. */
export type LiveLibrary = {
  available: boolean;
  sourcePdfs: number | null;
  canonicalDocuments: number | null;
  manifestEntries: number;
  parsed: number;
  failed: number;
  readyToUse: number | null;
  readyUnknownReason: string | null;
  unrecorded: number | null;
  notYetParsed: number | null;
  failures: { docId: string; error: string }[];
  problems: string[];
};

/** Machine readiness, produced by `tools/doctor --json`. */
export type LiveHealth = {
  available: boolean;
  ok: boolean;
  exitCode: number;
  checks: {
    id: string;
    area: string;
    ok: boolean;
    severity: string;
    summary: string;
    recovery: string;
    technical: string;
  }[];
  problem: string | null;
};

/** Change flow: what has been happening in this repository lately. */
export type LiveActivity = {
  available: boolean;
  recent: {
    hash: string;
    subject: string;
    author: string;
    relative: string;
    isMerge: boolean;
  }[];
  /** Commits on the current branch in the last 30 days. */
  lastMonth: number;
  contributors: { name: string; commits: number }[];
  /** Files touched most often in the last 30 days. */
  hotPaths: { path: string; changes: number }[];
};

/** The repository map: what it is made of, and what depends on what. */
export type LiveWorkspace = {
  members: LiveMember[];
  groups: { group: string; count: number }[];
  problems: string[];
};

export type LiveMember = {
  name: string;
  path: string;
  group: string;
  version: string;
  dependsOn: string[];
  usedBy: string[];
  /** Every workspace member affected transitively by changing this one. */
  blastRadius: string[];
};

export type LiveFeature = {
  id: string;
  name: string;
  area: string;
  purpose: string;
  userValue: string;
  whenToUse: string;
  entryPoint: string | null;
  risk: RiskTier;
  status: string;
  statusReason: string;
  // `| undefined` is explicit because the repository compiles with
  // exactOptionalPropertyTypes: an absent caveat and a caveat set to undefined
  // are different types without it.
  caveat?: string | undefined;
  branch?: string | undefined;
  evidence: { path: string; proves: string; present: boolean }[];
};

export const NAV: NavItem[] = [
  {
    id: "home",
    seq: "01",
    label: "Command Center",
    hint: "Overview, risk, and next steps",
  },
  {
    id: "projects",
    seq: "02",
    label: "Projects",
    hint: "Product capsules and shared packages",
  },
  {
    id: "agents",
    seq: "03",
    label: "Agents",
    hint: "Roles, automation identities, and authority limits",
  },
  {
    id: "tasks",
    seq: "04",
    label: "Tasks",
    hint: "Repository-supported workflows",
  },
  {
    id: "health",
    seq: "05",
    label: "Health",
    hint: "Environment readiness checks",
  },
  {
    id: "activity",
    seq: "06",
    label: "Activity",
    hint: "Task traces, gates, and evidence",
  },
  {
    id: "governance",
    seq: "07",
    label: "Governance",
    hint: "R0 through R3 and human approval",
  },
  {
    id: "knowledge",
    seq: "08",
    label: "Knowledge",
    hint: "Official documents and operating guidance",
  },
];
