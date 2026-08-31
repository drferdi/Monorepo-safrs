import type { MessageBlock } from "@sentrabot/contracts";
import { describe, expect, it } from "vitest";
import { normalizePhoneLocale, phoneStrings, renderPhoneAskCard } from "./phone-strings.js";

function approvalAsk(overrides: Partial<Extract<MessageBlock, { kind: "ask" }>> = {}) {
  return {
    kind: "ask" as const,
    text: "Review before gmail.send → budi@example.com",
    detail: "to: budi@example.com\nsubject: Rapat besok",
    approvalEffectId: "eff-1",
    status: "pending" as const,
    actions: [
      { id: "allow", label: "Allow once" },
      { id: "always", label: "Always allow this tool" },
      { id: "deny", label: "Deny" },
    ],
    ...overrides,
  };
}

describe("normalizePhoneLocale", () => {
  it("defaults to Indonesian and only accepts a known override", () => {
    expect(normalizePhoneLocale(undefined)).toBe("id");
    expect(normalizePhoneLocale("fr")).toBe("id");
    expect(normalizePhoneLocale("en")).toBe("en");
  });
});

describe("renderPhoneAskCard", () => {
  it("numbers the actions so the card can be answered by a single digit", () => {
    const card = renderPhoneAskCard(approvalAsk(), "id");
    expect(card).not.toBeNull();
    expect(card?.answers).toEqual({ "1": "allow", "2": "always", "3": "deny" });
    expect(card?.body).toContain("Review before gmail.send → budi@example.com");
    expect(card?.body).toContain("subject: Rapat besok");
    expect(card?.body).toContain(
      "Balas dengan angka: 1 = Izinkan sekali, 2 = Selalu izinkan, 3 = Jangan",
    );
  });

  it("uses English labels when the deployment runs in English", () => {
    expect(renderPhoneAskCard(approvalAsk(), "en")?.body).toContain(
      "Reply with a number: 1 = Allow once, 2 = Always allow, 3 = Deny",
    );
  });

  it("refuses asks that need typed input — a secret must not travel by text", () => {
    expect(renderPhoneAskCard(approvalAsk({ input: "secret" }), "id")).toBeNull();
    expect(renderPhoneAskCard(approvalAsk({ input: "text" }), "id")).toBeNull();
    expect(renderPhoneAskCard(approvalAsk({ actions: undefined }), "id")).toBeNull();
  });

  it("carries a confirmation for every action it offers", () => {
    const card = renderPhoneAskCard(approvalAsk(), "id");
    const confirmations = phoneStrings("id").askConfirmed;
    for (const action of Object.values(card!.answers)) {
      expect(confirmations[action as keyof typeof confirmations]).toBeTruthy();
    }
  });
});
