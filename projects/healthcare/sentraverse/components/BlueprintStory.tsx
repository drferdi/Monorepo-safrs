// Architected and built by Drferdi.
'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef } from 'react'

import styles from '@/components/blueprint-story/blueprint-story.module.css'
import { SceneAADI } from '@/components/blueprint-story/SceneAADI'
import { SceneConsole } from '@/components/blueprint-story/SceneConsole'
import { SceneTrajectory } from '@/components/blueprint-story/SceneTrajectory'

gsap.registerPlugin(ScrollTrigger)

/**
 * Blueprint scroll-story: tiga lembar blueprint (AADI pipeline, T0→T3
 * trajectory, Console Assist wireframe) berjajar HORIZONTAL. Satu pin untuk
 * seluruh section; scroll vertikal menggambar lembar aktif garis-per-garis
 * (scrubbed stroke-dashoffset) lalu menggeser track ke lembar berikutnya di
 * kanan. SSR/no-JS state = fully drawn (lihat blueprint-story.module.css).
 * Scrub sengaja mengabaikan prefers-reduced-motion — keputusan tetap Chief
 * untuk situs ini (sama seperti marquee Clients).
 */
export default function BlueprintStory() {
  const rootRef = useRef<HTMLElement>(null)
  // Sentinel di luar `root` — dipakai sebagai trigger entrance agar posisinya
  // stabil, tidak ikut terdistorsi saat `root` di-pin (lihat catatan di bawah).
  const entranceMarkerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    const entranceMarker = entranceMarkerRef.current
    if (!root || !entranceMarker) return

    const ctx = gsap.context(() => {
      const track = root.querySelector<HTMLElement>('[data-bp-track]')
      const scenes = gsap.utils.toArray<HTMLElement>('[data-bp-scene]', root)
      if (!track || scenes.length === 0) return

      /** Step awal lembar 1 yang digambar saat section masih mendekat. */
      const ENTRANCE_STEPS = 3
      /** Step awal lembar berikutnya yang digambar offscreen sebelum slide. */
      const PREDRAW_STEPS = 3

      const stepsOf = (scene: HTMLElement) =>
        Array.from(
          new Set(
            Array.from(scene.querySelectorAll('[data-step]')).map((el) =>
              Number(el.getAttribute('data-step'))
            )
          )
        ).sort((a, b) => a - b)

      const addSteps = (target: gsap.core.Timeline, scene: HTMLElement, steps: number[]) => {
        steps.forEach((step) => {
          const strokes = scene.querySelectorAll(`[data-draw][data-step="${step}"]`)
          const fades = scene.querySelectorAll(`[data-fade][data-step="${step}"]`)
          if (strokes.length > 0) {
            target.to(strokes, { strokeDashoffset: 0, duration: 1, stagger: 0.12 })
          }
          if (fades.length > 0) {
            target.to(
              fades,
              { opacity: 1, duration: 0.5, stagger: 0.08 },
              strokes.length > 0 ? '-=0.4' : '+=0.1'
            )
          }
        })
      }

      // Sembunyikan semua elemen gambar terlebih dahulu.
      scenes.forEach((scene) => {
        gsap.set(scene.querySelectorAll('[data-draw]'), { strokeDashoffset: 1 })
        gsap.set(scene.querySelectorAll('[data-fade]'), { opacity: 0 })
      })

      // Entrance: frame + kotak-kotak awal lembar 1 digambar SEBELUM pin,
      // saat section mendekat — tidak ada layar kosong menyambut.
      // Trigger pakai `entranceMarker` (sibling stabil di luar `root`), bukan
      // `root` sendiri, supaya posisinya tidak ikut terdistorsi saat `root`
      // dibungkus pin-spacer oleh `master` di bawah.
      const entrance = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: entranceMarker,
          start: 'top 95%',
          end: 'top top',
          scrub: true,
        },
      })
      addSteps(entrance, scenes[0], stepsOf(scenes[0]).slice(0, ENTRANCE_STEPS))

      const master = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: true,
          anticipatePin: 1,
          // Section ini ada SETELAH pin horizontal Ecosystem di halaman yang
          // sama. Tanpa `refreshPriority` lebih rendah, ScrollTrigger kadang
          // menghitung ulang posisi pin section ini SEBELUM pin-spacer
          // Ecosystem mencapai ukuran akhirnya (mis. setelah gambar/font
          // settle), sehingga `start`/`end` pin ini jadi salah dan pin
          // lepas/patah di tengah scroll. Prioritas lebih rendah memastikan
          // section ini di-refresh belakangan, setelah section di atasnya settle.
          refreshPriority: -1,
        },
      })

      // Lembar 1: sisa step langsung digambar begitu pin dimulai.
      addSteps(master, scenes[0], stepsOf(scenes[0]).slice(ENTRANCE_STEPS))

      scenes.slice(1).forEach((scene, i) => {
        const sceneIndex = i + 1
        const steps = stepsOf(scene)

        // Pre-draw offscreen: step awal lembar berikutnya digambar PARALEL
        // dengan akhir gambar lembar aktif — saat slide, lembar yang masuk
        // sudah berisi, bukan background kosong.
        const pre = gsap.timeline({ defaults: { ease: 'none' } })
        addSteps(pre, scene, steps.slice(0, PREDRAW_STEPS))
        master.add(pre, Math.max(0, master.duration() - pre.duration()))

        // Geser track ke kanan menuju lembar berikutnya.
        master.to(
          track,
          {
            xPercent: (-100 * sceneIndex) / scenes.length,
            duration: 1.5,
            ease: 'power1.inOut',
          },
          '+=0.1'
        )

        // Sisa step lembar ini menyelesaikan diri setelah tiba.
        addSteps(master, scene, steps.slice(PREDRAW_STEPS))
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <>
      <div ref={entranceMarkerRef} aria-hidden className={styles.entranceMarker} />
      <section
        ref={rootRef}
        data-sentra-sim
        data-theme="dark"
        className={styles.root}
        aria-label="Blueprint Sentra — AADI, Trajectory, Console Assist"
      >
        <div data-bp-track="" className={styles.track}>
          <SceneAADI />
          <SceneTrajectory />
          <SceneConsole />
        </div>
      </section>
    </>
  )
}
