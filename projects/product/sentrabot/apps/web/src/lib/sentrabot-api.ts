import { sentraBotDeploymentSettingsSchema } from "@safrs/schemas/sentrabot";

export async function getSentraBotDeploymentSettings(origin: string) {
  const response = await fetch(new URL("/api/sentrabot/deployment", origin), {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Sentra Bot deployment settings are unavailable");
  }

  return sentraBotDeploymentSettingsSchema.parse(await response.json());
}
