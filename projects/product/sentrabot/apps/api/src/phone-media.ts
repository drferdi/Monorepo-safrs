import { randomUUID } from "node:crypto";
import type {
  AdapterContext,
  ArtifactStore,
  MessagingInboundMedia,
  MessagingMediaContent,
} from "@sentrabot/adapter-kit";
import { createVoiceProvider, isVoiceProviderId, MAX_TRANSCRIBE_BYTES } from "@sentrabot/adapters";
import { isAllowedAttachmentMimeType, type MessageBlock } from "@sentrabot/contracts";
import {
  attachmentExtensionForMimeType,
  inferAttachmentMimeType,
  messageBlockForArtifact,
  type PhoneLocale,
  phoneStrings,
  promptTextForAttachments,
} from "@sentrabot/core";
import type { PrismaClient } from "@sentrabot/db";
import { type ArtifactOwner, createArtifactFromBytes } from "./artifacts.js";

/** Bytes for one inbound attachment, fetched from the messaging vendor. */
export type PhoneMediaFetcher = (
  mediaId: string,
  context: AdapterContext,
) => Promise<MessagingMediaContent>;

/** Speech-to-text for a voice note. Absent when no credential is configured. */
export type PhoneMediaTranscriber = (
  audio: MessagingMediaContent,
  context: AdapterContext,
) => Promise<string>;

/**
 * Deployment-wide speech-to-text for the phone channel. Deliberately env-keyed
 * rather than per-user: a number that texts in is provisioned as a synthetic
 * user with no voice credential of its own, so a per-user lookup would leave
 * every voice note unhandled. Returns undefined when unconfigured, which makes
 * the ingestion path answer honestly instead of going quiet.
 */
export function createPhoneTranscriber(config: {
  provider: string | undefined;
  apiKey: string | undefined;
}): PhoneMediaTranscriber | undefined {
  const provider = config.provider?.trim();
  const apiKey = config.apiKey?.trim();
  if (!provider || !apiKey || !isVoiceProviderId(provider)) return undefined;
  const voice = createVoiceProvider(provider);
  if (!voice.transcribe) return undefined;
  return async (audio, context) => {
    if (audio.bytes.byteLength === 0 || audio.bytes.byteLength > MAX_TRANSCRIBE_BYTES) {
      throw new Error("Voice note is empty or too large to transcribe");
    }
    const result = await voice.transcribe!(
      {
        audio: audio.bytes,
        mimeType: audio.mimeType || "audio/ogg",
        apiKey,
        signal: context.signal,
      },
      context,
    );
    return result.text;
  };
}

export interface PhoneMediaDeps {
  prisma: PrismaClient;
  artifacts: ArtifactStore;
  fetchMedia: PhoneMediaFetcher;
  transcribe?: PhoneMediaTranscriber;
  locale: PhoneLocale;
}

export type PhoneMediaIngestion =
  | { status: "ingested"; blocks: MessageBlock[]; prompt: string }
  /** Nothing usable reached the agent; answer the sender instead of going quiet. */
  | { status: "failed"; reply: string };

function contextFor(owner: ArtifactOwner, botId: string): AdapterContext {
  // Phone numbers must not reach trace ids — those land in logs, a different
  // trust boundary than the database.
  const operationId = `phone.media:${randomUUID()}`;
  return {
    operationId,
    traceId: operationId,
    workspaceId: owner.workspaceId,
    userId: owner.userId,
    botId,
    signal: AbortSignal.timeout(30_000),
  };
}

function isTooLarge(error: unknown): boolean {
  return error instanceof Error && error.name === "WhatsAppMediaTooLargeError";
}

/**
 * Turn an inbound attachment into message blocks the agent can actually read:
 * images and documents become owned artifacts, voice notes become a
 * transcript. Every failure returns copy for the sender — a silently dropped
 * photo looks like the agent ignored them.
 */
export async function ingestPhoneMedia(
  deps: PhoneMediaDeps,
  owner: ArtifactOwner & { botId: string },
  media: MessagingInboundMedia,
): Promise<PhoneMediaIngestion> {
  const strings = phoneStrings(deps.locale);
  const context = contextFor(owner, owner.botId);

  if (media.kind === "audio") {
    if (!deps.transcribe) return { status: "failed", reply: strings.voiceUnavailable };
    let transcript: string;
    try {
      const audio = await deps.fetchMedia(media.id, context);
      transcript = (await deps.transcribe(audio, context)).trim();
    } catch (error) {
      console.error("phone voice note ingestion error", error);
      return {
        status: "failed",
        reply: isTooLarge(error) ? strings.mediaTooLarge : strings.voiceUnavailable,
      };
    }
    if (!transcript) return { status: "failed", reply: strings.voiceUnavailable };
    // The prefix keeps the agent (and the web thread) aware this was spoken,
    // which changes how literally the wording should be read.
    const text = `${strings.voicePrefix} ${transcript}`;
    return { status: "ingested", blocks: [{ kind: "text", text }], prompt: text };
  }

  const mimeType =
    (isAllowedAttachmentMimeType(media.mimeType) ? media.mimeType : null) ??
    (media.filename ? inferAttachmentMimeType(media.filename, media.mimeType) : null);
  if (!mimeType) return { status: "failed", reply: strings.unsupportedMedia };

  let content: MessagingMediaContent;
  try {
    content = await deps.fetchMedia(media.id, context);
  } catch (error) {
    console.error("phone media download error", error);
    return {
      status: "failed",
      reply: isTooLarge(error) ? strings.mediaTooLarge : strings.mediaFailed,
    };
  }

  // Trust the webhook's declared type over the CDN's: the vendor validated it
  // and the allowlist check above already ran against it.
  const name =
    media.filename?.trim() || `whatsapp-${media.id}${attachmentExtensionForMimeType(mimeType)}`;
  let artifact: Awaited<ReturnType<typeof createArtifactFromBytes>>;
  try {
    artifact = await createArtifactFromBytes(deps, owner, {
      botId: owner.botId,
      name,
      mimeType,
      bytes: content.bytes,
    });
  } catch (error) {
    console.error("phone media artifact error", error);
    return { status: "failed", reply: strings.mediaFailed };
  }

  const caption = media.caption?.trim();
  const blocks: MessageBlock[] = [];
  if (caption) blocks.push({ kind: "text", text: caption });
  blocks.push(messageBlockForArtifact(artifact));
  return { status: "ingested", blocks, prompt: promptTextForAttachments(caption, [artifact]) };
}
