import type { ReactNode } from "react";
import * as k from "../../../lib/anatomy/iso-kit";
import { Dots, FaceText, Line, Solid } from "../../../lib/anatomy/draw";
import { CARCASS, DRAWER, DRAWERS, ENTRIES, FRONT, cardX, paintOrder, tabOffset, type Drawer } from "./layout";

// The figure: a card-index cabinet on a plinth, twenty-four drawers in its face, each holding the index cards of one
// category. It is drawn once on the server and reaches the browser as markup; motion.tsx only moves what is marked.
//
// Each drawer is drawn whole, box and cards and front, inside a clip that is the silhouette of the room it can slide
// into. At rest the box is behind the carcass face, and every point of it either lands inside the opening (where the
// front covers it) or outside the clip, so the carcass needs no hole and nothing shows through it.

export const WIDTH = 560;
export const HEIGHT = 640;

const PLINTH = { x: -40, y: -67, w: 82, d: 134, r: 6 };
const PLINTH_H = 11;
const FOOT_H = 5;
const CORNICE = { x: CARCASS.x0 - 2.5, y: CARCASS.y0 - 2.5, w: CARCASS.x1 - CARCASS.x0 + 5, d: CARCASS.y1 - CARCASS.y0 + 5, r: 2 };
const CORNICE_H = 4;
const CARCASS_PLAN = { x: CARCASS.x0, y: CARCASS.y0, w: CARCASS.x1 - CARCASS.x0, d: CARCASS.y1 - CARCASS.y0, r: 1.5 };

export const P = k.fitProjection(
  [...k.boxCorners(PLINTH, -PLINTH_H - FOOT_H, 0), ...k.boxCorners(CORNICE, CARCASS.z1, CARCASS.z1 + CORNICE_H), [FRONT + DRAWER.pull + DRAWER.reach, CARCASS.y1, CARCASS.z1]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 27, elevation: 28 },
);

type Rect = [u0: number, u1: number, v0: number, v1: number];

const at = (point: k.Point3) => k.iso(point, P);
/** A point on a plane x = FRONT + n, u along y and v up. */
const onFace = (n: number, u: number, v: number): k.Point3 => [FRONT + n, u, v];
/** A thin plate standing on the drawer front: n0 to n1 is how far it stands off the face. */
const plateOn = (n0: number, n1: number, [u0, u1, v0, v1]: Rect) => k.slabOf({ x: FRONT + n0, y: u0, w: n1 - n0, d: u1 - u0, r: 0.3 }, v0, v1 - v0, P, 1, 0);
const outlineOn = (n: number, [u0, u1, v0, v1]: Rect) => k.pathOf([onFace(n, u0, v0), onFace(n, u1, v0), onFace(n, u1, v1), onFace(n, u0, v1)].map(at), true);
/** A box standing in the drawer: x along the slide, y across, z up. */
const block = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.2) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 1, 0);

