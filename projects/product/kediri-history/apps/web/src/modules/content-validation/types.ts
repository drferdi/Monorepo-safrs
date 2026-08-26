/** Bentuk temuan yang sama untuk setiap validator, supaya laporan dapat digabung. */
export type ValidationSeverity = "critical" | "warning";

export interface ValidationFinding {
  readonly rule: string;
  readonly severity: ValidationSeverity;
  readonly subject: string;
  readonly message: string;
}

export interface ValidationReport {
  readonly ok: boolean;
  readonly findings: readonly ValidationFinding[];
  readonly checked: number;
}

export function toReport(
  findings: readonly ValidationFinding[],
  checked: number,
): ValidationReport {
  return {
    ok: findings.every((finding) => finding.severity !== "critical"),
    findings,
    checked,
  };
}
