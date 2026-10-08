// THE LEGACY's film as a frame sequence the master scrubs: GSAP's image-sequence pattern (one
// canvas, the frame for the scroll position drawn into it) instead of a <video>, because the clip
// as supplied has a single keyframe, so seeking it costs up to ~220 ms a frame and a scrubbed
// video stutters (measured in Chrome, 2026-10-09). The frames are `public/legacy-film/f000.webp`
// onward at 12 fps, extracted from Chief's `cladeo.mp4` in Chrome (the script lives in the
// session scratchpad), and `poster.webp` is the last of them at full size, the still poster.
// Loading starts with the cinematic build, a few frames at a time from the start, and a frame
// asked for before it has arrived is stood in for by the nearest one already there.
export const FILM = { frames: 120, fps: 12, width: 640, height: 849 }
export const filmFrameUrl = (index: number) => `/legacy-film/f${String(index).padStart(3, '0')}.webp`
// The frame for a clip time in seconds, clamped to the sequence.
export const filmFrameIndex = (time: number) => Math.min(FILM.frames - 1, Math.max(0, Math.round(time * FILM.fps)))
// The frame to draw for `index` from those loaded: the nearest earlier one, else the nearest
// later one, else none (-1).
export function nearestLoaded(loaded: ReadonlyArray<boolean>, index: number): number {
  for (let i = Math.min(index, loaded.length - 1); i >= 0; i--) if (loaded[i]) return i
  for (let i = index + 1; i < loaded.length; i++) if (loaded[i]) return i
  return -1
}

export type FilmPlayer = { render(time: number): void; dispose(): void }

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
  const queue = Array.from({ length: FILM.frames }, (_, index) => index)
  const lane = async () => {
    while (!disposed) {
      const index = queue.shift()
      if (index === undefined) return
      const image = new Image()
      image.src = filmFrameUrl(index)
      try { await image.decode() } catch { continue }
      images[index] = image
      loaded[index] = true
      draw()
    }
  }
  for (let i = 0; i < lanes; i++) void lane()
  return {
    render(time) { wanted = filmFrameIndex(time); draw() },
    dispose() { disposed = true; queue.length = 0; delete canvas.dataset.frame },
  }
}
