const EVAL_STATUSES = new Set([
  "menunggu_evaluasi",
  "menunggu_verifikasi",
  "berlangsung",
  "terverifikasi",
]);

export function filterSessionsForEval<T extends { status: string }>(
  rows: T[],
): T[] {
  return rows.filter((r) => EVAL_STATUSES.has(r.status));
}

export function averageMetric(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
