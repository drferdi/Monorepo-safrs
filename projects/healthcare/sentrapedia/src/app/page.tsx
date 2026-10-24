import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AuthenticatedWorkspace } from "../components/auth/authenticated-workspace";
import { AccessNotice } from "../components/auth/auth-frame";
import { getBetaAccess, getAuthConfig } from "../lib/auth/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const access = await getBetaAccess().resolve();
  if (access.status === "signed-out") redirect("/sign-in");
  if (access.status !== "allowed") return <AccessNotice unavailable={access.status === "unavailable"}/>;
  return <AuthenticatedWorkspace key={randomUUID()} userId={access.userId} local={getAuthConfig().mode === "local"}/>;
}
