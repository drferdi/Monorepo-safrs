export type AuthConfig =
  | { mode: "unavailable" }
  | { mode: "local"; userId: "local-development" }
  | { mode: "clerk"; publishableKey: string; secretKey: string; publicOrigin: string | null };

const loopback = (host: string) => ["localhost", "127.0.0.1", "[::1]"].includes(host);

function publicOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && value === url.origin && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}

// Read on the server/proxy only. Callers must pass only publishableKey to client components.
export function resolveAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const unavailable: AuthConfig = { mode: "unavailable" };
  const mode = env.SENTRAPEDIA_AUTH_MODE ?? "clerk";
  if (mode === "local") {
    return ["development", "test"].includes(env.NODE_ENV ?? "") && !env.SENTRAPEDIA_PUBLIC_ORIGIN && loopback(env.SENTRAPEDIA_HOST ?? "127.0.0.1") ? { mode: "local", userId: "local-development" } : unavailable;
  }
  if (mode !== "clerk") return unavailable;
  const publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secretKey = env.CLERK_SECRET_KEY ?? "";
  const key = /^pk_(test|live)_([A-Za-z0-9+/=]+)$/.exec(publishableKey);
  const secret = /^sk_(test|live)_[A-Za-z0-9_-]{8,}$/.exec(secretKey);
  if (!key || !secret || key[1] !== secret[1]) return unavailable;
  try {
    // Clerk publishable keys encode their Frontend API hostname, terminated with '$'.
    const domain = atob(key[2]);
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*\$$/i.test(domain)) return unavailable;
  } catch { return unavailable; }
  const origin = publicOrigin(env.SENTRAPEDIA_PUBLIC_ORIGIN);
  if ((env.SENTRAPEDIA_PUBLIC_ORIGIN && !origin) || (env.NODE_ENV === "production" && (key[1] !== "live" || !origin))) return unavailable;
  return { mode: "clerk", publishableKey, secretKey, publicOrigin: origin };
}

export function trustedConsentOrigin(request: Request, configuredOrigin: string | null): boolean {
  try {
    const url = new URL(request.url);
    const expected = configuredOrigin ?? (url.protocol === "http:" && loopback(url.hostname) ? url.origin : null);
    if (!expected || request.headers.get("origin") !== expected) return false;
    if (url.origin !== expected && !loopback(url.hostname)) return false;
    const host = request.headers.get("host");
    if (host) {
      const parsed = new URL(`${url.protocol}//${host}`);
      if (parsed.host !== host || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return false;
      if (host !== new URL(expected).host && !(configuredOrigin && loopback(parsed.hostname)) && host !== url.host) return false;
    }
    return true;
  } catch { return false; }
}
