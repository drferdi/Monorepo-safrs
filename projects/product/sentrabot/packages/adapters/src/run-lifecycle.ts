import { runContinueJob } from "@sentrabot/adapter-kit";
import { runLog } from "@sentrabot/core";
import type { ExecutorDeps } from "./executor.js";
import type { TakeoverResumeCheckpoint } from "./takeover-resume.js";

export async function renewRunLease(
  deps: ExecutorDeps,
  runId: string,
  workerId: string,
  fence: number,
): Promise<boolean> {
  const renewed = await deps.prisma.run.updateMany({
    where: { id: runId, status: "running", leaseOwner: workerId, leaseFence: fence },
    data: { leaseExpiresAt: new Date(Date.now() + 5 * 60_000) },
  });
  if (renewed.count !== 1) {
    runLog("run.lease.lost", { runId, workerId, fence }, "warn");
  }
  return renewed.count === 1;
}

export function computerRetryDelay(fence: number): number {
  return Math.min(10_000, 250 * 2 ** Math.min(Math.max(fence - 1, 0), 5));
}

export function computerRunRequeueData(
  resumeCheckpoint: TakeoverResumeCheckpoint | null,
  error: string | null = null,
) {
  return {
    status: "queued" as const,
    error,
    leaseOwner: null,
    leaseExpiresAt: null,
    checkpoint: resumeCheckpoint,
  };
}

export async function requeueComputerRun(
  deps: ExecutorDeps,
  runId: string,
  workerId: string,
  fence: number,
  resumeCheckpoint: TakeoverResumeCheckpoint | null,
): Promise<void> {
  const released = await deps.prisma.run.updateMany({
    where: { id: runId, status: "running", leaseOwner: workerId, leaseFence: fence },
    data: computerRunRequeueData(resumeCheckpoint),
  });
  if (released.count !== 1) return;
  await deps.jobs.enqueue({
    ...runContinueJob(runId),
    availableAt: new Date(Date.now() + computerRetryDelay(fence)),
  });
}
