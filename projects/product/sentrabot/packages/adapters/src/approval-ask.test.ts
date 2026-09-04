import { describe, expect, it } from "vitest";
import { buildApprovalAskBlock } from "./approval-ask.js";

describe("buildApprovalAskBlock", () => {
  it("binds the approval to its effect and redacts secrets", () => {
    const block = buildApprovalAskBlock(
      "effect-1",
      "gmail_send_email",
      { to: "person@example.test", body: "token-secret" },
      ["token-secret"],
    );

    expect(block).toMatchObject({
      kind: "ask",
      approvalEffectId: "effect-1",
      actions: [
        { id: "allow", label: "Allow once" },
        { id: "always", label: "Always allow this tool" },
        { id: "deny", label: "Deny" },
      ],
    });
    expect(JSON.stringify(block)).not.toContain("token-secret");
  });

  it("bounds model-controlled summaries and details", () => {
    const block = buildApprovalAskBlock(
      "effect-1",
      "destination.write",
      { title: "t".repeat(1_000), body: "b".repeat(10_000) },
      [],
    );

    expect(block.kind).toBe("ask");
    if (block.kind !== "ask") throw new Error("expected ask block");
    expect(block.text.length).toBeLessThanOrEqual(501);
    expect(block.detail?.length).toBeLessThanOrEqual(4_001);
  });

  it("includes an optional review reason as the first detail line", () => {
    const block = buildApprovalAskBlock(
      "effect-1",
      "gmail_send_email",
      { to: "person@example.test", subject: "Hi" },
      [],
      { reviewReason: "Sends email outside the draft-only task." },
    );

    expect(block.kind).toBe("ask");
    if (block.kind !== "ask") throw new Error("expected ask block");
    expect(block.detail?.startsWith("Sends email outside the draft-only task.")).toBe(true);
    expect(block.detail).toContain("to: person@example.test");
  });

  it("omits the always action when the run executes on a host computer", () => {
    const block = buildApprovalAskBlock("effect-1", "shell", { command: "ls" }, [], {
      hostExecution: true,
    });

    expect(block.kind).toBe("ask");
    if (block.kind !== "ask") throw new Error("expected ask block");
    expect(block.actions?.map((action) => action.id)).toEqual(["allow", "deny"]);
  });

  it("offers the always action off a host computer", () => {
    for (const options of [undefined, { hostExecution: false }]) {
      const block = buildApprovalAskBlock("effect-1", "shell", { command: "ls" }, [], options);

      expect(block.kind).toBe("ask");
      if (block.kind !== "ask") throw new Error("expected ask block");
      expect(block.actions?.map((action) => action.id)).toEqual(["allow", "always", "deny"]);
    }
  });
});