const byDepth = (points: k.Plane[]) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function Base() {
  const feet = byDepth(k.corners(PLINTH, 16)).map(([x, y]) => (
    <g key={`${x},${y}`}>
      <Solid paths={k.cylinder(x, y, 6.5, -PLINTH_H - FOOT_H, 1.6, P, 28)} tone="lo" />
      <Solid paths={k.cylinder(x, y, 5, -PLINTH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28)} tone="mid" />
    </g>
  ));
  const screws = k.corners(PLINTH, 8);
  // The ruler strip lies on the front apron of the plinth, its ticks hanging from the strip's own edge.
  const strip = { x: FRONT + 3.2, y: -50, w: 4.2, d: 100, r: 0.8 };
  const ticks = k.topTicks(strip.y + 2, strip.y + strip.d - 2, 4, 5, strip.x + 0.6, 0.6, [1.8, 3.2], P, "y");
  // The label plate sits on the side apron and carries the one engraved figure: how many entries the cabinet files.
  const plate = { x: -21, y: CARCASS.y1 + 3.4, w: 42, d: 5.2, r: 1 };
  return (
    <g>
      <path className="iso-halo" d={k.haloOf(PLINTH, -PLINTH_H - FOOT_H, PLINTH_H, P)} />
      {feet}
      <Solid paths={k.slabOf(PLINTH, -PLINTH_H, PLINTH_H, P, 8, 1.4)} tone="lo" />
      <Line d={k.planOutline(k.insetPlan(PLINTH, 3.4), 0, P)} tone="faint" />
      <Line d={screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join("")} tone="lo" />
      <Dots points={screws.map(([x, y]) => at([x, y, 0]))} size={0.5} />
      <Solid paths={k.slabOf(strip, 0, 0.6, P, 3)} tone="lo" crease="none" />
      <Line d={ticks.minor} tone="lo" />
      <Line d={ticks.major} tone="mid" />
      <Dots points={[at([strip.x + 2.1, strip.y + 1, 0.6]), at([strip.x + 2.1, strip.y + strip.d - 1, 0.6])]} size={0.45} />
      <Solid paths={k.slabOf(plate, 0, 0.8, P, 4)} tone="mid" crease="none" />
      <Line d={k.planOutline(k.insetPlan(plate, 1.2), 0.8, P)} tone="faint" />
      <FaceText transform={k.topMatrix([plate.x + plate.w / 2, plate.y + 3.9], 0.8, P, "x")} size={3.6} tone="hi" anchor="middle">
        {ENTRIES} ENTRI
      </FaceText>
      <Dots points={[at([plate.x + 2.2, plate.y + plate.d / 2, 0.8]), at([plate.x + plate.w - 2.2, plate.y + plate.d / 2, 0.8])]} size={0.4} />
    </g>
  );
}

function Carcass() {
  // The seam between the two halves of the case runs round the visible corner at the height of a drawer gap.
  const seamZ = (DRAWERS[11]!.z0 + DRAWERS[8]!.z1) / 2;
  // The side is a frame-and-panel: the frame's inner edge, the raised panel's edge, and a screw in each corner.
  const sideRect = (inset: number) => {
    const u0 = CARCASS.x0 + inset;
    const u1 = CARCASS.x1 - inset;
    const v0 = CARCASS.z0 + inset;
    const v1 = CARCASS.z1 - inset;
    return k.pathOf([[u0, CARCASS.y1, v0], [u1, CARCASS.y1, v0], [u1, CARCASS.y1, v1], [u0, CARCASS.y1, v1]].map((p) => at(p as k.Point3)), true);
  };
  const sideScrews = [CARCASS.x0 + 4, CARCASS.x1 - 4].flatMap((x) => [CARCASS.z0 + 4, CARCASS.z1 - 4].map((z) => at([x, CARCASS.y1, z])));
  // Where a drawer sits the face is open, and the cavity behind it is as dark as a side in shadow.
  const cavities = DRAWERS.map((drawer) => (
    <g key={drawer.id}>
      <path className="iso-shade" data-shade={0} d={outlineOn(0, [drawer.y0, drawer.y1, drawer.z0, drawer.z1])} />
      <Line d={outlineOn(0, [drawer.y0, drawer.y1, drawer.z0, drawer.z1])} tone="lo" />
    </g>
  ));
  return (
    <g>
      <Solid paths={k.slabOf(CARCASS_PLAN, CARCASS.z0, CARCASS.z1 - CARCASS.z0, P, 4, 0.8)} tone="mid" inner={<Line d={k.sideSeam(CARCASS_PLAN, seamZ, P, 4)} tone="faint" />} />
      <Line d={sideRect(2.4)} tone="faint" />
      <Line d={sideRect(7)} tone="lo" />
      <Dots points={sideScrews} size={0.5} />
      {cavities}
    </g>
  );
}

