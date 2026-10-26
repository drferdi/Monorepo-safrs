import type { ReactNode } from "react";
import * as k from "../../../lib/anatomy/iso-kit";
import { Dots, FaceText, Line, Solid } from "../../../lib/anatomy/draw";
import { CELLS, EDGE, POCKET, boxOf, centreOf, exposed, faceOf, paintOrder, pocketsOf, type Box, type Cell } from "./layout";

// The figure: a card cabinet built as the unfolded tesseract, eight cubic cells with a pouch of index cards on every
// open face. It is drawn once on the server and reaches the browser as markup; motion.tsx only moves what is marked.

export const WIDTH = 560;
export const HEIGHT = 640;

const PLATE = { x: -62, y: -62, w: 124, d: 124, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const KNOB = { r: 5, h: 4 };

const visible = CELLS.filter((cell) => !cell.core);

export const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...visible.flatMap((cell) => {
      const [x0, , y0, , z0, z1] = boxOf(cell);
      return k.boxCorners({ x: x0, y: y0, w: EDGE, d: EDGE, r: 0 }, z0, z1 + KNOB.h);
    }),
  ],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 40, elevation: 30 },
);

interface Item {
  key: string;
  box: Box;
  node: ReactNode;
}

type Face = { axis: "x" | "y"; plane: number };
type Rect = [u0: number, u1: number, v0: number, v1: number];

const at = (point: k.Point3) => k.iso(point, P);
const world = (face: Face, n: number, u: number, v: number): k.Point3 => (face.axis === "x" ? [face.plane + n, u, v] : [u, face.plane + n, v]);
const boxOn = (face: Face, n0: number, n1: number, [u0, u1, v0, v1]: Rect): Box =>
  face.axis === "x" ? [face.plane + n0, face.plane + n1, u0, u1, v0, v1] : [u0, u1, face.plane + n0, face.plane + n1, v0, v1];

/** A thin plate standing on a vertical face: n is how far it stands off the face. */
function plateOn(face: Face, n0: number, n1: number, [u0, u1, v0, v1]: Rect) {
  const plan = face.axis === "x" ? { x: face.plane + n0, y: u0, w: n1 - n0, d: u1 - u0, r: 0.35 } : { x: u0, y: face.plane + n0, w: u1 - u0, d: n1 - n0, r: 0.35 };
  return k.slabOf(plan, v0, v1 - v0, P, 1, 0);
}

const outline = (face: Face, n: number, [u0, u1, v0, v1]: Rect) =>
  k.pathOf([world(face, n, u0, v0), world(face, n, u1, v0), world(face, n, u1, v1), world(face, n, u0, v1)].map(at), true);

const planOf = (cell: Cell) => {
  const [x0, , y0] = boxOf(cell);
  return { x: x0, y: y0, w: EDGE, d: EDGE, r: 3 };
};

const items: Item[] = [];
const put = (item: Item) => items.push(item);
const wrap = (cell: number, content: ReactNode) => <g data-cell={cell || undefined}>{content}</g>;

function base() {
  const feet = k
    .corners(PLATE, 18)
    .sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
    .map(([x, y]) => (
      <g key={`${x},${y}`}>
        <Solid paths={k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28)} tone="lo" />
        <Solid paths={k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28)} tone="mid" />
      </g>
    ));
  const screws = k.corners(PLATE, 10);
  put({
    key: "base",
    box: [PLATE.x, PLATE.x + PLATE.w, PLATE.y, PLATE.y + PLATE.d, -PLATE_H - FOOT_H, 0],
    node: (
      <g>
        <path className="iso-halo" d={k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)} />
        {feet}
        <Solid paths={k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6)} tone="mid" />
        <Line d={k.planOutline(k.insetPlan(PLATE, 5), 0, P)} tone="lo" />
        <Line d={screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join("")} tone="lo" />
        <Dots points={screws.map(([x, y]) => at([x, y, 0]))} size={0.5} />
      </g>
    ),
  });

  const strip = { x: -40, y: 42, w: 80, d: 7, r: 1 };
  const ticks = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  put({
    key: "ruler",
    box: [strip.x, strip.x + strip.w, strip.y, strip.y + strip.d, 0, 0.6],
    node: (
      <g>
        <Solid paths={k.slabOf(strip, 0, 0.6, P, 3)} tone="lo" crease="none" />
        <Line d={ticks.minor} tone="lo" />
        <Line d={ticks.major} tone="mid" />
        <Dots points={[at([strip.x + 1.6, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3.5, 0.6])]} size={0.45} />
      </g>
    ),
  });

  const plate = { x: 41, y: -19, w: 12, d: 38, r: 1.5 };
  put({
    key: "label",
    box: [plate.x, plate.x + plate.w, plate.y, plate.y + plate.d, 0, 0.8],
    node: (
      <g>
        <Solid paths={k.slabOf(plate, 0, 0.8, P, 4)} tone="mid" crease="none" />
        <Line d={k.planOutline(k.insetPlan(plate, 1.4), 0.8, P)} tone="faint" />
        <FaceText transform={k.topMatrix([plate.x + 3.6, plate.y + plate.d / 2], 0.8, P, "y")} size={4.4} tone="hi" anchor="middle">
          8 SEL
        </FaceText>
        <Dots points={[at([plate.x + 2.6, plate.y + 2.6, 0.8]), at([plate.x + 2.6, plate.y + plate.d - 2.6, 0.8])]} size={0.4} />
      </g>
    ),
  });
}

