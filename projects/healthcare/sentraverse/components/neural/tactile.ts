export type Point = { x: number; y: number }
export type Box = { left: number; top: number; width: number; height: number }
export type Viewport = { width: number; height: number }
export type FaceView = { offset: Point; depth: number; scale: number }
export type FaceLook = { turn: number; highlight: [number, number, number] }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// The relief settles onto the source-image plane before the first skin pixels appear. Both
// renderers and the photo controller consume this state, including during reverse scrolling.
export function portraitState(phase: number): { relief: number; reveal: number } {
  const lock = clamp((phase - 94.25) / 1.25, 0, 1)
  return { relief: 1 - lock * lock * (3 - 2 * lock), reveal: clamp((phase - 95.5) / 3, 0, 1) }
}

// A control leans toward the pointer by a fraction of the pointer offset from its centre.
export function magnetPull(pointer: Point, box: Box, strength: number): Point {
  return { x: (pointer.x - (box.left + box.width / 2)) * strength, y: (pointer.y - (box.top + box.height / 2)) * strength }
}

// The shader projects a world point at depth d to NDC y = y * 1.85 / d, so the visible half-height
// at the face plane is depth / 1.85 world units (times the aspect ratio horizontally).
const PROJECTION = 1.85
// makeFace: three units wide for the square 480×480 source, so 1.5 units above and below centre.
const FACE_HALF_HEIGHT = 1.5

// Where the face sits for a viewport (Chief 2026-10-08): on desktop 1.9 units right of centre, at
// 1.2 on wide screens (the 2026-10-08 portrait is a half body, so the face keeps its size) and at
// full size on a 4:3 screen, pulled in and reduced to .55 when the viewport is nearly square so the
// whole figure stays on screen (right edge at NDC .92 or less) and the photo clears the description
// (was .7 until Chief saw the overlap on a 768×1024 tablet); on phones centred above the
// bottom-aligned text, filling the band between the specimen line (150 px) and the text block
// (259 px over the chapter padding, 145 px or 90 px on short screens) at up to .55 of full size.
export function facePlacement(viewport: Viewport, mobile: boolean): FaceView {
  const depth = 6, reach = depth / PROJECTION
  if (mobile) {
    const padding = viewport.height <= 700 ? 90 : 145
    const band = Math.max(80, viewport.height - padding - 259 - 10 - 150)
    const scale = Math.min(.55, band / (FACE_HALF_HEIGHT / reach * viewport.height))
    const centre = 150 + band / 2
    return { offset: { x: 0, y: (viewport.height / 2 - centre) / (viewport.height / 2) * reach }, depth, scale }
  }
  const aspect = viewport.width / viewport.height
  const scale = aspect < 1.2 ? .55 : aspect < 1.45 ? 1 : 1.2
  return { offset: { x: Math.min(1.9, .92 * reach * aspect - 1.5 * scale), y: 0 }, depth, scale }
}

// The pointer as the face sees it: turn is where the pointer sits across the viewport in [-1, 1];
// highlight is the pointer on the face plane in model space, the renderer projection run backwards
// (NDC x reach x aspect, minus the offset, over the scale). The turn is small enough to ignore.
export function faceLook(pointer: Point, viewport: Viewport, view: FaceView): FaceLook {
  const nx = clamp(pointer.x / viewport.width * 2 - 1, -1, 1)
  const ny = clamp(1 - pointer.y / viewport.height * 2, -1, 1)
  const reach = view.depth / PROJECTION
  return { turn: nx, highlight: [(nx * reach * viewport.width / viewport.height - view.offset.x) / view.scale, (ny * reach - view.offset.y) / view.scale, 0] }
}

// Source image aspect (square: 480×480 for the drawn figure, 500×500 for the photograph): the
// photograph placed in this box covers the drawn figure exactly.
const FACE_ASPECT = 1

// The screen box, in stage pixels, of the face drawn for a placement: the renderer projects one
// world unit at the camera depth to (height / 2) * PROJECTION / depth pixels, world y points up,
// and makeFace builds the face three units wide.
export function faceBox(view: FaceView, viewport: Viewport): Box {
  const unit = viewport.height / 2 * PROJECTION / view.depth
  const width = 3 * view.scale * unit, height = width * FACE_ASPECT
  return { left: viewport.width / 2 + view.offset.x * unit - width / 2, top: viewport.height / 2 - view.offset.y * unit - height / 2, width, height }
}