/** A sorting tray on top of the cabinet: a shallow box with a short stack of cards leaning in it, and a thumb notch. */
function Tray() {
  const tray = { x: CARCASS.x0 + 6, y: CARCASS.y0 + 8, w: 30, d: 40, r: 1.2 };
  const z = CARCASS.z1 + CORNICE_H;
  const wall = 1.2;
  const inner = k.insetPlan(tray, wall);
  const cards = Array.from({ length: 5 }, (_, index) => {
    const y = inner.y + 3 + index * 2.6;
    return <Solid key={index} paths={k.slabOf({ x: inner.x + 2, y, w: inner.w - 4, d: 0.6, r: 0.1 }, z + wall, 7 - index * 0.4, P, 1, 0)} tone="hi" crease="none" />;
  });
  const notch = { x: tray.x + tray.w / 2 - 3, y: tray.y + tray.d - wall - 0.2, w: 6, d: wall + 0.4, r: 0.6 };
  return (
    <g>
      <Solid paths={k.slabOf(tray, z, wall, P, 4, 0)} tone="mid" crease="none" />
      <Solid paths={k.slabOf({ x: tray.x, y: tray.y, w: wall, d: tray.d, r: 0.3 }, z + wall, 4, P, 2, 0)} tone="mid" crease="none" />
      <Solid paths={k.slabOf({ x: tray.x, y: tray.y, w: tray.w, d: wall, r: 0.3 }, z + wall, 4, P, 2, 0)} tone="mid" crease="none" />
      {cards}
      <Solid paths={k.slabOf({ x: tray.x + tray.w - wall, y: tray.y, w: wall, d: tray.d, r: 0.3 }, z + wall, 4, P, 2, 0)} tone="mid" crease="none" />
      <Solid paths={k.slabOf({ x: tray.x, y: tray.y + tray.d - wall, w: tray.w, d: wall, r: 0.3 }, z + wall, 4, P, 2, 0)} tone="mid" crease="none" />
      <Line d={k.planOutline(notch, z + wall + 4, P, 3)} tone="faint" />
    </g>
  );
}

function Cornice() {
  const screws = k.corners(CORNICE, 4.5);
  // A plaque on the cornice front, three rule lines for its engraving and a rivet at each end.
  const plaque: Rect = [-15, 15, CARCASS.z1 + 0.9, CARCASS.z1 + CORNICE_H - 0.9];
  const n = CORNICE.x + CORNICE.w - FRONT;
  const rules = [0.75, 1.5, 2.25].map((v, line) => (
    <Line key={line} d={k.segment(onFace(n + 0.45, plaque[0] + 3.2, plaque[2] + v), onFace(n + 0.45, plaque[1] - (line === 1 ? 8 : 3.2), plaque[2] + v), P)} tone="lo" free />
  ));
  return (
    <g>
      <Solid paths={k.slabOf(CORNICE, CARCASS.z1, CORNICE_H, P, 4, 1)} tone="mid" />
      <Line d={k.planOutline(k.insetPlan(CORNICE, 3), CARCASS.z1 + CORNICE_H, P)} tone="faint" />
      <Dots points={screws.map(([x, y]) => at([x, y, CARCASS.z1 + CORNICE_H]))} size={0.5} />
      <Solid paths={plateOn(n, n + 0.45, plaque)} tone="hi" crease="none" />
      {rules}
      <Dots points={[at(onFace(n + 0.45, plaque[0] + 1.4, (plaque[2] + plaque[3]) / 2)), at(onFace(n + 0.45, plaque[1] - 1.4, (plaque[2] + plaque[3]) / 2))]} size={0.4} />
      <Tray />
    </g>
  );
}

