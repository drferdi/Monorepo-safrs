// Typing reveal for a freshly arrived answer: each section unfolds, then its text types out, like a streamed reply.

/** Pause in which a new section unfolds before its text starts, the submenu's unfold time. */
export const unfoldMs = 320;
const minSectionMs = 200;

/** How long the text of an answer of `total` characters takes to type, unfold pauses excluded:
 * about 1.5 characters per millisecond, between 1.5 and 4 seconds, independent of the frame rate. */
export function typingDurationMs(total: number): number {
  return Math.min(4000, Math.max(1500, total / 1.5));
}

/** Characters visible per segment `elapsed` ms after the answer arrived, and the segment in progress.
 * Segment 0 (the title) types at once; every later segment first unfolds for `unfoldMs`, then types
 * in a share of the typing time proportional to its length, at least `minSectionMs`. */
export function revealAt(lengths: number[], elapsed: number): { visible: number[]; active: number; unfolding: boolean; done: boolean } {
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const typing = typingDurationMs(total);
  let start = 0, active = -1, unfolding = false;
  const visible = lengths.map((length, index) => {
    if (!length) return 0;
    const unfold = index ? unfoldMs : 0, span = Math.max(minSectionMs, typing * length / total);
    const t = elapsed - start - unfold;
    if (active < 0 && t < span) { active = index; unfolding = t < 0; }
    start += unfold + span;
    return Math.round(length * Math.min(1, Math.max(0, t / span)));
  });
  return { visible, active: active < 0 ? lengths.length - 1 : active, unfolding, done: active < 0 };
}

/** What the answer card shows while the analysis runs, one step after another. */
export const thinkingSteps = ["Permintaan klinis diterima", "Intensi klinis teridentifikasi", "Sentra Oracle aktif", "Konteks klinis pasien dihimpun", "Dokumen medis ditelaah", "Literatur dan pedoman klinis ditelusuri", "Temuan klinis dikorelasikan", "Bukti ilmiah sedang disintesis"];
export const thinkingStepMs = 340;

/** The step in progress `elapsed` ms after the question was sent; the last step holds until the answer. */
export function thinkingStepAt(elapsed: number): number {
  return Math.min(thinkingSteps.length - 1, Math.floor(Math.max(0, elapsed) / thinkingStepMs));
}
