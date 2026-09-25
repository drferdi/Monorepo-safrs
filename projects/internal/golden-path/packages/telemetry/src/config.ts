export type TelemetryConfig = {
  /** Service name reported to the collector (e.g. "safrs-web"). */
  serviceName: string;
  /** OTLP HTTP endpoint, e.g. "http://localhost:4318/v1/traces". */
  otlpEndpoint: string;
  /** When true, the SDK is not started (local short-circuit). */
  disabled: boolean;
};

/**
 * Load telemetry configuration from environment variables, with safe
 * defaults. No credentials are accepted here; the OTLP endpoint is a plain
 * HTTP URL.
 */
export function loadTelemetryConfig(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<TelemetryConfig> = {},
): TelemetryConfig {
  const disabled =
    overrides.disabled ??
    (env.OTEL_SDK_DISABLED === "1" || env.OTEL_SDK_DISABLED === "true");
  return {
    serviceName: overrides.serviceName ?? env.OTEL_SERVICE_NAME ?? "safrs-app",
    otlpEndpoint:
      overrides.otlpEndpoint ??
      env.OTEL_EXPORTER_OTLP_ENDPOINT ??
      "http://localhost:4318/v1/traces",
    disabled,
  };
}
