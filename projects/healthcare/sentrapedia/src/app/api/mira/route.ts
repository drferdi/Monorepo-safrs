import { createMiraGateway } from "../../../lib/mira/gateway";
import { selectedMiraModel, miraStepBudgetUsd, miraGatewayTimeoutMs } from "../../../lib/mira/model-profile";
import { retrieveTheOracleGrounding } from "../../../lib/theoracle-grounding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const gateway = createMiraGateway({ baseUrl: process.env.MIRA_SERVICE_URL, token: process.env.MIRA_SERVICE_TOKEN, model: selectedMiraModel, maxCostUsd: miraStepBudgetUsd, timeoutMs: miraGatewayTimeoutMs, retrieveGrounding: retrieveTheOracleGrounding });
export async function GET() { return gateway.health(); }
export async function POST(request: Request) { return gateway.step(request); }
