-- WhatsApp Cloud API coexists with the existing iMessage channel: identities
-- and outbound rows carry a provider, and short-lived pairing codes bind a
-- WhatsApp number to an existing user's bot.
ALTER TABLE "phone_identities" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'sendblue';
ALTER TABLE "phone_outbound" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'sendblue';

CREATE TABLE "phone_pairings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'whatsapp',
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_pairings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "phone_pairings_code_key" ON "phone_pairings"("code");
CREATE INDEX "phone_pairings_userId_idx" ON "phone_pairings"("userId");
