// THE LEGACY's film as a frame sequence the master scrubs: GSAP's image-sequence pattern (one
// canvas, the frame for the scroll position drawn into it) instead of a <video>, because the clip
// as supplied has a single keyframe, so seeking it costs up to ~220 ms a frame and a scrubbed
// video stutters (measured in Chrome, 2026-10-09). The frames are `public/legacy-film/v1/f000.webp`
// onward at 12 fps, extracted from Chief's clip in Chrome by `scripts/legacy-film/extract.mjs`,
// and `poster.webp` is the last of them at full size, the still poster. The folder carries a
// version because the frames are served as immutable (`next.config.mjs`): a re-export goes into
// a new folder and `FILM.version` moves with it.
// Nothing loads until the journey calls `load()` (it does when the story reaches the network,
// well before the film, Chief 2026-10-09: pay for the film only on the way to it); the first and
// the last frame come first, then the rest in order, a few at a time, and a frame asked for
// before it has arrived is stood in for by the nearest one already there.
export const FILM = { frames: 120, fps: 12, width: 640, height: 849, version: 'v1' }
const folder = `/legacy-film/${FILM.version}`
export const filmFrameUrl = (index: number) => `${folder}/f${String(index).padStart(3, '0')}.webp`
export const filmPosterUrl = `${folder}/poster.webp`
// The frame for a clip time in seconds, clamped to the sequence.
export const filmFrameIndex = (time: number) => Math.min(FILM.frames - 1, Math.max(0, Math.round(time * FILM.fps)))
// The order the frames are fetched in: the first (the film's entrance) and the last (the held
// frame the morph reads), then the rest in order.
export const loadOrder = (frames: number) => [0, frames - 1, ...Array.from({ length: Math.max(0, frames - 2) }, (_, i) => i + 1)]
// The frame to draw for `index` from those loaded: the nearest earlier one, else the nearest
// later one, else none (-1).
export function nearestLoaded(loaded: ReadonlyArray<boolean>, index: number): number {
  for (let i = Math.min(index, loaded.length - 1); i >= 0; i--) if (loaded[i]) return i
  for (let i = index + 1; i < loaded.length; i++) if (loaded[i]) return i
  return -1
}

export type FilmPlayer = { load(): void; render(time: number): void; dispose(): void }

export function createFilm(canvas: HTMLCanvasElement, lanes = 6): FilmPlayer | null {
  const context = canvas.getContext('2d')
  if (!context) return null
  canvas.width = FILM.width
  canvas.height = FILM.height
  const images: Array<HTMLImageElement | undefined> = []
  const loaded = Array.from({ length: FILM.frames }, () => false)
  let disposed = false, wanted = 0, shown = -1
  const draw = () => {
    const index = nearestLoaded(loaded, wanted), image = index >= 0 ? images[index] : undefined
    if (disposed || !image || index === shown) return
    shown = index
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    // The frame on screen, for the tests and the eye.
    canvas.dataset.frame = String(index)
  }
  const queue = loadOrder(FILM.frames), missing: number[] = []
  // One retry, then the frame is recorded in `data-missing` (the e2e asserts there is none) and
  // its neighbours stand in for it.
  const fetchFrame = async (index: number, retry = true): Promise<HTMLImageElement | null> => {
    const image = new Image()
    image.src = filmFrameUrl(index)
    try { await image.decode(); return image } catch { return retry && !disposed ? fetchFrame(index, false) : null }
  }
  const lane = async () => {
    while (!disposed) {
      const index = queue.shift()
      if (index === undefined) return
      const image = await fetchFrame(index)
      if (disposed) return
      if (!image) { missing.push(index); canvas.dataset.missing = missing.join(','); continue }
      images[index] = image
      loaded[index] = true
      draw()
    }
  }
  let started = false
  return {
    load() { if (started || disposed) return; started = true; for (let i = 0; i < lanes; i++) void lane() },
    render(time) { wanted = filmFrameIndex(time); draw() },
    dispose() { disposed = true; queue.length = 0; delete canvas.dataset.frame; delete canvas.dataset.missing },
  }
}
