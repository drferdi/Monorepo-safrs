import type { Actor } from "@sentrabot/contracts";
import type { PrismaClient } from "./client.js";

export class IsolationError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "IsolationError";
  }
}

export async function requireMembership(prisma: PrismaClient, userId: string): Promise<Actor> {
  const member = await prisma.member.findFirst({
    where: { userId },
    include: { user: true, organization: true },
  });
  if (!member) {
    throw new IsolationError("No personal workspace");
  }
  const settings = await prisma.deploymentSettings.findUnique({
    where: { id: "default" },
  });
  return {
    userId: member.userId,
    workspaceId: member.organizationId,
    email: member.user.email,
    isDeploymentOwner: settings?.ownerUserId === member.userId,
  };
}

export function scoped<T extends { workspaceId: string; userId?: string }>(
  actor: Actor,
  record: T | null,
): T {
  if (!record || record.workspaceId !== actor.workspaceId) {
    throw new IsolationError();
  }
  if (record.userId && record.userId !== actor.userId) {
    throw new IsolationError();
  }
  return record;
}