function DrawerArt({ drawer }: { drawer: Drawer }) {
  const { y0, y1, z0, z1, id } = drawer;
  const { depth, wall, floor, wallHeight, card, front, reach } = DRAWER;
  const back = FRONT - depth;
  const floorZ = z0 + floor;
  const wallTop = floorZ + floor + wallHeight;
  const centre = (y0 + y1) / 2;
  const cards = Array.from({ length: drawer.cards }, (_, index) => {
    const x = cardX(drawer, index);
    const cardZ = floorZ + floor;
    const tabAt = centre + tabOffset(index);
    return (
      <g key={index} data-card={id} data-slot={index}>
        <Solid paths={block(x, x + card.thick, y0 + card.inset, y1 - card.inset, cardZ, cardZ + card.height, 0.1)} tone="hi" cell={id} />
        <Solid paths={block(x, x + card.thick, tabAt - card.tabWidth / 2, tabAt + card.tabWidth / 2, cardZ + card.height, cardZ + card.height + card.tab, 0.1)} tone="hi" cell={id} crease="none" />
      </g>
    );
  });
  // The front overlays the opening; the label holder and the pull stand off it.
  const faceRect: Rect = [y0, y1, z0, z1];
  const holder: Rect = [centre - 6, centre + 6, z1 - 6.2, z1 - 2.2];
  const label: Rect = [holder[0] + 0.6, holder[1] - 0.6, holder[2] + 0.6, holder[3] - 0.6];
  const pullZ = z0 + 4.2;
  const posts = [centre - 4, centre + 4].map((u) => plateOn(front, reach - 1.2, [u - 0.7, u + 0.7, pullZ - 0.7, pullZ + 0.7]));
  const bar = plateOn(reach - 1.2, reach, [centre - 5.2, centre + 5.2, pullZ - 0.75, pullZ + 0.75]);
  return (
    <g data-drawer={id}>
      <Solid paths={block(back, FRONT, y0 + wall, y1 - wall, floorZ, floorZ + floor)} tone="mid" crease="none" />
      <Solid paths={block(back, back + wall, y0 + wall, y1 - wall, floorZ + floor, wallTop)} tone="mid" crease="none" />
      <Solid paths={block(back, FRONT, y0 + wall, y0 + wall * 2, floorZ + floor, wallTop)} tone="mid" crease="none" />
      {cards}
      <Solid paths={block(back, FRONT, y1 - wall * 2, y1 - wall, floorZ + floor, wallTop)} tone="mid" crease="none" />
      <Solid paths={plateOn(0, front, faceRect)} tone="hi" cell={id} inner={<Line d={outlineOn(front, [y0 + 1.6, y1 - 1.6, z0 + 1.6, z1 - 1.6])} tone="faint" />} />
      <Line d={outlineOn(front, holder)} tone="lo" />
      <Solid paths={plateOn(front, front + 0.25, label)} tone="hi" crease="none" />
      <Line d={k.segment(onFace(front + 0.25, label[0] + 1.2, (label[2] + label[3]) / 2), onFace(front + 0.25, label[1] - 3, (label[2] + label[3]) / 2), P)} tone="lo" free />
      <Dots points={[at(onFace(front, holder[0] - 1.2, (holder[2] + holder[3]) / 2)), at(onFace(front, holder[1] + 1.2, (holder[2] + holder[3]) / 2))]} size={0.45} />
      {posts.map((paths, index) => (
        <Solid key={index} paths={paths} tone="mid" crease="none" />
      ))}
      <Solid paths={bar} tone="mid" crease="none" />
    </g>
  );
}

/** The silhouette of the room a drawer can slide into: from the face plane out to the pull at full stroke. */
export const clipOf = (drawer: Drawer) => k.haloOf({ x: FRONT, y: drawer.y0, w: DRAWER.pull + DRAWER.reach, d: drawer.y1 - drawer.y0, r: 0 }, drawer.z0, drawer.z1 - drawer.z0, P);

const [pullX, pullY] = k.axisVector(P, [DRAWER.pull, 0, 0]);
const [riseX, riseY] = k.axisVector(P, [0, 0, DRAWER.rise]);
const round = (value: number) => Math.round(value * 100) / 100;

export const FIGURE = {
  drawers: DRAWERS.length,
  cards: DRAWERS.reduce((sum, drawer) => sum + drawer.cards, 0),
  entries: ENTRIES,
};

export function CabinetArt() {
  return (
    <svg className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} focusable="false" aria-hidden="true" data-cabinet="" data-pull={`${round(pullX)},${round(pullY)}`} data-rise={`${round(riseX)},${round(riseY)}`}>
      <defs>
        {DRAWERS.map((drawer) => (
          <clipPath key={drawer.id} id={`cabinet-drawer-${drawer.id}`}>
            <path d={clipOf(drawer)} />
          </clipPath>
        ))}
      </defs>
      <Base />
      <Carcass />
      {paintOrder(DRAWERS).map((drawer) => (
        <g key={drawer.id} clipPath={`url(#cabinet-drawer-${drawer.id})`}>
          <DrawerArt drawer={drawer} />
        </g>
      ))}
      <Cornice />
    </svg>
  );
}
