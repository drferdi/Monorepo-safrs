import { describe, expect, it, vi } from "vitest";
import {
  INTENT_CONFIDENCE_THRESHOLD,
  TYPESAFE_JEV_MODEL,
  TYPESAFE_SYSTEMONE_URL,
  createIntentRouter,
  decideIntentRoute,
  shouldClassifyIntent,
  userIntentTextFromBlocks,
} from "./intent-router.js";

function classification(
  intent: "answer" | "act" | "routine" | "connect" | "other",
  confidence: number,
) {
  return {
    intent,
    confidence,
    probabilities: { answer: 0, act: 0, routine: 0, connect: 0, other: 0, [intent]: confidence },
  };
}

describe("shouldClassifyIntent", () => {
  it("classifies only first-turn user-message runs", () => {
    expect(shouldClassifyIntent({ status: "queued", trigger: "user" })).toBe(true);
    expect(shouldClassifyIntent({ status: "queued", trigger: "webhook" })).toBe(true);
    expect(shouldClassifyIntent({ status: "queued", trigger: "routine" })).toBe(false);
    expect(shouldClassifyIntent({ status: "waiting_input", trigger: "user" })).toBe(false);
    expect(shouldClassifyIntent({ status: "leased", trigger: "user" })).toBe(false);
  });
});

describe("userIntentTextFromBlocks", () => {
  it("joins text blocks and ignores attachments", () => {
    expect(
      userIntentTextFromBlocks([
        { kind: "text", text: "  Buat routine  " },
        { kind: "image", artifactId: "a1" },
      ]),
    ).toBe("Buat routine");
    expect(userIntentTextFromBlocks([{ kind: "image", artifactId: "a1" }])).toBe("");
  });
});

describe("decideIntentRoute", () => {
  it("continues when confidence clears the threshold", () => {
    expect(decideIntentRoute(classification("act", INTENT_CONFIDENCE_THRESHOLD))).toMatchObject({
      kind: "continue",
      classification: { intent: "act" },
    });
  });

  it("clarifies below threshold or when the label is other", () => {
    expect(decideIntentRoute(classification("act", 0.69)).kind).toBe("clarify");
    expect(decideIntentRoute(classification("other", 0.99)).kind).toBe("clarify");
  });
});

describe("createIntentRouter", () => {
  it("skips without a key and does not fetch", async () => {
    const fetch = vi.fn();
    const router = createIntentRouter({ fetch });
    await expect(router.route({ text: "hello", trigger: "user" })).resolves.toEqual({
      kind: "skip",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts a closed choice question and continues on a confident act", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: {
            intent: {
              type: "choice",
              choice: "act",
              confidence: 0.92,
              probabilities: { answer: 0.02, act: 0.92, routine: 0.02, connect: 0.02, other: 0.02 },
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const router = createIntentRouter({ apiKey: "test-key", fetch });
    const decision = await router.route({
      text: "Open the report and summarize it",
      trigger: "user",
    });
    expect(decision).toMatchObject({ kind: "continue", classification: { intent: "act" } });
    expect(fetch).toHaveBeenCalledWith(
      TYPESAFE_SYSTEMONE_URL,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer test-key" }),
      }),
    );
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as {
      model: string;
      questions: { intent: { criteria: Record<string, string> } };
    };
    expect(body.model).toBe(TYPESAFE_JEV_MODEL);
    expect(Object.keys(body.questions.intent.criteria).sort()).toEqual([
      "act",
      "answer",
      "connect",
      "other",
      "routine",
    ]);
  });

  it("clarifies when Jev is unsure", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: {
            intent: { choice: "answer", confidence: 0.41, probabilities: { answer: 0.41 } },
          },
        }),
        { status: 200 },
      ),
    );
    const router = createIntentRouter({ apiKey: "test-key", fetch });
    await expect(router.route({ text: "nanti saja", trigger: "user" })).resolves.toMatchObject({
      kind: "clarify",
      classification: { intent: "answer", confidence: 0.41 },
    });
  });

  it("skips on HTTP or parse failure so the existing agent still runs", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 529 }));
    const router = createIntentRouter({ apiKey: "test-key", fetch });
    await expect(router.route({ text: "hello", trigger: "user" })).resolves.toEqual({ kind: "skip" });
  });
});
