// Pure logic for the sidebar's Mulai / Alat kerja / Sistem tree: where the open dialog sits,
// what the browser remembers between visits, and how the keyboard moves through rows.
export type NavShape = { id: string; itemIds: string[] }[];
export interface NavMemory { open: string; used: Record<string, number> }

export function locate(shape: NavShape, itemId: string | null): { section: string; index: number } | null {
  if (!itemId) return null;
  for (const section of shape) {
    const index = section.itemIds.indexOf(itemId);
    if (index >= 0) return { section: section.id, index };
  }
  return null;
}

export function restoreNavMemory(raw: string | null, shape: NavShape, fallback: string): NavMemory {
  const empty = { open: fallback, used: {} };
  if (!raw) return empty;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return empty; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return empty;
  const { open, used } = data as { open?: unknown; used?: unknown };
  const memory: NavMemory = { open: shape.some((section) => section.id === open) ? open as string : fallback, used: {} };
  if (used && typeof used === "object" && !Array.isArray(used)) {
    for (const section of shape) {
      const index = (used as Record<string, unknown>)[section.id];
      if (Number.isInteger(index) && (index as number) >= 0 && (index as number) < section.itemIds.length) memory.used[section.id] = index as number;
    }
  }
  return memory;
}

export function focusStep(count: number, index: number, key: string): number | null {
  if (!count) return null;
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
