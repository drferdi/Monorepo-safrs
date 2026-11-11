// The pure layout of the admission figure: a card-index cabinet, one drawer per category of the knowledge base,
// with as many index cards in each drawer as its entries deserve. No drawing happens here.
//
// The counts are those of theoracle/ssot/sentrapedia-knowledge-ssot.json; tests/cabinet-figure.test.ts holds them
// to that file, so the figure cannot drift from the knowledge it stands for.

export type Axis = "x" | "y" | "z";
/** x0, x1, y0, y1, z0, z1 in world units, z up. The viewer stands on the +x, +y side, above. */
export type Box = readonly [number, number, number, number, number, number];

export interface Category {
  name: string;
  entries: number;
}

/** Alphabetical, as a real cabinet files them. */
export const CATEGORIES: readonly Category[] = [
  { name: "Cedera dan Keracunan", entries: 23 },
  { name: "Darah dan Imunologi", entries: 6 },
  { name: "Endokrin, Nutrisi, dan Metabolik", entries: 18 },
  { name: "Faktor Status Kesehatan", entries: 1 },
  { name: "Gejala dan Temuan Abnormal", entries: 7 },
  { name: "Ginjal dan Saluran Kemih-Kelamin", entries: 16 },
  { name: "Infeksi dan Parasit", entries: 69 },
  { name: "Jiwa dan Perilaku", entries: 13 },
  { name: "Kardiovaskular", entries: 19 },
  { name: "Kehamilan dan Persalinan", entries: 15 },
  { name: "Kode Khusus (COVID-19)", entries: 1 },
  { name: "Kongenital", entries: 3 },
  { name: "Kulit", entries: 22 },
  { name: "Mata", entries: 23 },
  { name: "Muskuloskeletal", entries: 9 },
  { name: "Neoplasma", entries: 12 },
  { name: "Pencernaan", entries: 26 },
  { name: "Penyakit Anak", entries: 1 },
  { name: "Penyakit Dalam", entries: 4 },
  { name: "Penyakit Jiwa", entries: 1 },
  { name: "Perinatal", entries: 5 },
  { name: "Pernapasan", entries: 24 },
  { name: "Saraf", entries: 11 },
  { name: "Telinga", entries: 6 },
];

export const ENTRIES = CATEGORIES.reduce((sum, category) => sum + category.entries, 0);

/** One drawn card stands for this many entries; a drawer holds at least one and at most CARDS_MAX. */
export const ENTRIES_PER_CARD = 8;
export const CARDS_MAX = 8;
export const cardsFor = (entries: number) => Math.min(CARDS_MAX, Math.max(1, Math.ceil(entries / ENTRIES_PER_CARD)));

/** The carcass: a box whose +x face carries the drawers. */
export const CARCASS = { x0: -30, x1: 30, y0: -57, y1: 57, z0: 0, z1: 98 } as const;
export const FRONT = CARCASS.x1;
export const COLUMNS = 4;
export const ROWS = 6;

export const DRAWER = {
  /** The opening, which the front fills: along y and up z. */
  width: 26,
  height: 14,
  gap: 2,
  /** How far the box reaches back into the carcass, and how far it slides out. */
  depth: 50,
  pull: 34,
  /** The front overlays the opening by this much; the pull stands this far off the front. */
  front: 1.2,
  reach: 4.6,
  wall: 1,
  /** Floor at z0 + 1, walls 5 above it. */
  floor: 1,
  wallHeight: 5,
  card: { thick: 0.6, height: 6, inset: 3, pitch: 3.6, tab: 2, tabWidth: 4 },
  /** Cards rise this far; their tabs then stop 0.5 under the opening's lintel, so nothing leaks past the clip. */
  rise: 3.5,
} as const;

export interface Drawer {
  id: number;
  category: Category;
  cards: number;
  column: number;
  row: number;
  /** The opening in the carcass face: y0, y1 across and z0, z1 up. */
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

const pitchY = DRAWER.width + DRAWER.gap;
const pitchZ = DRAWER.height + DRAWER.gap;

/** Column 0 is at the +y end, which the camera puts on the left of the face, so reading order is alphabetical. */
export const DRAWERS: readonly Drawer[] = CATEGORIES.map((category, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const y1 = CARCASS.y1 - DRAWER.gap - column * pitchY;
  const z1 = CARCASS.z1 - DRAWER.gap - row * pitchZ;
  return { id: index + 1, category, cards: cardsFor(category.entries), column, row, y0: y1 - DRAWER.width, y1, z0: z1 - DRAWER.height, z1 };
});

/** The box of a drawer at rest, including the front and the pull. */
export const drawerBox = (drawer: Drawer): Box => [FRONT - DRAWER.depth, FRONT + DRAWER.reach, drawer.y0, drawer.y1, drawer.z0, drawer.z1];

/** Where the rear face of the i-th card stands at rest: the first card is deepest, the last nearest the front. */
export function cardX(drawer: Drawer, index: number): number {
  const nearest = FRONT - DRAWER.wall - 1.2 - DRAWER.card.thick;
  return nearest - (drawer.cards - 1 - index) * DRAWER.card.pitch;
}

/** Each card's index tab sits at a different place along the card, as a real set of dividers does. */
export const tabOffset = (index: number) => ((index % 4) - 1.5) * 5;

/**
 * The order a painter lays the drawers down in. Two drawers are separated by a plane along y (different columns) or
 * z (different rows), and the viewer is on the +side of both, so the one with the lower coordinate is behind. A
 * diagonal pair needs no order. Columns from -y to +y, rows from the bottom, satisfies every pair at once.
 */
export const paintOrder = (drawers: readonly Drawer[]) => [...drawers].sort((a, b) => a.y0 - b.y0 || a.z0 - b.z0);

/** True when a is wholly behind b for this camera: a plane along some axis separates them with a on the low side. */
export const behind = (a: Box, b: Box) => a[1] <= b[0] || a[3] <= b[2] || a[5] <= b[4];

/** The tour walks every drawer in filing order. */
export const TOUR = DRAWERS.map((drawer) => drawer.id);
