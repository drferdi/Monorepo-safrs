import { redirect } from "next/navigation";
import { AgentPage } from "../../components/agent-page";
import { AccessNotice } from "../../components/auth/auth-frame";
import { getBetaAccess, getAuthConfig } from "../../lib/auth/server";
import { readTheOracleManifest } from "../../lib/theoracle-grounding";
import { theOracleSource } from "../../lib/theoracle";

export const dynamic = "force-dynamic";

// Pengaturan Agent: the same access gate as the encounter page, then the page with the installed index described from its manifest.
export default async function Agent() {
  const access = await getBetaAccess().resolve();
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status === "consent-required") redirect("/onboarding");
  if (access.status !== "allowed") return <AccessNotice unavailable={access.status === "unavailable"}/>;
  const manifest = await readTheOracleManifest();
  return <AgentPage userId={access.userId} local={getAuthConfig().mode === "local"} theoracle={manifest ? { ...manifest, catalogVersion: theOracleSource.version } : null}/>;
}
