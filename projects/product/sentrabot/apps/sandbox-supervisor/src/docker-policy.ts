import { z } from "zod";

export const dockerExecutionRequestSchema = z.strictObject({
  computerId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/),
  botId: z.string().min(1).max(128),
  workspaceId: z.string().min(1).max(128),
  image: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.\-/:@]{0,255}$/),
  workspacePath: z
    .string()
    .regex(/^\/srv\/sentrabot\/workspaces\/[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/),
});

export type DockerExecutionRequest = z.infer<
  typeof dockerExecutionRequestSchema
>;

export type DockerCreateOptions = {
  image: string;
  name: string;
  labels: Record<string, string>;
  hostConfig: {
    binds: string[];
    networkMode: "none" | "sentrabot-internal";
    readOnlyRootfs: true;
    noNewPrivileges: true;
    capDrop: ["ALL"];
    pidsLimit: number;
    memory: number;
    nanoCpus: number;
  };
};

export function buildDockerCreateOptions(
  input: DockerExecutionRequest,
): DockerCreateOptions {
  const parsed = dockerExecutionRequestSchema.parse(input);
  return {
    image: parsed.image,
    name: `sentrabot-${parsed.computerId}`,
    labels: {
      "sentrabot.managed": "true",
      "sentrabot.computerId": parsed.computerId,
      "sentrabot.botId": parsed.botId,
      "sentrabot.workspaceId": parsed.workspaceId,
    },
    hostConfig: {
      binds: [`${parsed.workspacePath}:/workspace:rw`],
      networkMode: "none",
      readOnlyRootfs: true,
      noNewPrivileges: true,
      capDrop: ["ALL"],
      pidsLimit: 128,
      memory: 512 * 1024 * 1024,
      nanoCpus: 1_000_000_000,
    },
  };
}

export type DockerExecutor = {
  create: (options: DockerCreateOptions) => Promise<{ id: string }>;
  start: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
};

export function createIsolatedDockerExecutor(docker: DockerExecutor) {
  return {
    async boot(input: unknown) {
      const options = buildDockerCreateOptions(
        dockerExecutionRequestSchema.parse(input),
      );
      const container = await docker.create(options);
      await docker.start(container.id);
      return { containerId: container.id, options };
    },
    stop(containerId: string) {
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(containerId)) {
        throw new Error("Invalid container id");
      }
      return docker.stop(containerId);
    },
  };
}
