import { createAadiGateway } from "../../../lib/aadi/gateway";
import { selectedAadiModel, aadiStepBudgetUsd, aadiGatewayTimeoutMs, aadiTargetedGatewayTimeoutMs } from "../../../lib/aadi/model-profile";
import { retrieveTheOracleGrounding, retrieveTheOracleTherapyGrounding, warmTheOracleGrounding } from "../../../lib/theoracle-grounding";
import { getBetaAccess } from "../../../lib/auth/server";
import { accessFailure } from "../../../lib/auth/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Targeted therapy is the default since the 2026-10-11 evaluation; AADI_TARGETED_THERAPY=false keeps the legacy path.
const targetedTherapy = process.env.AADI_TARGETED_THERAPY !== "false";
// Closed beta: SENTRAPEDIA_PUBLIC_ORIGIN admits one https origin behind Cloudflare Access; AADI_MAX_CONCURRENT (1-8) lets several
// analyses run at once. Both unset keep the local-only, one-at-a-time workspace.
const gateway = createAadiGateway({ baseUrl: process.env.AADI_SERVICE_URL, token: process.env.AADI_SERVICE_TOKEN, model: selectedAadiModel, maxCostUsd: aadiStepBudgetUsd, timeoutMs: targetedTherapy ? aadiTargetedGatewayTimeoutMs : aadiGatewayTimeoutMs, retrieveGrounding: retrieveTheOracleGrounding, retrieveTherapyGrounding: retrieveTheOracleTherapyGrounding, targetedTherapy, publicOrigin: process.env.SENTRAPEDIA_PUBLIC_ORIGIN, maxConcurrent: Number(process.env.AADI_MAX_CONCURRENT || 1) });
// The health check (the launcher's first call and the workspace's on page load) starts loading TheOracle in the
// background, so the first case does not wait for it; the check itself does not wait either.
export async function GET() { void warmTheOracleGrounding(); return gateway.health(); }
export async function POST(request: Request) {
  const access = await getBetaAccess().resolve();
  if (access.status !== "allowed") return accessFailure(access);
  return gateway.step(request);
}
