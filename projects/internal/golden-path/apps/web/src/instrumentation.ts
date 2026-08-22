import { initTelemetry, loadTelemetryConfig } from "@safrs/telemetry";

/**
 * Next.js instrumentation hook. Runs once when the server starts, before any
 * route or module is imported, so HTTP and Prisma auto-instrumentation can
 * observe the full request chain.
 *
 * Disabled by default unless OTEL_SDK_DISABLED is unset and a collector is
 * reachable (start `docker compose -f compose.telemetry.yaml up -d jaeger`).
 */
export async function register() {
  const config = loadTelemetryConfig();
  initTelemetry(config);
}
