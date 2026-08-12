import { describe, expect, it } from "vitest";
import { loadTelemetryConfig, type TelemetryConfig } from "./config.js";

describe("loadTelemetryConfig", () => {
  it("defaults to a local endpoint and enables the SDK", () => {
    const config = loadTelemetryConfig({});
    expect(config.otlpEndpoint).toBe("http://localhost:4318/v1/traces");
    expect(config.serviceName).toBe("safrs-app");
    expect(config.disabled).toBe(false);
  });

  it("reads service name and endpoint from the environment", () => {
    const config = loadTelemetryConfig({
      OTEL_SERVICE_NAME: "safrs-web",
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://collector:4318/v1/traces",
    });
    expect(config.serviceName).toBe("safrs-web");
    expect(config.otlpEndpoint).toBe("http://collector:4318/v1/traces");
  });

  it("disables the SDK via OTEL_SDK_DISABLED", () => {
    const config = loadTelemetryConfig({ OTEL_SDK_DISABLED: "1" });
    expect(config.disabled).toBe(true);
  });

  it("lets explicit overrides win over the environment", () => {
    const config: TelemetryConfig = loadTelemetryConfig(
      { OTEL_SERVICE_NAME: "env-name" },
      { serviceName: "override-name" },
    );
    expect(config.serviceName).toBe("override-name");
  });
});
