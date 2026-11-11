export type FacePixels = { width: number; height: number; lum: Uint8Array }
export type FaceAnalysis = { width: number; height: number; segments: Float32Array; dots: Float32Array }
export type FaceOptions = { density: number; edgeThreshold?: number }

function random(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296 }
}

// Reads the portrait's pixels once through a 2D canvas; null when the image or the context is
// unavailable, in which case the journey ends on the chapter text alone.
export async function loadPixels(src: string): Promise<FacePixels | null> {
  try {
    const image = new Image()
    image.src = src
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    const lum = new Uint8Array(canvas.width * canvas.height)
    for (let i = 0; i < lum.length; i++) lum[i] = data[i * 4]
    return { width: canvas.width, height: canvas.height, lum }
  } catch { return null }
}

// The face the way the renderer draws everything else (Chief 2026-10-08): edge pixels (Sobel,
// thinned along the gradient) become short line segments, and every other pixel becomes a dot
// with a probability that follows its brightness, so skin fills with light and the black
// background stays empty. Coordinates are pixels; each vertex carries its blurred luminance.
export function analyseFace(pixels: FacePixels, options: FaceOptions): FaceAnalysis {
  const { width: w, height: h } = pixels
  const threshold = options.edgeThreshold ?? .22
  const rand = random(5)
  const index = (x: number, y: number) => Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))
  const lum = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sum = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += pixels.lum[index(x + dx, y + dy)]
    lum[y * w + x] = sum / 9 / 255
  }
  const at = (x: number, y: number) => lum[index(x, y)]
  const magnitude = new Float32Array(w * h), sector = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
    const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
    magnitude[y * w + x] = Math.hypot(gx, gy)
    sector[y * w + x] = Math.round(Math.atan2(gy, gx) / (Math.PI / 4)) & 3
  }
  const along: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1]]
  const strength = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h ? 0 : magnitude[y * w + x]
  const edge = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, [dx, dy] = along[sector[i]]
    edge[i] = magnitude[i] > threshold && magnitude[i] > strength(x + dx, y + dy) && magnitude[i] >= strength(x - dx, y - dy) ? 1 : 0
  }
  const isEdge = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h && edge[y * w + x] === 1
  const segments: number[] = [], dots: number[] = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = lum[y * w + x]
    if (edge[y * w + x]) {
      const join = (nx: number, ny: number) => segments.push(x, y, l, nx, ny, lum[ny * w + nx])
      if (isEdge(x + 1, y)) join(x + 1, y)
      if (isEdge(x, y + 1)) join(x, y + 1)
      if (isEdge(x + 1, y + 1) && !isEdge(x + 1, y) && !isEdge(x, y + 1)) join(x + 1, y + 1)
      if (isEdge(x - 1, y + 1) && !isEdge(x - 1, y) && !isEdge(x, y + 1)) join(x - 1, y + 1)
    } else if (pixels.lum[y * w + x] > 25 && rand() < Math.pow(l, 1.4) * options.density * .3) {
      dots.push(x + rand() - .5, y + rand() - .5, l)
    }
  }
  return { width: w, height: h, segments: new Float32Array(segments), dots: new Float32Array(dots) }
}
