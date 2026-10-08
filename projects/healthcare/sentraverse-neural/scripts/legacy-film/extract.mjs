// Extracts THE LEGACY's film as the WebP frame sequence `components/neural/film.ts` scrubs, in the
// installed Chrome (its decoder reads the clip as supplied): `FILM.frames` frames at `FILM.fps`
// (`FILM.width`×`FILM.height`, the clip's own aspect) plus the last frame at full size as the
// still poster. The frames are served immutable, so a re-export goes into a NEW version folder;
// afterwards set `FILM.version` to it, check `legacy.film.length` in timeline.ts, and re-measure
// `MORPH.face` and `MORPH.crop` in morph.ts on the new last frame (grid.mjs, analyse.mjs).
// usage: node scripts/legacy-film/extract.mjs <clip.mp4> <version> [quality .72]
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { FILM } from '../../components/neural/film.ts'
import { legacy } from '../../components/neural/timeline.ts'

const [clip, version, qualityArg = '.72'] = process.argv.slice(2)
if (!clip || !version) throw new Error('usage: node scripts/legacy-film/extract.mjs <clip.mp4> <version> [quality]')
const out = new URL(`../../public/legacy-film/${version}/`, import.meta.url)
if (existsSync(out)) throw new Error(`public/legacy-film/${version} exists; the frames are immutable, pick a new version`)
mkdirSync(out, { recursive: true })
const probe = join(mkdtempSync(join(tmpdir(), 'legacy-film-')), 'probe.html')
writeFileSync(probe, `<!doctype html><video id="v" src="${pathToFileURL(resolve(clip))}" muted playsinline preload="auto"></video>`)

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] })
const page = await browser.newPage()
await page.goto(pathToFileURL(probe).href)
await page.evaluate(() => new Promise(resolve => {
  const video = document.querySelector('video')
  if (video && video.readyState >= 1) resolve(undefined)
  else video?.addEventListener('loadedmetadata', () => resolve(undefined))
}))
const grab = (time, width, height, quality) => page.evaluate(async ([time, width, height, quality]) => {
  const video = document.querySelector('video')
  if (!video) throw new Error('no video')
  await new Promise(resolve => { video.addEventListener('seeked', resolve, { once: true }); video.currentTime = time })
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/webp', quality)
}, [time, width, height, quality])
const save = (name, data) => writeFileSync(new URL(name, out), Buffer.from(data.split(',')[1], 'base64'))

const quality = Number(qualityArg), end = legacy.film.length
for (let i = 0; i < FILM.frames; i++) save(`f${String(i).padStart(3, '0')}.webp`, await grab(Math.min(i / FILM.fps, end), FILM.width, FILM.height, quality))
// The poster at the clip's display size (832×1104 for the 2026-10-09 clip), the frames' aspect.
save('poster.webp', await grab(end, 832, Math.round(832 * FILM.height / FILM.width), .8))
await browser.close()

const files = readdirSync(out), bytes = files.reduce((sum, file) => sum + statSync(new URL(file, out)).size, 0)
console.log(JSON.stringify({ folder: `public/legacy-film/${version}`, files: files.length, bytes }))
