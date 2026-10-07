export type Point = { x: number; y: number }
export type Box = { left: number; top: number; width: number; height: number }
export type TiltOptions = { maxTilt: number; parallax: number; halo: number }
export type Tilt = { rotationX: number; rotationY: number; parallaxX: number; parallaxY: number; haloX: number; haloY: number; haloScale: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// Pointer position inside a box as [-1, 1] per axis; outside the box clamps to the edge. A hidden
// element reports a zero-sized box, which reads as the centre rather than dividing by zero.
export function normalise(pointer: Point, box: Box): Point {
  const halfWidth = box.width / 2, halfHeight = box.height / 2
  return {
    x: halfWidth ? clamp((pointer.x - (box.left + halfWidth)) / halfWidth, -1, 1) : 0,
    y: halfHeight ? clamp((pointer.y - (box.top + halfHeight)) / halfHeight, -1, 1) : 0,
  }
}

// Pointer speed in px/ms; a zero or negative interval reads as no movement.
export function pointerSpeed(previous: Point, next: Point, dtMs: number): number {
  return dtMs > 0 ? Math.hypot(next.x - previous.x, next.y - previous.y) / dtMs : 0
}

// A fast pointer tilts harder: 1 at rest, 1.35 from 2 px/ms up.
export function velocityGain(speed: number): number {
  return 1 + clamp(speed / 2, 0, 1) * .35
}

// rotationY follows the pointer's x, rotationX opposes its y (the near edge dips toward the
// pointer); the image and halo slide the other way so the card reads as a solid object.
export function tiltFromPointer(pointer: Point, box: Box, options: TiltOptions, speed = 0): Tilt {
  const n = normalise(pointer, box)
  const gain = velocityGain(speed)
  const reach = Math.max(Math.abs(n.x), Math.abs(n.y))
  return {
    rotationX: -n.y * options.maxTilt * gain,
    rotationY: n.x * options.maxTilt * gain,
    parallaxX: -n.x * options.parallax,
    parallaxY: -n.y * options.parallax,
    haloX: -n.x * options.halo,
    haloY: -n.y * options.halo,
    haloScale: 1 + .08 * reach,
  }
}

// A control leans toward the pointer by a fraction of the pointer's offset from its centre.
export function magnetPull(pointer: Point, box: Box, strength: number): Point {
  return { x: (pointer.x - (box.left + box.width / 2)) * strength, y: (pointer.y - (box.top + box.height / 2)) * strength }
}

export type Viewport = { width: number; height: number }
export type FaceView = { offset: Point; depth: number; scale: number }
export type Look = { turn: number; highlight: [number, number, number] }

// The pointer as the face sees it: `turn` is where the pointer sits across the viewport in
// [-1, 1]; `highlight` is the pointer on the face plane in model space, the renderer projection
// run backwards (NDC x depth / 1.85 x aspect, minus the offset, over the scale). The turn is
// small enough to ignore here.
export function faceLook(pointer: Point, viewport: Viewport, view: FaceView): Look {
  const nx = clamp(pointer.x / viewport.width * 2 - 1, -1, 1)
  const ny = clamp(1 - pointer.y / viewport.height * 2, -1, 1)
  const reach = view.depth / 1.85
  return { turn: nx, highlight: [(nx * reach * viewport.width / viewport.height - view.offset.x) / view.scale, (ny * reach - view.offset.y) / view.scale, 0] }
}
