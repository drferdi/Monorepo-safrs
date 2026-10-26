// The pure layout of the admission figure: where each cell of the cabinet sits, which faces are open to the room,
// where the card pockets go, and in what order a painter must lay it all down. No drawing happens here.
//
// The object is the unfolded tesseract of Dalí's Crucifixion: a column of four cubes with a cube added to each
// side of the third one, eight cells in all. Each cell is a cabinet of index cards.

export const EDGE = 60;
export type Axis = "x" | "y" | "z";
/** x0, x1, y0, y1, z0, z1 in world units, z up. */
export type Box = readonly [number, number, number, number, number, number];

export interface Cell {
  id: number;
  name: string;
  /** Position on the cell lattice, in whole cells. */
  at: readonly [number, number, number];
  /** The cell the four arms close round: no face of it is open to the room. */
  core?: boolean;
}

export const CELLS: readonly Cell[] = [
  { id: 1, name: "dasar", at: [0, 0, 0] },
  { id: 2, name: "tengah", at: [0, 0, 1] },
  { id: 3, name: "inti", at: [0, 0, 2], core: true },
  { id: 4, name: "puncak", at: [0, 0, 3] },
  { id: 5, name: "lengan +x", at: [1, 0, 2] },
  { id: 6, name: "lengan +y", at: [0, 1, 2] },
  { id: 7, name: "lengan -x", at: [-1, 0, 2] },
  { id: 8, name: "lengan -y", at: [0, -1, 2] },
];

/** The cells a visitor can see and the figure can light, in the order the tour walks them. */
export const TOUR = CELLS.filter((cell) => !cell.core).map((cell) => cell.id);

/** What is true of a tesseract itself, shown on the card. */
export const TESSERACT = { cells: 8, squares: 24, edges: 32, vertices: 16 } as const;

const occupied = (x: number, y: number, z: number) => CELLS.some((cell) => cell.at[0] === x && cell.at[1] === y && cell.at[2] === z);

/** The camera looks from +x, +y and above, so those are the only faces a figure can show. */
export function exposed(cell: Cell, axis: Axis): boolean {
  const [x, y, z] = cell.at;
  return !occupied(x + (axis === "x" ? 1 : 0), y + (axis === "y" ? 1 : 0), z + (axis === "z" ? 1 : 0));
}

export function boxOf(cell: Cell): Box {
  const [x, y, z] = cell.at;
  const half = EDGE / 2;
  return [x * EDGE - half, x * EDGE + half, y * EDGE - half, y * EDGE + half, z * EDGE, z * EDGE + EDGE];
}

export const centreOf = (cell: Cell): readonly [number, number, number] => {
  const box = boxOf(cell);
  return [(box[0] + box[1]) / 2, (box[2] + box[3]) / 2, (box[4] + box[5]) / 2];
};

/** One index card in its pouch. All sizes are along the face: u across, v up. */
export const POCKET = {
  width: 21,
  height: 14,
  /** The pouch's front wall covers the lower part of the pocket, so the card shows above it. */
  wall: 8,
  gap: 7,
  rows: [5, 32] as const,
  thick: 0.9,
  card: { width: 17, height: 17, rest: 2 },
  rise: 5,
} as const;

export interface Pocket {
  index: number;
  /** Across the face, in world units. */
  u0: number;
  u1: number;
  /** Up the face, in world units. */
  v0: number;
  v1: number;
}

/** The plane of a cell's open face along its axis, and the centre of that face across it. */
export function faceOf(cell: Cell, axis: "x" | "y") {
  const [x, y] = cell.at;
  return axis === "x" ? { plane: x * EDGE + EDGE / 2, centre: y * EDGE } : { plane: y * EDGE + EDGE / 2, centre: x * EDGE };
}

export function pocketsOf(cell: Cell, axis: "x" | "y"): Pocket[] {
  const { centre } = faceOf(cell, axis);
  const z0 = cell.at[2] * EDGE;
  const half = POCKET.gap / 2;
  const columns = [
    [centre - half - POCKET.width, centre - half],
    [centre + half, centre + half + POCKET.width],
  ] as const;
  const out: Pocket[] = [];
  for (const row of POCKET.rows) {
    for (const [u0, u1] of columns) out.push({ index: out.length, u0, u1, v0: z0 + row, v1: z0 + row + POCKET.height });
  }
  return out;
}

const SEPARATED = 1e-6;
const behind = (a: Box, b: Box) => a[1] <= b[0] + SEPARATED || a[3] <= b[2] + SEPARATED || a[5] <= b[4] + SEPARATED;

export const overlaps = (a: Box, b: Box) => a[0] < b[1] - SEPARATED && b[0] < a[1] - SEPARATED && a[2] < b[3] - SEPARATED && b[2] < a[3] - SEPARATED && a[4] < b[5] - SEPARATED && b[4] < a[5] - SEPARATED;

/**
 * Paint order for axis-aligned boxes seen from +x, +y and above.
 *
 * Two boxes that do not overlap are always separated by a plane along one axis, and the viewer sits on the +side of
 * every axis, so the box on the lower side of that plane is behind. When two axes disagree (a diagonal pair) no
 * line of sight can cross both boxes, so the pair needs no order at all. What is left is a graph with no cycle
 * for this layout; a cycle, or a pair that overlaps, throws instead of drawing a wrong picture.
 */
export function paintOrder<T extends { key: string; box: Box }>(items: readonly T[], depth: (item: T) => number): T[] {
  const count = items.length;
  const after: number[][] = Array.from({ length: count }, () => []);
  const waiting = new Array<number>(count).fill(0);
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const a = items[i]!;
      const b = items[j]!;
      if (overlaps(a.box, b.box)) throw new Error(`tesseract: ${a.key} and ${b.key} pass through each other`);
      const aBehind = behind(a.box, b.box);
      const bBehind = behind(b.box, a.box);
      if (aBehind && !bBehind) { after[i]!.push(j); waiting[j]!++; }
      else if (bBehind && !aBehind) { after[j]!.push(i); waiting[i]!++; }
    }
  }
  const ready = items.map((_, index) => index).filter((index) => waiting[index] === 0);
  const out: T[] = [];
  while (ready.length) {
    ready.sort((p, q) => depth(items[q]!) - depth(items[p]!));
    const next = ready.pop()!;
    out.push(items[next]!);
    for (const follower of after[next]!) if (--waiting[follower]! === 0) ready.push(follower);
  }
  if (out.length !== count) throw new Error("tesseract: the paint order has a cycle");
  return out;
}
