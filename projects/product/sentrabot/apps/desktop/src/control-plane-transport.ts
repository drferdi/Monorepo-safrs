export type DesktopControlPlaneFetch = (input: string, init: RequestInit) => Promise<Response>;

/** Uses the Electron session fetch implementation so browser auth cookies stay local. */
export class ControlPlaneTransport {
  private readonly baseUrl: string;

  constructor(
    private readonly dependencies: {
      baseUrl: string;
      fetch: DesktopControlPlaneFetch;
    },
  ) {
    this.baseUrl = new URL(dependencies.baseUrl).origin;
  }

  async request<T>(input: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    body?: Record<string, string | number>;
  }): Promise<T> {
    const response = await this.dependencies.fetch(new URL(input.path, this.baseUrl).toString(), {
      method: input.method,
      credentials: "include",
      headers: input.body ? { "content-type": "application/json" } : undefined,
      body: input.body ? JSON.stringify(input.body) : undefined,
    });
    if (!response.ok) throw new Error(`Control Plane request failed: ${response.status}`);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
