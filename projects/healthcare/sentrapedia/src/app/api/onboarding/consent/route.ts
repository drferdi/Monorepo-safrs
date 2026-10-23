import { getBetaAccess } from "../../../../lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) { return getBetaAccess().consent(request); }
