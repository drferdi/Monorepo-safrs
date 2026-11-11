import { RelayEnvelopeSchema } from "@sentrabot/contracts";
import { type Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";

const MAX_LIVE_RELAY_BYTES = 6_000;

export function createRelayRoutes(dependencies: {
  authenticate(request: Request): Promise<{ userId: string; workspaceId: string } | null>;
  isTrustedDevice(input: {
    actor: { userId: string; workspaceId: string };
    deviceId: string;
  }): Promise<boolean>;
  isTrustedRuntime(input: {
    actor: { userId: string; workspaceId: string };
    deviceId: string;
    runtimeId: string;
  }): Promise<boolean>;
  canDeliver(input: {
    actor: { userId: string; workspaceId: string };
    runtimeId: string;
    executionEpoch: number;
  }): Promise<boolean>;
  publish(topic: string, payload: string): Promise<void>;
  subscribe(topic: string, onMessage: (payload: string) => void): Promise<() => Promise<void>>;
}): Hono {
  const app = new Hono();
  app.post("/v1/relay/commands", async (context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const parsed = RelayEnvelopeSchema.safeParse(await context.req.json().catch(() => null));
    if (!parsed.success || parsed.data.workspaceId !== actor.workspaceId)
      return context.json({ error: "Invalid relay envelope" }, 400);
    if (Date.parse(parsed.data.expiresAt) <= Date.now())
      return context.json({ error: "Relay envelope expired" }, 410);
    if (new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength > MAX_LIVE_RELAY_BYTES)
      return context.json({ error: "Relay exceeds the live transport payload limit" }, 413);
    if (!(await dependencies.isTrustedDevice({ actor, deviceId: parsed.data.senderDeviceId })))
      return context.json({ error: "Untrusted device" }, 403);
    if (
      !(await dependencies.canDeliver({
        actor,
        runtimeId: parsed.data.runtimeId,
        executionEpoch: parsed.data.executionEpoch,
      }))
    )
      return context.json({ error: "Desktop Runtime offline" }, 409);
    await dependencies.publish(`relay:${parsed.data.runtimeId}`, JSON.stringify(parsed.data));
    return context.body(null, 202);
  });
  const eventStream = async (context: Context) => {
    const actor = await dependencies.authenticate(context.req.raw);
    if (!actor) return context.json({ error: "Unauthorized" }, 401);
    const deviceId = context.req.query("deviceId");
    const runtimeId = context.req.query("runtimeId");
    if (!deviceId || !runtimeId)
      return context.json({ error: "Runtime identity is required" }, 400);
    if (!(await dependencies.isTrustedRuntime({ actor, deviceId, runtimeId })))
      return context.json({ error: "Untrusted runtime" }, 403);

    return streamSSE(context, async (stream) => {
      const unsubscribe = await dependencies.subscribe(`relay:${runtimeId}`, (payload) => {
        const envelope = parseRelayEnvelope(payload);
        if (!envelope.success) return;
        void stream
          .writeSSE({ event: "relay", id: envelope.data.envelopeId, data: payload })
          .catch(() => undefined);
      });
      await new Promise<void>((resolve) => stream.onAbort(resolve));
      await unsubscribe();
    });
  };
  app.get("/v1/relay/events", eventStream);
  return app;
}

function parseRelayEnvelope(payload: string) {
  try {
    return RelayEnvelopeSchema.safeParse(JSON.parse(payload));
  } catch {
    return RelayEnvelopeSchema.safeParse(null);
  }
}
