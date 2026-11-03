"use client";

import { chipLabel, chipShortlist } from "../lib/studio";
import type { ModeId } from "../lib/drafts";
import type { Encounter } from "../lib/workspace";

/** The shortlist under the composer: one scrollable row, the active mode pressed, every chip off while an analysis runs. */
export function ChipRow({ encounter, mode, busy, onChip }: { encounter?: Pick<Encounter, "messages">; mode: ModeId; busy: boolean; onChip: (mode: ModeId) => void }) {
  return <div className="chip-row" role="group" aria-label="Mode">{chipShortlist.map((id) => <button key={id} type="button" className="action-chip" aria-pressed={mode === id} disabled={busy} onClick={() => onChip(id)}>{chipLabel(id, encounter)}</button>)}</div>;
}
