import type { LiveSnapshot } from "../lib/control-center.ts";
import { readRoles } from "../lib/repo/agents.ts";
import { readControlPlane } from "../lib/repo/control-plane.ts";
import { readGates } from "../lib/repo/gates.ts";
import { readActivity } from "../lib/repo/git.ts";
import { readHealth } from "../lib/repo/health.ts";
import { readDocumentRegistry } from "../lib/repo/knowledge.ts";
import { readLibrary } from "../lib/repo/library.ts";
import { readRegistry } from "../lib/repo/registry.ts";
import { readWorkspace } from "../lib/repo/workspace.ts";
import { ControlCenter } from "./control-center.tsx";

/**
 * Server boundary. The board itself stays a client component; it owns the
 * navigation state, so the repository reading happens here and is handed down
 * as a plain snapshot.
 *
 * No caching: a cached page could report a repository state that no longer
 * exists, which is the one thing this board must never do.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  const [
    snapshot,
    workspace,
    activity,
    health,
    library,
    plane,
    gates,
    roles,
    knowledge,
  ] = await Promise.all([
    readRegistry(),
    readWorkspace(),
    readActivity(),
    readHealth(),
    readLibrary(),
    readControlPlane(),
    readGates(),
    readRoles(),
    readDocumentRegistry(),
  ]);

  const live: LiveSnapshot = {
    readAt: snapshot.readAt,
    repoRoot: snapshot.repoRoot,
    branch: snapshot.git.branch,
    head: snapshot.git.head,
    dirtyPaths: snapshot.git.dirtyPaths,
    gitAvailable: snapshot.git.available,
    unmergedBranches: snapshot.git.unmergedBranches,
    counts: snapshot.counts,
    problems: snapshot.problems,
    library,
    plane,
    gates,
    knowledge,
    roles,
    health: {
      available: health.available,
      ok: health.ok,
      exitCode: health.exitCode,
      problem: health.problem,
      checks: health.checks,
    },
    activity: {
      available: activity.available,
      lastMonth: activity.lastMonth,
      contributors: activity.contributors,
      hotPaths: activity.hotPaths,
      recent: activity.recent.map((commit) => ({
        hash: commit.hash,
        subject: commit.subject,
        author: commit.author,
        relative: commit.relative,
        isMerge: commit.isMerge,
      })),
    },
    workspace: {
      groups: workspace.groups,
      problems: workspace.problems,
      members: workspace.members.map((member) => ({
        name: member.name,
        path: member.path,
        group: member.group,
        version: member.version,
        dependsOn: member.dependsOn,
        usedBy: member.usedBy,
        blastRadius: member.blastRadius,
      })),
    },
    features: snapshot.features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      area: feature.area,
      purpose: feature.purpose,
      userValue: feature.userValue,
      whenToUse: feature.whenToUse,
      entryPoint: feature.entryPoint,
      risk: feature.risk,
      status: feature.status,
      statusReason: feature.statusReason,
      caveat: feature.caveat,
      branch: feature.branch,
      evidence: feature.evidence.map((item) => ({
        path: item.path,
        proves: item.proves,
        present: item.present,
      })),
    })),
  };

  return <ControlCenter live={live} />;
}
