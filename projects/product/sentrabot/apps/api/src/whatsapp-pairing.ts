import { randomBytes } from "node:crypto";
import type { Actor } from "@sentrabot/contracts";
import type { PrismaClient } from "@sentrabot/db";
import type { WhatsAppPairingResult } from "./whatsapp-webhook.js";

export const WHATSAPP_PAIRING_TTL_MS = 15 * 60 * 1000;

/** Unambiguous alphabet (no 0/O/1/I) for a code typed or tapped into WhatsApp. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePairingCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i += 1) code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  return code;
}

/**
 * Issue a short-lived single-use pairing code binding the actor's bot to the
 * next WhatsApp message that carries it. Prior unused codes for the same bot
 * are invalidated so only the latest link works.
 */
export async function beginWhatsAppPairing(
  prisma: PrismaClient,
  actor: Actor,
  botId: string,
): Promise<{ code: string; expiresAt: Date }> {
  const bot = await prisma.bot.findFirst({
    where: { id: botId, workspaceId: actor.workspaceId, userId: actor.userId, archivedAt: null },
    select: { id: true },
  });
  if (!bot) throw new Error("Bot not found");
  const existingIdentity = await prisma.phoneIdentity.findUnique({ where: { botId } });
  if (existingIdentity) throw new Error("That agent already has a paired number.");

  await prisma.phonePairing.deleteMany({
    where: { botId, usedAt: null },
  });
  const expiresAt = new Date(Date.now() + WHATSAPP_PAIRING_TTL_MS);
  const pairing = await prisma.phonePairing.create({
    data: {
      code: generatePairingCode(),
      provider: "whatsapp",
      userId: actor.userId,
      workspaceId: actor.workspaceId,
      botId,
      expiresAt,
    },
  });
  return { code: pairing.code, expiresAt };
}

/**
 * Bind a WhatsApp number to the code's user/bot. Runs from the webhook BEFORE
 * the normal inbound path, so an unknown number sending a code is never
 * provisioned as a synthetic user first. Single-use: the usedAt claim and the
 * unique phoneE164/botId constraints make races lose cleanly.
 */
export async function completeWhatsAppPairing(
  prisma: PrismaClient,
  code: string,
  phoneE164: string,
): Promise<WhatsAppPairingResult> {
  const now = new Date();
  const pairing = await prisma.phonePairing.findUnique({ where: { code } });
  if (!pairing || pairing.usedAt || pairing.expiresAt < now) return "invalid";

  const numberTaken = await prisma.phoneIdentity.findUnique({ where: { phoneE164 } });
  if (numberTaken) return "conflict-number";

  const claim = await prisma.phonePairing.updateMany({
    where: { id: pairing.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claim.count === 0) return "invalid";

  try {
    await prisma.phoneIdentity.create({
      data: {
        phoneE164,
        provider: "whatsapp",
        userId: pairing.userId,
        workspaceId: pairing.workspaceId,
        botId: pairing.botId,
        verifiedAt: now,
        lastInboundAt: now,
      },
    });
  } catch {
    // Unique-constraint loss: the number or the bot got paired concurrently.
    const botTaken = await prisma.phoneIdentity.findUnique({ where: { botId: pairing.botId } });
    return botTaken ? "conflict-bot" : "conflict-number";
  }
  return "paired";
}

/** Current WhatsApp link for the actor, if any. */
export async function whatsAppPairingStatus(
  prisma: PrismaClient,
  actor: Actor,
): Promise<{ linked: boolean; phoneE164: string | null; botId: string | null }> {
  const identity = await prisma.phoneIdentity.findFirst({
    where: { userId: actor.userId, workspaceId: actor.workspaceId, provider: "whatsapp" },
  });
  return {
    linked: Boolean(identity),
    phoneE164: identity?.phoneE164 ?? null,
    botId: identity?.botId ?? null,
  };
}
