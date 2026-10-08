import { faceContour, faceDissolve } from './geometry'

// A small, precomputed alpha field controls a full-resolution drawing of the original image.
// No image data is uploaded or regenerated; the static Image remains the accessible fallback.
export function createPortraitReveal(photo: HTMLElement) {
  const image = photo.querySelector('img'), canvas = photo.querySelector('canvas')
  if (!image || !canvas) return null
  const context = canvas.getContext('2d')
  const mask = document.createElement('canvas')
  mask.width = 192; mask.height = Math.round(192 * 246 / 240)
  const maskContext = mask.getContext('2d')
  if (!context || !maskContext) return null
  const pixels = maskContext.createImageData(mask.width, mask.height)
  const contours = new Float32Array(mask.width * mask.height)
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
    const i = y * mask.width + x
    contours[i] = faceContour((x + .5) / mask.width, (y + .5) / mask.height)
    pixels.data[i * 4] = 255; pixels.data[i * 4 + 1] = 255; pixels.data[i * 4 + 2] = 255
  }
  let disposed = false, progress = 0, lastProgress = -1
  const render = (value: number) => {
    progress = Math.min(1, Math.max(0, value))
    if (disposed || !image.complete || image.naturalWidth === 0) return
    const step = Math.round(progress * 180) / 180
    if (step === lastProgress) return
    lastProgress = step
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (step > 0 && step < 1) {
      for (let i = 0; i < contours.length; i++) pixels.data[i * 4 + 3] = Math.round(faceDissolve(contours[i], step) * 255)
      maskContext.putImageData(pixels, 0, 0)
      // Match object-fit: cover, including the tiny aspect difference between the two sources.
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale
      context.globalCompositeOperation = 'source-over'
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
      context.globalCompositeOperation = 'destination-in'
      context.drawImage(mask, 0, 0, canvas.width, canvas.height)
      context.globalCompositeOperation = 'source-over'
    }
    photo.dataset.reveal = step === 1 ? 'complete' : 'active'
  }
  const loaded = () => { lastProgress = -1; render(progress) }
  image.addEventListener('load', loaded)
  return {
    render,
    resize(width: number, height: number, dpr: number) {
      if (disposed) return
      const resolution = Math.min(dpr, 1.7, 720 / Math.max(1, width))
      canvas.width = Math.max(1, Math.round(width * resolution))
      canvas.height = Math.max(1, Math.round(height * resolution))
      lastProgress = -1
      render(progress)
    },
    dispose() {
      disposed = true
      image.removeEventListener('load', loaded)
      context.clearRect(0, 0, canvas.width, canvas.height)
      delete photo.dataset.reveal
    },
  }
}
