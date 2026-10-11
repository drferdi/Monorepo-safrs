import { createMiraGateway } from "../../../lib/mira/gateway";
import { selectedMiraModel, miraStepBudgetUsd, miraGatewayTimeoutMs, miraTargetedGatewayTimeoutMs } from "../../../lib/mira/model-profile";
import { retrieveTheOracleGrounding, retrieveTheOracleTherapyGrounding } from "../../../lib/theoracle-grounding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Targeted therapy is the default since the 2026-10-11 evaluation; MIRA_TARGETED_THERAPY=false keeps the legacy path.
const targetedTherapy = process.env.MIRA_TARGETED_THERAPY !== "false";
const gateway = createMiraGateway({ baseUrl: process.env.MIRA_SERVICE_URL, token: process.env.MIRA_SERVICE_TOKEN, model: selectedMiraModel, maxCostUsd: miraStepBudgetUsd, timeoutMs: targetedTherapy ? miraTargetedGatewayTimeoutMs : miraGatewayTimeoutMs, retrieveGrounding: retrieveTheOracleGrounding, retrieveTherapyGrounding: retrieveTheOracleTherapyGrounding, targetedTherapy });
export async function GET() { return gateway.health(); }
export async function POST(request: Request) { return gateway.step(request); }
