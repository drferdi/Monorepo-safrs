import { ORPCError } from "@orpc/server";
import { phoneDeliverJob } from "@sentrabot/adapter-kit";
import type { PrismaClient } from "@sentrabot/db";
import type { Authed } from "../authed.js";
import type { RouterDeps } from "../router.js";
import { beginWhatsAppPairing, whatsAppPairingStatus } from "../whatsapp-pairing.js";

export function createPhoneRoutes(deps: RouterDeps, authed: Authed) {
  return {
    status: authed.phone.status.handler(async ({ context }) => {
      const identity = await deps.prisma.phoneIdentity.findFirst({
        where: { userId: context.actor.userId },
      });
      return {
        enabled: deps.phone?.enabled ?? false,
        linked: Boolean(identity),
        phoneE164: identity?.phoneE164 ?? null,
        botId: identity?.botId ?? null,
      };
    }),
    whatsapp: {
      status: authed.phone.whatsapp.status.handler(async ({ context }) => {
        const status = await whatsAppPairingStatus(deps.prisma, context.actor);
        return {
          enabled: deps.whatsapp?.enabled ?? false,
          linked: status.linked,
          phoneE164: status.phoneE164,
          botId: status.botId,
          businessPhoneE164: deps.whatsapp?.businessPhoneE164 ?? null,
        };
      }),
      beginPairing: authed.phone.whatsapp.beginPairing.handler(async ({ context, input }) => {
        if (!deps.whatsapp?.enabled || !deps.whatsapp.businessPhoneE164) {
          throw new ORPCError("BAD_REQUEST", {
            message: "WhatsApp is not configured on this deployment.",
          });
        }
        const pairing = await beginWhatsAppPairing(deps.prisma, context.actor, input.botId);
        const waNumber = deps.whatsapp.businessPhoneE164.replace(/[^\d]/g, "");
        const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(`PAIR-${pairing.code}`)}`;
        return { code: pairing.code, waLink, expiresAt: pairing.expiresAt.toISOString() };
      }),
    },
    channels: {
      list: authed.phone.channels.list.handler(async ({ context }) => {
        const identity = await phoneIdentityFor(deps.prisma, context.actor.userId);
        if (!identity) return [];
        const memberships = await deps.prisma.phoneChannelMember.findMany({
          where: { identityId: identity.id },
          include: { channel: { include: { members: ACTIVE_CHANNEL_MEMBERS } } },
          orderBy: { updatedAt: "desc" },
        });
        return memberships.map((membership) => phoneChannelDto(membership));
      }),
      respond: authed.phone.channels.respond.handler(async ({ context, input }) => {
        const identity = await phoneIdentityFor(deps.prisma, context.actor.userId);
        const membership = identity
          ? await deps.prisma.phoneChannelMember.findFirst({
              where: { channelId: input.channelId, identityId: identity.id },
              include: { channel: { include: { members: ACTIVE_CHANNEL_MEMBERS } } },
            })
          : null;
        if (membership?.status !== "invited") {
          throw new ORPCError("NOT_FOUND");
        }
        const { count } = await deps.prisma.phoneChannelMember.updateMany({
          where: { id: membership.id, status: "invited" },
          data: { status: input.accept ? "approved" : "declined" },
        });
        if (count === 0) {
          // Lost a race with leave/sweep: approval must not resurrect a
          // departed member.
          throw new ORPCError("NOT_FOUND");
        }
        const updated = await deps.prisma.phoneChannelMember.findUniqueOrThrow({
          where: { id: membership.id },
          include: { channel: { include: { members: ACTIVE_CHANNEL_MEMBERS } } },
        });
        return phoneChannelDto(updated);
      }),
      leave: authed.phone.channels.leave.handler(async ({ context, input }) => {
        const identity = await phoneIdentityFor(deps.prisma, context.actor.userId);
        const membership = identity
          ? await deps.prisma.phoneChannelMember.findFirst({
              where: { channelId: input.channelId, identityId: identity.id },
            })
          : null;
        if (!membership) throw new ORPCError("NOT_FOUND");
        await deps.prisma.phoneChannelMember.update({
          where: { id: membership.id },
          data: { status: "left" },
        });
        return { ok: true as const };
      }),
    },
    connections: {
      list: authed.phone.connections.list.handler(async ({ context }) => {
        const identity = await phoneIdentityFor(deps.prisma, context.actor.userId);
        if (!identity) return [];
        const connections = await deps.prisma.agentConnection.findMany({
          where: {
            OR: [{ requesterBotId: identity.botId }, { targetBotId: identity.botId }],
          },
          orderBy: { updatedAt: "desc" },
        });
        return Promise.all(
          connections.map((connection) => phoneConnectionDto(deps.prisma, identity, connection)),
        );
      }),
      respond: authed.phone.connections.respond.handler(async ({ context, input }) => {
        const identity = await phoneIdentityFor(deps.prisma, context.actor.userId);
        const connection = identity
          ? await deps.prisma.agentConnection.findFirst({
              where: { id: input.connectionId, targetBotId: identity.botId, status: "pending" },
            })
          : null;
        if (!identity || !connection) throw new ORPCError("NOT_FOUND");
        const { updated, notifyRequester } = await deps.prisma.$transaction(async (tx) => {
          // The claim holds the connection row lock through commit, so a
          // revoke either beats it or waits — it can never interleave with
          // the confirmation write below.
          const { count } = await tx.agentConnection.updateMany({
            where: { id: connection.id, status: "pending" },
            data: { status: input.accept ? "approved" : "declined" },
          });
          if (count === 0) {
            // Lost a race with revoke: approval must never overwrite it.
            throw new ORPCError("NOT_FOUND");
          }
          const row = await tx.agentConnection.findUniqueOrThrow({
            where: { id: connection.id },
          });
          if (!input.accept) return { updated: row, notifyRequester: false };
          // Parity with the text-command path: the requester hears about it.
          const requesterIdentity = await tx.phoneIdentity.findUnique({
            where: { botId: connection.requesterBotId },
          });
          if (!requesterIdentity) return { updated: row, notifyRequester: false };
          const key = `command:connected:${connection.id}`;
          // A re-approved pair starts a fresh cycle; clear the stale row or
          // skipDuplicates would swallow the new confirmation.
          await tx.phoneOutbound.deleteMany({ where: { idempotencyKey: key } });
          await tx.phoneOutbound.createMany({
            data: [
              {
                idempotencyKey: key,
                kind: "dm",
                toNumber: requesterIdentity.phoneE164,
                body: "Your connection request was accepted — your agents can now message each other.",
              },
            ],
            skipDuplicates: true,
          });
          return { updated: row, notifyRequester: true };
        });
        if (notifyRequester) {
          await deps.jobs.enqueue(phoneDeliverJob()).catch((error) => {
            console.error("phone connection confirmation enqueue error", error);
          });
        }
        return phoneConnectionDto(deps.prisma, identity, updated);
      }),
      revoke: authed.phone.connections.revoke.handler(async ({ context, input }) => {
        const identity = await phoneIdentityFor(deps.prisma, context.actor.userId);
        const connection = identity
          ? await deps.prisma.agentConnection.findFirst({
              where: {
                id: input.connectionId,
                OR: [{ requesterBotId: identity.botId }, { targetBotId: identity.botId }],
              },
            })
          : null;
        if (!connection) throw new ORPCError("NOT_FOUND");
        // Claim + invite cancel in one transaction. The status update holds
        // the connection row lock through commit, so a concurrent reconnect
        // (FOR UPDATE) waits until both the revoke and the invite delete
        // finish — otherwise it could reopen and create a fresh invite that
        // a post-commit deleteMany would then wipe while leaving the row
        // pending with no approval prompt.
        await deps.prisma.$transaction(async (tx) => {
          const { count } = await tx.agentConnection.updateMany({
            where: { id: connection.id, status: connection.status },
            data: { status: "revoked" },
          });
          if (count === 0) throw new ORPCError("NOT_FOUND");
          // Cancel undelivered invites, including rows the drain already
          // claimed (status sent, no providerHandle yet). Connect-invite
          // delivery holds this connection row FOR UPDATE through
          // sendDirect, so revoke either waits until the DM is sent or
          // deletes the claim before send starts.
          await tx.phoneOutbound.deleteMany({
            where: {
              idempotencyKey: `connect:${connection.requesterBotId}:${connection.targetBotId}`,
              OR: [{ status: "pending" }, { status: "sent", providerHandle: null }],
            },
          });
        });
        return { ok: true as const };
      }),
    },
  };
}

const ACTIVE_CHANNEL_MEMBERS = {
  where: { status: { in: ["invited", "approved"] } },
  select: { id: true },
};

type PhoneIdentityRecord = {
  id: string;
  botId: string;
};

async function phoneIdentityFor(
  prisma: PrismaClient,
  userId: string,
): Promise<PhoneIdentityRecord | null> {
  return prisma.phoneIdentity.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, botId: true },
  });
}

function phoneChannelDto(membership: {
  channelId: string;
  status: string;
  channel: { name: string | null; members: Array<{ id: string }> };
}) {
  return {
    channelId: membership.channelId,
    name: membership.channel.name,
    status: membership.status as "invited" | "approved" | "declined" | "left",
    memberCount: membership.channel.members.length,
  };
}

async function phoneConnectionDto(
  prisma: PrismaClient,
  identity: PhoneIdentityRecord,
  connection: {
    id: string;
    requesterBotId: string;
    targetBotId: string;
    status: string;
  },
) {
  const incoming = connection.targetBotId === identity.botId;
  // The target's identity stays opaque until they approve (mirrors connect_agent).
  if (!incoming && connection.status !== "approved") {
    return {
      id: connection.id,
      peerBotName: "agent",
      peerOwnerLabel: "owner",
      status: connection.status as "pending" | "approved" | "declined" | "revoked",
      incoming,
    };
  }
  const peerBotId = incoming ? connection.requesterBotId : connection.targetBotId;
  const peerBot = await prisma.bot.findUnique({
    where: { id: peerBotId },
    select: { name: true },
  });
  const peerIdentity = await prisma.phoneIdentity.findUnique({
    where: { botId: peerBotId },
    select: { userId: true },
  });
  const peerOwner = peerIdentity
    ? await prisma.user.findUnique({
        where: { id: peerIdentity.userId },
        select: { name: true },
      })
    : null;
  return {
    id: connection.id,
    peerBotName: peerBot?.name ?? "agent",
    peerOwnerLabel: peerOwner?.name.trim().split(/\s+/)[0] || "owner",
    status: connection.status as "pending" | "approved" | "declined" | "revoked",
    incoming,
  };
}
