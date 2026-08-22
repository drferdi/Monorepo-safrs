import { describe, expect, it } from "vitest";
import { createSupervisorApp } from "./index.js";

describe("sandbox supervisor boundary", () => {
  const app = createSupervisorApp(() => ({
    SUPERVISOR_TOKEN: "internal-token",
  }));

  it("keeps health public for orchestration", async () => {
    const response = await app.request("http://localhost/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      service: "sandbox-supervisor",
    });
  });

  it("requires authentication for computer control", async () => {
    const response = await app.request(
      "http://localhost/computers/computer-1/operations",
      { method: "POST" },
    );
    expect(response.status).toBe(401);
  });

  it("reports readiness separately from liveness", async () => {
    expect((await app.request("http://localhost/ready")).status).toBe(503);
    const readyApp = createSupervisorApp(() => ({
      SUPERVISOR_TOKEN: "internal-token",
      ready: true,
    }));
    expect((await readyApp.request("http://localhost/ready")).status).toBe(200);
  });

  it("validates identity, path, and payload before privileged operations", async () => {
    const response = await app.request(
      "http://localhost/computers/../socket/operations",
      {
        method: "POST",
        headers: {
          authorization: "Bearer internal-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          actor: {
            computerId: "socket",
            botId: "bot_1",
            workspaceId: "workspace_1",
          },
          requestId: "request_1",
          operation: { operation: "boot" },
        }),
      },
    );
    expect([400, 404]).toContain(response.status);
  });

  it("rejects credential-shaped strict payloads", async () => {
    const response = await app.request(
      "http://localhost/computers/computer-1/operations",
      {
        method: "POST",
        headers: {
          authorization: "Bearer internal-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          actor: {
            computerId: "computer-1",
            botId: "bot_1",
            workspaceId: "workspace_1",
          },
          requestId: "request_1",
          operation: { operation: "status" },
          providerApiKey: "secret",
        }),
      },
    );
    expect(response.status).toBe(400);
  });

  it("boots through the injected isolated executor without exposing credentials", async () => {
    const create = async (options: {
      hostConfig: { networkMode: string; noNewPrivileges: boolean };
      labels: Record<string, string>;
    }) => {
      expect(options.hostConfig.networkMode).toBe("none");
      expect(options.hostConfig.noNewPrivileges).toBe(true);
      expect(options.labels).not.toHaveProperty("providerApiKey");
      return { id: "container-1" };
    };
    const bootApp = createSupervisorApp(() => ({
      SUPERVISOR_TOKEN: "internal-token",
      ready: true,
      docker: {
        create,
        start: async () => undefined,
        stop: async () => undefined,
      },
    }));
    const response = await bootApp.request(
      "http://localhost/computers/computer-1/operations",
      {
        method: "POST",
        headers: {
          authorization: "Bearer internal-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          actor: {
            computerId: "computer-1",
            botId: "bot-1",
            workspaceId: "workspace-1",
          },
          requestId: "request-boot",
          operation: { operation: "boot" },
        }),
      },
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      ok: true,
      containerId: "container-1",
    });
  });

  it("does not expose an unauthenticated control implementation", async () => {
    const response = await app.request(
      "http://localhost/computers/computer-1/operations",
      {
        method: "POST",
        headers: { authorization: "Bearer internal-token" },
      },
    );
    expect(response.status).toBe(400);
  });
});
