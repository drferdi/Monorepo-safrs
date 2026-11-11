import { describe, expect, it } from "vitest";

describe("hybrid platform policy", () => {
  it("keeps the Free computer-agent allowance deterministic", async () => {
    const { freePlanLimits } = await import("./platform-policy.js");
    expect(freePlanLimits.computerAgentSessionsMonthly).toBe(3);
  });

  it("keeps paid entitlement for exactly seven calendar days after a renewal failure", async () => {
    const { transitionSubscription } = await import("./platform-policy.js");
    const transition = transitionSubscription(
      "active_plus",
      "renewal_failed",
      new Date("2026-09-01T10:00:00.000Z"),
    );

    expect(transition.state).toBe("grace_period");
    expect(transition.graceEndsAt?.toISOString()).toBe("2026-09-08T10:00:00.000Z");
  });

  it("moves Free traffic to economical routing after seventy percent of its budget", async () => {
    const { routeFreeBudget } = await import("./platform-policy.js");
    expect(routeFreeBudget(0.8)).toEqual({ tier: "economical", premiumToolsAllowed: true });
  });

  it("retains basic chat but blocks premium tools above the Free budget", async () => {
    const { routeFreeBudget } = await import("./platform-policy.js");
    expect(routeFreeBudget(1.01)).toEqual({ tier: "basic_chat_only", premiumToolsAllowed: false });
  });

  it("routes complex work economically once Free crosses its cost guardrail", async () => {
    const { routeManagedAi } = await import("./platform-policy.js");

    expect(routeManagedAi({ complexity: "complex", consumedRatio: 0.8 })).toEqual({
      modelClass: "terra",
      premiumToolsAllowed: true,
    });
  });

  it("keeps basic chat on the low-cost model above the Free budget", async () => {
    const { routeManagedAi } = await import("./platform-policy.js");

    expect(routeManagedAi({ complexity: "complex", consumedRatio: 1.01 })).toEqual({
      modelClass: "luna",
      premiumToolsAllowed: false,
    });
  });
});
