import {
  isUserIntentTrigger,
  type UserIntent,
  type UserIntentClassification,
  UserIntentSchema,
  userIntentProbabilitiesFrom,
} from "@sentrabot/contracts";
import * as z from "zod";

export const TYPESAFE_SYSTEMONE_URL = "https://api.typesafe.ai/v1/systemone";
export const TYPESAFE_JEV_MODEL = "jev-latest";
export const INTENT_CONFIDENCE_THRESHOLD = 0.7;
export const INTENT_TEXT_MAX_CHARS = 4_000;
export const INTENT_REQUEST_TIMEOUT_MS = 8_000;

export const INTENT_CLARIFICATION_TEXT =
  "I'm not sure which action you want. Reply with whether I should answer a question, do a task, manage a routine, or connect a service.";

const INTENT_QUESTION_INSTRUCTIONS =
  "Classify the user's latest message. Choose exactly one label that best matches what they want the assistant to do next.";

const INTENT_CRITERIA = {
  answer:
    "The user wants an explanation, opinion, or informational reply without asking the assistant to take an action, run tools, schedule work, or connect a service.",
  act: "The user wants the assistant to do a task now: use the computer, run tools, write files, search, or otherwise execute work.",
  routine: "The user wants to create, change, list, pause, or run a scheduled routine.",
  connect: "The user wants to connect, authorize, or use a third-party connector or integration.",
  other:
    "The request does not fit the labels above, mixes several intents, or is too incomplete to classify.",
} as const;

export type IntentRouteDecision =
  | { kind: "skip" }
  | { kind: "continue"; classification: UserIntentClassification }
  | { kind: "clarify"; classification: UserIntentClassification };

export interface IntentRouter {
  route(input: { text: string; trigger: string }): Promise<IntentRouteDecision>;
}

export interface IntentRouterOptions {
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}

const SystemOneChoiceSchema = z.object({
  choice: UserIntentSchema,
  confidence: z.number(),
  probabilities: z.record(z.string(), z.number()).optional(),
});

const SystemOneResponseSchema = z.object({
  answers: z.object({
    intent: SystemOneChoiceSchema,
  }),
});

export function shouldClassifyIntent(run: { status: string; trigger: string }): boolean {
  return run.status === "queued" && isUserIntentTrigger(run.trigger);
}

export function userIntentTextFromBlocks(
  blocks: unknown,
  maxChars = INTENT_TEXT_MAX_CHARS,
): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const row = block as { kind?: unknown; text?: unknown };
    if (row.kind === "text" && typeof row.text === "string") {
      const trimmed = row.text.trim();
      if (trimmed) parts.push(trimmed);
    }
  }
  return parts.join("\n").slice(0, maxChars);
}

export function decideIntentRoute(
  classification: UserIntentClassification,
  threshold = INTENT_CONFIDENCE_THRESHOLD,
): IntentRouteDecision {
  if (classification.intent === "other" || classification.confidence < threshold) {
    return { kind: "clarify", classification };
  }
  return { kind: "continue", classification };
}

export function createIntentRouter(options: IntentRouterOptions = {}): IntentRouter {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return { route: async () => ({ kind: "skip" }) };
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? INTENT_REQUEST_TIMEOUT_MS;
  return {
    async route(input) {
      const text = input.text.trim();
      if (!text) return { kind: "skip" };
      try {
        const timeout = AbortSignal.timeout(timeoutMs);
        const response = await fetchImpl(TYPESAFE_SYSTEMONE_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(systemOneRequest(text)),
          redirect: "error",
          signal: timeout,
        });
        if (!response.ok) return { kind: "skip" };
        const parsed = SystemOneResponseSchema.safeParse(await response.json());
        if (!parsed.success) return { kind: "skip" };
        return decideIntentRoute(toClassification(parsed.data.answers.intent));
      } catch {
        return { kind: "skip" };
      }
    },
  };
}

function systemOneRequest(text: string): {
  model: string;
  state: { message: string };
  questions: {
    intent: {
      type: "choice";
      instructions: string;
      criteria: Record<UserIntent, string>;
    };
  };
} {
  return {
    model: TYPESAFE_JEV_MODEL,
    state: { message: text },
    questions: {
      intent: {
        type: "choice",
        instructions: INTENT_QUESTION_INSTRUCTIONS,
        criteria: { ...INTENT_CRITERIA },
      },
    },
  };
}

function toClassification(answer: z.infer<typeof SystemOneChoiceSchema>): UserIntentClassification {
  return {
    intent: answer.choice,
    confidence: clampUnit(answer.confidence),
    probabilities: userIntentProbabilitiesFrom(answer.probabilities),
  };
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
