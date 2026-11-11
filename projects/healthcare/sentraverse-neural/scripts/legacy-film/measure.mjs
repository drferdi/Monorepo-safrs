// Draws the film's last frame (the one the morph transforms) with a 50 px grid, the `MORPH.face`
// ellipse, the `MORPH.crop` box and the morph's own analysis of that crop (`faceCrop` +
// `analyseFace`), so `MORPH.face`, `crop` and `hairline` can be read off in frame pixels after a
// re-export (extract.mjs). Writes a PNG; changes nothing in the repo.
// usage: node scripts/legacy-film/measure.mjs <out.png> [density .4]
import { chromium } from '@playwright/test'
import { analyseFace } from '../../components/neural/face.ts'
import { FILM, filmFrameUrl } from '../../components/neural/film.ts'
import { MORPH, faceCrop } from '../../components/neural/morph.ts'

const [output, density = '.4'] = process.argv.slice(2)
if (!output) throw new Error('usage: node scripts/legacy-film/measure.mjs <out.png> [density]')
const frame = new URL(`../../public${filmFrameUrl(FILM.frames - 1)}`, import.meta.url)

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: FILM.width, height: FILM.height } })
await page.goto(frame.href)
const lum = await page.evaluate(async ([width, height]) => {
  const image = document.querySelector('img')
  if (!image) throw new Error('no frame')
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('no 2d context')
  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, width, height)
  return Array.from({ length: width * height }, (_, i) => data[i * 4])
}, [FILM.width, FILM.height])
const face = analyseFace(faceCrop({ width: FILM.width, height: FILM.height, lum: Uint8Array.from(lum) }), { density: Number(density) })
console.log(JSON.stringify({ segments: face.segments.length / 6, dots: face.dots.length / 3 }))

await page.evaluate(([width, height, morph, segments, dots]) => {
  const image = document.querySelector('img')
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')
  if (!image || !context) throw new Error('no frame')
  context.drawImage(image, 0, 0)
  context.font = '11px monospace'; context.lineWidth = 1
  context.strokeStyle = 'rgb(255 80 80 / .6)'; context.fillStyle = '#ff5050'
  for (let x = 0; x < width; x += 50) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); context.fillText(String(x), x + 2, 10) }
  for (let y = 0; y < height; y += 50) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); context.fillText(String(y), 2, y - 2) }
  const { face, crop, hairline } = morph
  context.strokeStyle = '#ffd24a'
  context.beginPath(); context.ellipse(face.x, face.y, face.rx, face.ry, 0, 0, Math.PI * 2); context.stroke()
  context.strokeRect(crop.x, crop.y, crop.w, crop.h)
  context.beginPath(); context.moveTo(crop.x, hairline); context.lineTo(crop.x + crop.w, hairline); context.stroke()
  context.strokeStyle = 'rgb(120 200 255 / .9)'; context.beginPath()
  for (let i = 0; i < segments.length; i += 6) { context.moveTo(crop.x + segments[i], crop.y + segments[i + 1]); context.lineTo(crop.x + segments[i + 3], crop.y + segments[i + 4]) }
  context.stroke()
  context.fillStyle = 'rgb(181 200 220 / .9)'
  for (let i = 0; i < dots.length; i += 3) context.fillRect(crop.x + dots[i], crop.y + dots[i + 1], 1, 1)
  document.body.replaceChildren(canvas)
  document.body.style.margin = '0'
}, [FILM.width, FILM.height, MORPH, Array.from(face.segments), Array.from(face.dots)])
await page.screenshot({ path: output })
await browser.close()
