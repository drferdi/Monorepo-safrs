import type { MessagingInboundMedia, MessagingMediaContent } from "@sentrabot/adapter-kit";
import { describe, expect, it, vi } from "vitest";
import { ingestPhoneMedia, type PhoneMediaDeps } from "./phone-media.js";

const OWNER = { userId: "user-1", workspaceId: "ws-1", botId: "bot-1" };

function bytes(mimeType: string): MessagingMediaContent {
  return { bytes: new Uint8Array([1, 2, 3]), mimeType };
}

function buildDeps(overrides: Partial<PhoneMediaDeps> = {}): PhoneMediaDeps {
  const artifactRow = {
    id: "art-1",
    botId: OWNER.botId,
    groupId: null,
    runId: null,
    name: "whatsapp-MEDIA_1.jpg",
    mimeType: "image/jpeg",
    size: 3,
    createdAt: new Date(),
  };
  return {
    prisma: {
      artifact: { create: vi.fn(async () => artifactRow) },
    } as unknown as PhoneMediaDeps["prisma"],
    artifacts: {
      put: vi.fn(async () => ({ id: "storage-1" })),
      remove: vi.fn(async () => undefined),
    } as unknown as PhoneMediaDeps["artifacts"],
    fetchMedia: vi.fn(async () => bytes("image/jpeg")),
    locale: "id",
    ...overrides,
  };
}

function media(overrides: Partial<MessagingInboundMedia> = {}): MessagingInboundMedia {
  return { id: "MEDIA_1", mimeType: "image/jpeg", kind: "image", ...overrides };
}

describe("ingestPhoneMedia", () => {
  it("stores a photo as an artifact and attaches its caption", async () => {
    const deps = buildDeps();
    const result = await ingestPhoneMedia(deps, OWNER, media({ caption: "ini invoicenya" }));
    expect(result.status).toBe("ingested");
    if (result.status !== "ingested") return;
    expect(result.blocks).toEqual([
      { kind: "text", text: "ini invoicenya" },
      { kind: "image", artifactId: "art-1", mimeType: "image/jpeg", name: "whatsapp-MEDIA_1.jpg" },
    ]);
    expect(result.prompt).toBe("ini invoicenya");
  });

  it("answers instead of going quiet when the file type is unsupported", async () => {
    const deps = buildDeps();
    const result = await ingestPhoneMedia(
      deps,
      OWNER,
      media({ kind: "document", mimeType: "video/mp4" }),
    );
    expect(result).toEqual({ status: "failed", reply: expect.stringMatching(/belum didukung/i) });
    expect(deps.fetchMedia).not.toHaveBeenCalled();
  });

  it("transcribes a voice note and marks it as spoken", async () => {
    const deps = buildDeps({
      fetchMedia: vi.fn(async () => bytes("audio/ogg")),
      transcribe: vi.fn(async () => "  tolong ingetin saya telepon Pak Budi  "),
    });
    const result = await ingestPhoneMedia(
      deps,
      OWNER,
      media({ kind: "audio", mimeType: "audio/ogg", voice: true }),
    );
    expect(result).toEqual({
      status: "ingested",
      blocks: [{ kind: "text", text: "🎤 tolong ingetin saya telepon Pak Budi" }],
      prompt: "🎤 tolong ingetin saya telepon Pak Budi",
    });
  });

  it("says voice notes are unsupported when no transcriber is configured", async () => {
    const deps = buildDeps();
    const result = await ingestPhoneMedia(
      deps,
      OWNER,
      media({ kind: "audio", mimeType: "audio/ogg" }),
    );
    expect(result).toEqual({ status: "failed", reply: expect.stringMatching(/pesan suara/i) });
    expect(deps.fetchMedia).not.toHaveBeenCalled();
  });

  it("reports an oversize attachment as too large, not as a generic failure", async () => {
    const tooLarge = Object.assign(new Error("too big"), { name: "WhatsAppMediaTooLargeError" });
    const deps = buildDeps({
      fetchMedia: vi.fn(async () => {
        throw tooLarge;
      }),
    });
    const result = await ingestPhoneMedia(deps, OWNER, media());
    expect(result).toEqual({ status: "failed", reply: expect.stringMatching(/terlalu besar/i) });
  });

  it("infers a document's type from its filename when the vendor omits one", async () => {
    const deps = buildDeps({ fetchMedia: vi.fn(async () => bytes("application/pdf")) });
    const result = await ingestPhoneMedia(
      deps,
      OWNER,
      media({ kind: "document", mimeType: "", filename: "surat-tugas.pdf" }),
    );
    expect(result.status).toBe("ingested");
  });
});
