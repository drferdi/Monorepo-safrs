import type { SyncPushResult } from "./contract";
import type { MergeResult } from "./merge";

// Indonesian, sentence case, no numbering and no claims (the copy rule in .agents/AGENT-CONTEXT.md section 11).
// A held document is the part that matters: it was not sent, nothing was rewritten to make it sendable, and it
// exists only in this browser. Saying so is the whole point of reporting the count.

export function pushMessage(result: SyncPushResult): string {
  const saved = result.saved.length;
  const held = result.held.length;
  if (!saved && !held) return "Tidak ada dokumen baru untuk dikirim.";
  const heldPart = `${held} ditahan karena memuat identitas dan tetap hanya di browser ini.`;
  if (!saved) return `Tidak ada dokumen yang dikirim: ${heldPart}`;
  const savedPart = `${saved} dokumen tersimpan di server`;
  return held ? `${savedPart}, ${heldPart}` : `${savedPart}.`;
}

export function pullMessage(result: Pick<MergeResult, "added" | "skipped" | "unknownFormat">): string {
  const parts: string[] = [];
  if (result.added.length) parts.push(`${result.added.length} dokumen diambil dari server`);
  if (result.skipped.length) parts.push(`${result.skipped.length} dokumen sudah ada, versi di browser ini dipertahankan`);
  if (result.unknownFormat.length) parts.push(`${result.unknownFormat.length} dokumen memakai format yang belum dikenal versi ini dan dilewati`);
  return parts.length ? `${parts.join(", ")}.` : "Tidak ada dokumen di server.";
}

export function syncFailureMessage(reason: "unavailable" | "signed-out" | "failed"): string {
  if (reason === "unavailable") return "Sinkronisasi server belum aktif di instance ini. Workspace tetap tersimpan di browser.";
  if (reason === "signed-out") return "Sesi sudah berakhir. Silakan masuk kembali untuk menyinkronkan.";
  return "Sinkronisasi gagal. Data lokal tidak berubah, silakan coba kembali.";
}
