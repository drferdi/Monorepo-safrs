import * as z from "zod";

export const USER_INTENTS = ["answer", "act", "routine", "connect", "other"] as const;
export const UserIntentSchema = z.enum(USER_INTENTS);
export type UserIntent = z.infer<typeof UserIntentSchema>;

export const UserIntentProbabilitiesSchema = z.object({
  answer: z.number().min(0).max(1),
  act: z.number().min(0).max(1),
  routine: z.number().min(0).max(1),
  connect: z.number().min(0).max(1),
  other: z.number().min(0).max(1),
});
export type UserIntentProbabilities = z.infer<typeof UserIntentProbabilitiesSchema>;

export const UserIntentClassificationSchema = z.object({
  intent: UserIntentSchema,
  confidence: z.number().min(0).max(1),
  probabilities: UserIntentProbabilitiesSchema,
});
export type UserIntentClassification = z.infer<typeof UserIntentClassificationSchema>;

export const USER_INTENT_TRIGGERS = ["user", "phone", "follow_up", "webhook"] as const;
export type UserIntentTrigger = (typeof USER_INTENT_TRIGGERS)[number];

export function isUserIntentTrigger(trigger: string): trigger is UserIntentTrigger {
  return (USER_INTENT_TRIGGERS as readonly string[]).includes(trigger);
}

export function emptyUserIntentProbabilities(): UserIntentProbabilities {
  return { answer: 0, act: 0, routine: 0, connect: 0, other: 0 };
}

export function userIntentProbabilitiesFrom(
  raw: Readonly<Record<string, number>> | undefined,
): UserIntentProbabilities {
  const next = emptyUserIntentProbabilities();
  if (!raw) return next;
  for (const intent of USER_INTENTS) {
    const value = raw[intent];
    if (typeof value === "number" && Number.isFinite(value)) {
      next[intent] = Math.min(1, Math.max(0, value));
    }
  }
  return next;
}
