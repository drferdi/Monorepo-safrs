import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";
import type { TelemetryConfig } from "./config.ts";

let sdkInstance: NodeSDK | null = null;

/**
 * Initialize the OpenTelemetry Node SDK once. Safe to call multiple times:
 * subsequent calls return the existing SDK (or a no-op when disabled).
 *
 * Must run before the app imports instrumented paths (HTTP client/server,
 * Prisma). Returns null when disabled so callers can short-circuit.
 */
export function initTelemetry(config: TelemetryConfig): NodeSDK | null {
  if (config.disabled) return null;
  if (sdkInstance) return sdkInstance;

  const sdk = new NodeSDK({
    serviceName: config.serviceName,
    traceExporter: new OTLPTraceExporter({ url: config.otlpEndpoint }),
    instrumentations: [new HttpInstrumentation(), new PrismaInstrumentation()],
  });

  sdk.start();
  sdkInstance = sdk;
  return sdk;
}

/**
 * Gracefully flush and stop the SDK (used on server shutdown / SIGTERM).
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!sdkInstance) return;
  const sdk = sdkInstance;
  sdkInstance = null;
  await sdk.shutdown();
}
