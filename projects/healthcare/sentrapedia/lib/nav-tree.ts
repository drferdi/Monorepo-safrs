// Pure logic for the sidebar tree: where an item sits, which groups the browser remembers as open,
// the one item that is current, and how the keyboard moves through rows.
export type NavShape = { id: string; itemIds: string[] }[];
export type View = { page: "workspace" | "patients" | "lists" | "encounters" } | { page: "patient"; id: string };

const toolIds = ["knowledge", "queue", "templates", "scribe", "settings", "commands"];

export function locate(shape: NavShape, itemId: string | null): { section: string; index: number } | null {
  if (!itemId) return null;
  for (const section of shape) {
    const index = section.itemIds.indexOf(itemId);
    if (index >= 0) return { section: section.id, index };
  }
  return null;
}

/** The open groups, from what the browser kept (UI state only, never patient data). */
export function restoreNavMemory(raw: string | null, shape: NavShape, fallback: string[]): string[] {
  if (!raw) return fallback;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return fallback; }
  const open = data && typeof data === "object" && !Array.isArray(data) ? (data as { open?: unknown }).open : undefined;
  if (!Array.isArray(open)) return fallback;
  return shape.map((section) => section.id).filter((id) => open.includes(id));
}

/** The single item the sidebar marks as current: an open tool, else the page shown, else the open encounter, else Beranda. */
export function activeNavItem({ dialog, view, activeEncounterId }: { dialog: string | null; view: View; activeEncounterId: string | null }): string {
  if (dialog && toolIds.includes(dialog)) return dialog;
  if (view.page === "patients" || view.page === "patient") return "all-patients";
  if (view.page === "lists") return "lists";
  if (view.page === "encounters") return "all-encounters";
  return activeEncounterId ?? "home";
}

export function focusStep(count: number, index: number, key: string): number | null {
  if (!count) return null;
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
