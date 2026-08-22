export type ApiHealth = {
  ok: boolean;
  service: string;
};

export async function getApiHealth(origin: string): Promise<ApiHealth> {
  const response = await fetch(new URL("/api/health", origin), {
    credentials: "include",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Sentra Bot API is unavailable");
  }

  return (await response.json()) as ApiHealth;
}
