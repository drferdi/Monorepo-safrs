/** Shared vocabulary for the Control Center feature registry. */

/** SAFRS risk tiers, as defined in `.safrs/policy.json`. */
export type RiskTier = "R0" | "R1" | "R2" | "R3";

/**
 * How honestly a feature is wired into this dashboard.
 *
 * The value is *computed* from evidence on disk, never authored by hand. A
 * catalog entry declares what would prove it exists; the registry checks.
 */
export type ConnectionStatus =
  | "connected"
  | "partially-connected"
  | "not-yet-connected"
  | "requires-configuration"
  | "requires-human-action"
  | "error";

/** Where the implementing code actually lives. */
export type Availability =
  | "on-main"
  | "branch-only"
  | "designed-only"
  | "missing";

/** Broad grouping used by the dashboard navigation. */
export type FeatureArea =
  | "governance"
  | "tooling"
  | "packages"
  | "apps"
  | "knowledge"
  | "quality"
  | "automation"
  | "data";

/** Consequence class shown before a user runs anything. */
export type SafetyClass = "safe" | "caution" | "approval" | "destructive";

/**
 * One piece of proof that a feature exists: a repository path the registry
 * verifies at read time.
 */
export type Evidence = {
  /** Repository-relative path. */
  path: string;
  /** What this path proves, in plain language for a non-coding operator. */
  proves: string;
  /** Set by the registry, not by the catalog author. */
  present?: boolean;
};

/** A capability the repository owns, as declared by the catalog. */
export type FeatureDefinition = {
  id: string;
  /** Indonesian, user-facing. */
  name: string;
  area: FeatureArea;
  /** Indonesian: what this is for. */
  purpose: string;
  /** Indonesian: why dr. Ferdi should care. */
  userValue: string;
  /** Indonesian: when to reach for it. */
  whenToUse: string;
  /** Command or route that starts it, if any. */
  entryPoint: string | null;
  /** Paths that prove the feature exists. */
  evidence: Evidence[];
  /** Branch carrying the code when it is not on `main`. */
  branch?: string;
  /** Risk tier for changing the feature. */
  risk: RiskTier;
  /** Ids of actions the dashboard can offer for this feature. */
  actionIds: string[];
  /** Documentation paths a reader can open. */
  docs: string[];
  /**
   * Honest note about what is *not* true yet. Rendered verbatim; this is where
   * a limitation gets stated instead of being hidden.
   */
  caveat?: string;
};

/**
 * Evidence after the registry has looked for it.
 *
 * Spelled out rather than `Required<Evidence>`: under exactOptionalPropertyTypes
 * that utility strips the `?` but leaves `| undefined` in the value type, which
 * is exactly the uncertainty this type exists to remove.
 */
export type CheckedEvidence = {
  path: string;
  proves: string;
  present: boolean;
};

/**
 * A feature after the registry has checked it against the filesystem.
 *
 * `evidence` is omitted before being redeclared: intersecting the two shapes
 * would leave `present` as `boolean | undefined` instead of replacing it.
 */
export type ResolvedFeature = Omit<FeatureDefinition, "evidence"> & {
  evidence: CheckedEvidence[];
  availability: Availability;
  status: ConnectionStatus;
  /** Indonesian explanation of why the status is what it is. */
  statusReason: string;
  /** Fraction of declared evidence that was found, 0–1. */
  evidenceRatio: number;
};

/** Result of reading the whole repository. */
export type RegistrySnapshot = {
  /** ISO timestamp of the read. */
  readAt: string;
  repoRoot: string;
  git: GitSnapshot;
  features: ResolvedFeature[];
  counts: Record<ConnectionStatus, number>;
  /** Problems encountered while reading, surfaced rather than swallowed. */
  problems: string[];
};

export type GitSnapshot = {
  branch: string;
  head: string;
  /** Number of changed paths in the working tree. */
  dirtyPaths: number;
  /** Local branches that carry commits `main` does not have. */
  unmergedBranches: UnmergedBranch[];
  available: boolean;
};

export type UnmergedBranch = {
  name: string;
  commitsAhead: number;
};
