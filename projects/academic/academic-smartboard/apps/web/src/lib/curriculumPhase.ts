/** Static grade→phase map for Kurikulum Nasional 2026 (Permendikdasmen 12/2024).
 *  SD 1–2 = A · SD 3–4 = B · SD 5–6 = C · SMP = D · SMA 10 = E · SMA 11–12 = F. */

export const PHASES = ["A", "B", "C", "D", "E", "F"] as const;

export type Phase = (typeof PHASES)[number];

export function phaseForGrade(
  stage: string | null | undefined,
  order: number | null | undefined,
): Phase | null {
  if (!stage || !Number.isFinite(Number(order))) return null;
  const n = Number(order);
  if (stage === "SD") return n <= 2 ? "A" : n <= 4 ? "B" : "C";
  if (stage === "SMP") return "D";
  if (stage === "SMA") return n <= 10 ? "E" : "F";
  return null;
}
