// Typing reveal for a freshly arrived answer: each section unfolds, then its text types out, like a streamed reply.

/** Pause in which a new section unfolds before its text starts, the submenu's unfold time. */
export const unfoldMs = 320;
const minSectionMs = 200;

/** How long the text of an answer of `total` characters takes to type, unfold pauses excluded:
 * about 1.5 characters per millisecond, between 1.5 and 4 seconds, independent of the frame rate. */
export function typingDurationMs(total: number): number {
  return Math.min(4000, Math.max(1500, total / 1.5));
}

/** Reading pace on screen (characters per ms), the first screenful it covers, and the longest a reveal takes. */
const readingRate = 0.4, firstScreen = 1000, longestMs = 10000;

/** Characters of an answer of `total` characters typed `elapsed` ms after it arrived, streamed like a chat reply
 * (Gaffer, 2026-10-20: "seperti claude.ai"; measured the same day: 22,012 characters filled the screen in half a second,
 * a flood rather than a stream). The text runs at reading pace; for a long answer the part after the first screen then
 * speeds up evenly, so the reveal still ends within `longestMs` and the view that follows it stays readable. */
export function typedAt(elapsed: number, total: number): number {
  const steady = readingRate * Math.max(0, elapsed), head = firstScreen / readingRate, tail = longestMs - head;
  if (total <= readingRate * longestMs || elapsed <= head) return Math.min(total, steady);
  if (elapsed >= longestMs) return total; // exactly, so rounding never leaves the reveal a fraction short of done
  const finish = 2 * (total - firstScreen) / tail - readingRate; // the pace at the end, rising evenly from readingRate
  const u = Math.min(tail, elapsed - head);
  return Math.min(total, firstScreen + readingRate * u + (finish - readingRate) * u * u / (2 * tail));
}

/** Characters visible per segment once `typed` characters are typed: one continuous stream across the segments, no
 * pause between them, and the segment in progress. */
export function streamAt(lengths: number[], typed: number): { visible: number[]; active: number; done: boolean } {
  let start = 0, active = -1;
  const visible = lengths.map((length, index) => {
    const shown = Math.min(length, Math.max(0, typed - start));
    start += length;
    if (active < 0 && shown < length) active = index;
    return shown;
  });
  return { visible, active: active < 0 ? lengths.length - 1 : active, done: active < 0 };
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

/** A field label ("Keluhan utama", "Kriteria diagnosis"): a short line with no marker and no sentence punctuation. It
 * arrives whole, since it is styled as a label only once complete. */
const isLabel = (line: string) => line.length <= 60 && /^[^\s#-]/.test(line) && !/[.,;:!?]/.test(line);

/** The part of `text` to show once `count` of its characters are typed, streamed word by word like a chat reply
 * (Gaffer, 2026-10-20: "seperti claude.ai"): a line grows a whole word at a time, a field label arrives whole, and a
 * line's leading marker ("- ", "### ", "  Mendukung: ") arrives together with its first word. A table row ("| ... |")
 * arrives whole, so a table grows a row at a time and never shows a half row. */
export function wordsUpTo(text: string, count: number): string {
  if (count >= text.length) return text;
  if (count <= 0) return "";
  const lineStart = text.lastIndexOf("\n", count - 1) + 1;
  const next = text.indexOf("\n", count), lineEnd = next < 0 ? text.length : next;
  // Until a label or a table row is complete, the text ends with the line before it.
  const line = text.slice(lineStart, lineEnd);
  if (line.startsWith("|") || isLabel(line)) return text.slice(0, count === lineEnd ? lineEnd : Math.max(0, lineStart - 1));
  const marker = /^\s*(?:#{1,6} |- (?:\[[ x]\] )?|(?:Mendukung|Menyangkal): )?/.exec(line)?.[0].length ?? 0;
  const space = text.indexOf(" ", Math.max(count, lineStart + marker + 1));
  return text.slice(0, space < 0 || space > lineEnd ? lineEnd : space);
}

/** What the answer card shows while the analysis runs, one step after another. */
export const thinkingSteps = ["Permintaan klinis diterima", "Intensi klinis teridentifikasi", "Oracle aktif", "Konteks klinis pasien dihimpun", "Dokumen medis ditelaah", "Literatur dan pedoman klinis ditelusuri", "Temuan klinis dikorelasikan", "Bukti ilmiah sedang disintesis"];
export const thinkingStepMs = 340;

/** The step in progress `elapsed` ms after the question was sent; the last step holds until the answer. */
export function thinkingStepAt(elapsed: number): number {
  return Math.min(thinkingSteps.length - 1, Math.floor(Math.max(0, elapsed) / thinkingStepMs));
}
