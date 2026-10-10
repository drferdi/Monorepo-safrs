import { createMiraGateway } from "../../../lib/mira/gateway";
import { selectedMiraModel, miraStepBudgetUsd } from "../../../lib/mira/model-profile";
import { retrieveOracleGrounding } from "../../../lib/oracle-grounding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const gateway = createMiraGateway({ baseUrl: process.env.MIRA_SERVICE_URL, token: process.env.MIRA_SERVICE_TOKEN, model: selectedMiraModel, maxCostUsd: miraStepBudgetUsd, timeoutMs: 135000, retrieveGrounding: retrieveOracleGrounding });
export async function GET() { return gateway.health(); }
export async function POST(request: Request) { return gateway.step(request); }