function body(cell: Cell) {
  const plan = planOf(cell);
  const [, , , , z0, z1] = boxOf(cell);
  const trims: ReactNode[] = [];
  for (const axis of ["x", "y"] as const) {
    if (!exposed(cell, axis)) continue;
    const { plane, centre } = faceOf(cell, axis);
    const face: Face = { axis, plane };
    const half = EDGE / 2;
    trims.push(<Line key={`inlay-${axis}`} d={outline(face, 0, [centre - half + 2.5, centre + half - 2.5, z0 + 2.5, z1 - 2.5])} tone="faint" />);
    const screws = [-1, 1].flatMap((du) => [z0 + 4.4, z1 - 4.4].map((v) => at(world(face, 0, centre + du * (half - 4.4), v))));
    trims.push(<Dots key={`screws-${axis}`} points={screws} size={0.5} />);
  }
  if (exposed(cell, "z")) {
    const [cx, cy] = centreOf(cell);
    trims.push(<Line key="inlay-z" d={k.planOutline(k.insetPlan(plan, 3), z1, P, 4)} tone="faint" />);
    const screws = k.corners(plan, 6).map(([x, y]) => at([x, y, z1]));
    trims.push(<Dots key="screws-z" points={screws} size={0.5} />);
    put({
      key: `knob-${cell.id}`,
      box: [cx - KNOB.r, cx + KNOB.r, cy - KNOB.r, cy + KNOB.r, z1, z1 + KNOB.h],
      node: wrap(
        cell.id,
        <g>
          <Solid paths={k.cylinder(cx, cy, KNOB.r, z1, KNOB.h, P, 32)} tone="mid" cell={cell.id} />
          <Line d={k.knurl(cx, cy, KNOB.r, z1, z1 + KNOB.h, 36, P)} tone="lo" />
          <Line d={k.lineOnTop([cx, cy], [cx + KNOB.r, cy], z1 + KNOB.h, P)} tone="hi" />
          <Dots points={[at([cx, cy, z1 + KNOB.h])]} size={0.5} tone="hi" />
        </g>,
      ),
    });
  }
  put({
    key: `body-${cell.id}`,
    box: boxOf(cell),
    node: wrap(
      cell.id,
      <g>
        <Solid paths={k.slabOf(plan, z0, EDGE, P, 4, 0.8)} tone="mid" cell={cell.id} />
        {trims}
      </g>,
    ),
  });
}

function pockets(cell: Cell, axis: "x" | "y") {
  const { plane } = faceOf(cell, axis);
  const face: Face = { axis, plane };
  const { thick, card, wall, rise } = POCKET;
  for (const pocket of pocketsOf(cell, axis)) {
    const { u0, u1, v0 } = pocket;
    const mid = (u0 + u1) / 2;
    const cardRect: Rect = [mid - card.width / 2, mid + card.width / 2, v0 + card.rest, v0 + card.rest + card.height];
    const wallRect: Rect = [u0, u1, v0, v0 + wall];
    const top = cardRect[3];
    const rules = [4, 7.6].map((below, line) => (
      <Line key={line} d={k.segment(world(face, thick - 0.05, cardRect[0] + 2.4, top - below), world(face, thick - 0.05, cardRect[1] - (line ? 6 : 2.4), top - below), P)} tone="lo" free />
    ));
    const key = `${cell.id}${axis}${pocket.index}`;
    put({
      key: `card-${key}`,
      box: boxOn(face, 0.05, thick, [cardRect[0], cardRect[1], cardRect[2], cardRect[3] + rise]),
      node: wrap(
        cell.id,
        <g data-card={cell.id} data-slot={pocket.index}>
          <Solid paths={plateOn(face, 0.05, thick - 0.05, cardRect)} tone="hi" cell={cell.id} />
          {rules}
        </g>,
      ),
    });
    put({ key: `wall-${key}`, box: boxOn(face, thick, thick * 2, wallRect), node: wrap(cell.id, <Solid paths={plateOn(face, thick, thick * 2, wallRect)} tone="mid" />) });
  }
}

/** A strap hinge across the seam between two stacked cells, in the gap between the two columns of pouches. */
function hinges() {
  const lower = CELLS[0]!;
  const seam = boxOf(lower)[5];
  for (const axis of ["x", "y"] as const) {
    const { plane, centre } = faceOf(lower, axis);
    const face: Face = { axis, plane };
    const rect: Rect = [centre - 2.5, centre + 2.5, seam - 7, seam + 7];
    put({
      key: `hinge-${axis}`,
      box: boxOn(face, 0, POCKET.thick, rect),
      node: (
        <g>
          <Solid paths={plateOn(face, 0, POCKET.thick, rect)} tone="mid" />
          <Dots points={[seam - 4.5, seam + 4.5].map((v) => at(world(face, POCKET.thick, centre, v)))} size={0.45} />
        </g>
      ),
    });
  }
}

base();
for (const cell of visible) {
  body(cell);
  for (const axis of ["x", "y"] as const) if (exposed(cell, axis)) pockets(cell, axis);
}
hinges();

const ordered = paintOrder(items, (item) => k.depthOf([(item.box[0] + item.box[1]) / 2, (item.box[2] + item.box[3]) / 2, (item.box[4] + item.box[5]) / 2], P));

export const FIGURE = {
  items: ordered,
  cards: items.filter((item) => item.key.startsWith("card-")).length,
  cells: visible.length,
};

const [riseX, riseY] = k.axisVector(P, [0, 0, POCKET.rise]);

export function TesseractArt() {
  return (
    <svg className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} focusable="false" aria-hidden="true" data-tesseract="" data-rise={`${Math.round(riseX * 100) / 100},${Math.round(riseY * 100) / 100}`}>
      {ordered.map((item) => (
        <g key={item.key}>{item.node}</g>
      ))}
    </svg>
  );
}
