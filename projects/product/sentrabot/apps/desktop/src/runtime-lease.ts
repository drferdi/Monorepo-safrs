export interface RuntimeLeaseTransport {
  request<T>(input: {
    method: "POST";
    path: string;
    body?: Record<string, string | number>;
  }): Promise<T>;
}

export type DesktopRuntimeState =
  | { kind: "offline"; reason: string }
  | { kind: "active"; executionEpoch: number; leaseExpiresAt: string };

export class DesktopRuntimeLease {
  private current: DesktopRuntimeState = { kind: "offline", reason: "not started" };

  constructor(
    private readonly config: {
      apiUrl: string;
      deviceId: string;
      runtimeId: string;
      workspaceId: string;
      publicKey: string;
      transport: RuntimeLeaseTransport;
    },
  ) {}

  state(): DesktopRuntimeState {
    return this.current;
  }

  canExecute(): boolean {
    return this.current.kind === "active";
  }

  async start(): Promise<void> {
    try {
      await this.config.transport.request({
        method: "POST",
        path: "/v1/devices/register",
        body: { deviceId: this.config.deviceId, publicKey: this.config.publicKey },
      });
      await this.config.transport.request({
        method: "POST",
        path: "/v1/runtimes/register",
        body: { deviceId: this.config.deviceId, runtimeId: this.config.runtimeId },
      });
      await this.acquire();
    } catch (error) {
      this.fail(error);
    }
  }

  async acquire(): Promise<void> {
    await this.requestLease("/v1/runtime-leases/acquire");
  }

  async renew(): Promise<void> {
    try {
      await this.requestLease("/v1/runtime-leases/renew");
    } catch (error) {
      this.fail(error);
    }
  }

  async heartbeat(): Promise<void> {
    if (!this.canExecute()) return;
    try {
      await this.config.transport.request({
        method: "POST",
        path: `/v1/runtimes/${encodeURIComponent(this.config.runtimeId)}/heartbeat`,
        body: { deviceId: this.config.deviceId },
      });
    } catch (error) {
      this.fail(error);
    }
  }

  async stop(): Promise<void> {
    try {
      await this.config.transport.request({
        method: "POST",
        path: "/v1/runtime-leases/release",
        body: this.leaseBody(),
      });
    } finally {
      this.current = { kind: "offline", reason: "stopped" };
    }
  }

  private async requestLease(path: string): Promise<void> {
    const lease = await this.config.transport.request<{
      executionEpoch: number;
      leaseExpiresAt: string;
    }>({
      method: "POST",
      path,
      body: this.leaseBody(),
    });
    this.current = {
      kind: "active",
      executionEpoch: lease.executionEpoch,
      leaseExpiresAt: lease.leaseExpiresAt,
    };
  }

  private leaseBody() {
    return {
      deviceId: this.config.deviceId,
      runtimeId: this.config.runtimeId,
      workspaceId: this.config.workspaceId,
    };
  }

  private fail(error: unknown) {
    this.current = {
      kind: "offline",
      reason: error instanceof Error ? error.message : "runtime lease unavailable",
    };
  }
}
