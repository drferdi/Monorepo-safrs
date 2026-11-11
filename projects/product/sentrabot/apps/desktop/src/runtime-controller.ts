export interface RuntimeLeaseController {
  start(): Promise<void>;
  renew(): Promise<void>;
  heartbeat(): Promise<void>;
  stop(): Promise<void>;
  canExecute(): boolean;
}

/** Coordinates local work; it never queues commands while the runtime is offline. */
export class DesktopRuntimeController {
  private personalMaterialized = false;

  constructor(
    private readonly dependencies: {
      lease: RuntimeLeaseController;
      materializePersonal(): Promise<void>;
    },
  ) {}

  async start(): Promise<void> {
    await this.dependencies.lease.start();
    if (this.dependencies.lease.canExecute()) await this.dependencies.lease.heartbeat();
    await this.materializeIfActive();
  }

  async tick(): Promise<void> {
    if (!this.dependencies.lease.canExecute()) {
      await this.start();
      return;
    }
    await this.dependencies.lease.renew();
    if (!this.dependencies.lease.canExecute()) return;
    await this.dependencies.lease.heartbeat();
    await this.materializeIfActive();
  }

  async stop(): Promise<void> {
    await this.dependencies.lease.stop();
  }

  isActive(): boolean {
    return this.dependencies.lease.canExecute();
  }

  private async materializeIfActive(): Promise<void> {
    if (!this.dependencies.lease.canExecute() || this.personalMaterialized) return;
    await this.dependencies.materializePersonal();
    this.personalMaterialized = true;
  }
}
