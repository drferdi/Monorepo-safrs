export type SubscriptionState =
  | "free"
  | "checkout_pending"
  | "active_plus"
  | "past_due"
  | "grace_period";
export type SubscriptionEvent =
  | "checkout_started"
  | "payment_succeeded"
  | "renewal_failed"
  | "grace_elapsed";

export interface SubscriptionTransition {
  state: SubscriptionState;
  graceEndsAt?: Date;
}

export interface PlanLimits {
  activeBots: number;
  webSearchesDaily: number;
  uploadsDaily: number;
  activeStorageBytes: number;
  activeMemoryDays: number;
  activeScheduledTasks: number;
  agentActionsMonthly: number;
  connectedIntegrations: number;
  voiceMinutesMonthly: number;
  computerAgentSessionsMonthly: number;
}

export const freePlanLimits: Readonly<PlanLimits> = {
  activeBots: 3,
  webSearchesDaily: 10,
  uploadsDaily: 5,
  activeStorageBytes: 250 * 1024 * 1024,
  activeMemoryDays: 30,
  activeScheduledTasks: 3,
  agentActionsMonthly: 20,
  connectedIntegrations: 1,
  voiceMinutesMonthly: 15,
  computerAgentSessionsMonthly: 3,
};

export type FreeBudgetTier = "normal" | "economical" | "limited_premium" | "basic_chat_only";

export interface FreeBudgetRoute {
  tier: FreeBudgetTier;
  premiumToolsAllowed: boolean;
}

export type ManagedAiComplexity = "simple" | "standard" | "complex";
export type ManagedAiModelClass = "luna" | "terra" | "sol";

export interface ManagedAiRoute {
  modelClass: ManagedAiModelClass;
  premiumToolsAllowed: boolean;
}

export function routeFreeBudget(consumedRatio: number): FreeBudgetRoute {
  if (consumedRatio > 1) return { tier: "basic_chat_only", premiumToolsAllowed: false };
  if (consumedRatio >= 0.9) return { tier: "limited_premium", premiumToolsAllowed: false };
  if (consumedRatio >= 0.7) return { tier: "economical", premiumToolsAllowed: true };
  return { tier: "normal", premiumToolsAllowed: true };
}

/**
 * Maps a runtime-classified task to a model class without exposing provider
 * model choices to customers. The gateway maps these stable classes to a
 * provider-specific model at its composition root.
 */
export function routeManagedAi(input: {
  complexity: ManagedAiComplexity;
  consumedRatio: number;
}): ManagedAiRoute {
  const budget = routeFreeBudget(input.consumedRatio);
  if (budget.tier === "basic_chat_only" || budget.tier === "limited_premium") {
    return { modelClass: "luna", premiumToolsAllowed: false };
  }
  if (budget.tier === "economical") {
    return {
      modelClass: input.complexity === "complex" ? "terra" : "luna",
      premiumToolsAllowed: true,
    };
  }
  return {
    modelClass:
      input.complexity === "simple" ? "luna" : input.complexity === "standard" ? "terra" : "sol",
    premiumToolsAllowed: true,
  };
}

export function transitionSubscription(
  state: SubscriptionState,
  event: SubscriptionEvent,
  now: Date,
): SubscriptionTransition {
  if (state === "active_plus" && event === "renewal_failed") {
    return { state: "grace_period", graceEndsAt: addCalendarDays(now, 7) };
  }
  if (state === "grace_period" && event === "grace_elapsed") return { state: "free" };
  if (state === "free" && event === "checkout_started") return { state: "checkout_pending" };
  if ((state === "checkout_pending" || state === "grace_period") && event === "payment_succeeded") {
    return { state: "active_plus" };
  }
  if (state === "active_plus" && event === "payment_succeeded") return { state };
  throw new Error(`Illegal subscription transition: ${state} -> ${event}`);
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
