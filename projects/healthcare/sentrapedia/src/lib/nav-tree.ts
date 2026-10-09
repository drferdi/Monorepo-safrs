// Keyboard movement through a list of rows (the composer's Mode picker).
export function focusStep(count: number, index: number, key: string): number | null {
  if (!count) return null;
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
