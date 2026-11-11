import { describe, expect, it } from "vitest";
import {
  emptyUserIntentProbabilities,
  isUserIntentTrigger,
  UserIntentClassificationSchema,
  userIntentProbabilitiesFrom,
} from "./user-intent.js";

describe("user intent contract", () => {
  it("accepts the closed intent set", () => {
    expect(
      UserIntentClassificationSchema.parse({
        intent: "act",
        confidence: 0.91,
        probabilities: {
          answer: 0.02,
          act: 0.91,
          routine: 0.03,
          connect: 0.02,
          other: 0.02,
        },
      }).intent,
    ).toBe("act");
    expect(UserIntentClassificationSchema.safeParse({ intent: "billing" }).success).toBe(false);
  });

  it("recognizes only the user-message run triggers", () => {
    expect(isUserIntentTrigger("user")).toBe(true);
    expect(isUserIntentTrigger("phone")).toBe(true);
    expect(isUserIntentTrigger("follow_up")).toBe(true);
    expect(isUserIntentTrigger("webhook")).toBe(true);
    expect(isUserIntentTrigger("routine")).toBe(false);
    expect(isUserIntentTrigger("bot_message")).toBe(false);
  });

  it("fills missing probability keys with zero", () => {
    expect(userIntentProbabilitiesFrom({ act: 0.8, unknown: 0.4 })).toEqual({
      ...emptyUserIntentProbabilities(),
      act: 0.8,
    });
  });
});
