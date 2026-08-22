import { describe, expect, it, vi } from "vitest";
import {
  buildDockerCreateOptions,
  createIsolatedDockerExecutor,
} from "./docker-policy.js";

const request = {
  computerId: "computer-1",
  botId: "bot-1",
  workspaceId: "workspace-1",
  image: "ghcr.io/sentra/sentrabot-sandbox:0.1.0",
  workspacePath: "/srv/sentrabot/workspaces/workspace-1",
};

describe("isolated Docker executor policy", () => {
  it("builds restrictive options without Docker socket or host networking", () => {
    const options = buildDockerCreateOptions(request);
    expect(options.hostConfig).toMatchObject({
      networkMode: "none",
      readOnlyRootfs: true,
      noNewPrivileges: true,
      capDrop: ["ALL"],
      pidsLimit: 128,
    });
    expect(options.hostConfig.binds).not.toContain("/var/run/docker.sock");
  });

  it("rejects traversal and unbounded workspace paths", () => {
    expect(() =>
      buildDockerCreateOptions({ ...request, workspacePath: "/tmp/../host" }),
    ).toThrow();
    expect(() =>
      buildDockerCreateOptions({ ...request, computerId: "../socket" }),
    ).toThrow();
  });

  it("creates and starts only policy-built containers", async () => {
    const docker = {
      create: vi.fn().mockResolvedValue({ id: "container-1" }),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    await createIsolatedDockerExecutor(docker).boot(request);
    expect(docker.create).toHaveBeenCalledOnce();
    expect(docker.start).toHaveBeenCalledWith("container-1");
  });
});
