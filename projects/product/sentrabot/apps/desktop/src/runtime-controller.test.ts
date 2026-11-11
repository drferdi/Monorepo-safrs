import { describe, expect, it, vi } from "vitest";

describe("Desktop Runtime controller", () => {
  it("materializes Sentra Personal only after the Desktop Runtime owns a lease", async () => {
    const { DesktopRuntimeController } = await import("./runtime-controller.js");
    const lease = {
      start: vi.fn(async () => undefined),
      renew: vi.fn(async () => undefined),
      heartbeat: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      canExecute: vi.fn(() => true),
    };
    const materializePersonal = vi.fn(async () => undefined);
    const controller = new DesktopRuntimeController({ lease, materializePersonal });

    await controller.start();
    await controller.tick();

    expect(materializePersonal).toHaveBeenCalledOnce();
    expect(lease.renew).toHaveBeenCalledOnce();
    expect(lease.heartbeat).toHaveBeenCalledTimes(2);
  });

  it("stays offline without creating local work when it cannot acquire a lease", async () => {
    const { DesktopRuntimeController } = await import("./runtime-controller.js");
    const lease = {
      start: vi.fn(async () => undefined),
      renew: vi.fn(async () => undefined),
      heartbeat: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      canExecute: vi.fn(() => false),
    };
    const materializePersonal = vi.fn(async () => undefined);
    const controller = new DesktopRuntimeController({ lease, materializePersonal });

    await controller.start();
    await controller.tick();

    expect(materializePersonal).not.toHaveBeenCalled();
    expect(lease.renew).not.toHaveBeenCalled();
  });
});
