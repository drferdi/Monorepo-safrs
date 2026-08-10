const secretAssignment =
  /\b([A-Z][A-Z0-9_]*(?:PASSWORD|TOKEN|KEY|SECRET|DATABASE_URL)[A-Z0-9_]*)=([^\s]+)/gu;
const urlWithCredentials =
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@[^\s]+/giu;

export function redactText(value, suppliedEnvironment = {}) {
  let redacted = String(value ?? "");
  redacted = redacted.replace(urlWithCredentials, "[URL DISEMBUNYIKAN]");
  redacted = redacted.replace(secretAssignment, "$1=[RAHASIA DISEMBUNYIKAN]");

  for (const environmentValue of Object.values(suppliedEnvironment)) {
    if (typeof environmentValue === "string" && environmentValue.length > 0) {
      redacted = redacted.replaceAll(
        environmentValue,
        "[NILAI ENV DISEMBUNYIKAN]",
      );
    }
  }

  return redacted;
}

export function renderDoctorReport(checks, suppliedEnvironment = {}) {
  return checks
    .map((check) => {
      const state = check.ok
        ? "SIAP"
        : check.severity === "unsafe"
          ? "DITOLAK"
          : "BELUM SIAP";
      const firstLine = `[${check.area}] ${state}: ${check.summary}`;
      return check.ok ? firstLine : `${firstLine}\n  Solusi: ${check.recovery}`;
    })
    .map((line) => redactText(line, suppliedEnvironment))
    .join("\n");
}

export function renderTechnicalReport(checks, suppliedEnvironment = {}) {
  return checks
    .filter((check) => !check.ok && check.technical)
    .map((check) => `[${check.area}] ${check.technical}`)
    .map((line) => redactText(line, suppliedEnvironment))
    .join("\n");
}
