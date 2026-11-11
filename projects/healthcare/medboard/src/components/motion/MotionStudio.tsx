'use client'

import { ArrowDownUp, ArrowUpRight, Box, Check, Eclipse, Layers3, MoveUpRight, Play, Sparkles } from 'lucide-react'
import { flushSync } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../shell/use-reduced-motion'
import MotionLink from './MotionLink'
import MotionSurface from './MotionSurface'
import { useDashboardMotion } from './MotionProvider'
import type { MotionEffect } from './motion-policy'
import './studio.css'

const experiences = [
  { id: 'shared', title: 'Shared morph', subtitle: 'Satu ruang, perspektif baru.', description: 'Panel berpindah bentuk tanpa kehilangan konteks.', icon: Layers3 },
  { id: 'portal', title: 'Portal', subtitle: 'Buka dimensi berikutnya.', description: 'Cahaya dan kedalaman membuka ruang berikutnya.', icon: Eclipse },
  { id: 'depth', title: 'Depth', subtitle: 'Ruang yang terasa hidup.', description: 'Permukaan mundur, lalu perspektif baru hadir.', icon: Box },
  { id: 'layout', title: 'Layout', subtitle: 'Setiap elemen punya tempat.', description: 'Kartu menyusun ulang posisi dengan alur yang utuh.', icon: ArrowDownUp },
  { id: 'curtain', title: 'Curtain', subtitle: 'Peralihan dengan karakter.', description: 'Bidang melengkung menyapu dan membuka halaman.', icon: MoveUpRight },
  { id: 'light', title: 'Light', subtitle: 'Mengikuti setiap gerakan.', description: 'Arahkan pointer ke panel untuk melihat cahaya dan kedalaman.', icon: Sparkles },
] as const
type Experience = typeof experiences[number]

export default function MotionStudio() {
  const coordinator = useDashboardMotion()
  const systemReduced = useReducedMotion()
  const reduced = systemReduced || Boolean(coordinator?.reducedMotion)
  const preset = coordinator?.preset ?? 'cinematic'
  const [active, setActive] = useState<Experience>(experiences[0])
  const [expanded, setExpanded] = useState(false)
  const [reversed, setReversed] = useState(false)
  const [iteration, setIteration] = useState(0)
  const sculpture = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    if (!sculpture.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '80px' })
    observer.observe(sculpture.current)
    return () => observer.disconnect()
  }, [])

  function select(experience: Experience, remix = false) {
    const update = () => flushSync(() => {
      setActive(experience)
      setIteration((count) => count + 1)
      if (experience.id === 'shared' || remix) setExpanded((value) => !value)
      if (experience.id === 'layout' || remix) setReversed((value) => !value)
    })
    if (experience.id === 'layout' || experience.id === 'light' || !coordinator) update()
    else coordinator.preview(experience.id satisfies Exclude<MotionEffect, 'none'>, update)
  }

  const tiles = reversed ? [...experiences].reverse() : experiences

  return (
    <section className="motion-studio" data-experience={active.id} data-preview-count={iteration} data-preset={preset} data-reduced-motion={reduced || undefined} data-suspended={coordinator?.suspended || !inView || undefined}>
      <header className="motion-studio__header">
        <div>
          <span className="motion-studio__eyebrow">MedBoard / Experience</span>
          <h1>Motion Studio<span>.</span></h1>
          <p>Jelajahi ruang kerja melalui bentuk, cahaya, dan gerakan.</p>
        </div>
        <div className="motion-studio__preferences">
          <span className="motion-studio__status"><i aria-hidden="true" />{reduced ? 'Gerakan minimal' : 'Interaktif'}</span>
          <button type="button" role="switch" aria-checked={reduced} disabled={systemReduced} onClick={() => coordinator?.setReducedMotion(!reduced)}>Kurangi gerakan</button>
        </div>
      </header>

      <section className="motion-studio__preset" aria-label="Motion preset">
        <div className="motion-studio__preset-copy">
          <span className="motion-studio__caption">Set the atmosphere</span>
          <h2>{preset === 'cinematic' ? 'Cinematic Smooth' : 'Balanced'}</h2>
          <p>{preset === 'cinematic' ? 'Kedalaman lembut, orbit hidup, dan cahaya yang mengalir.' : 'Gerakan ringkas dengan ruang kerja yang terasa tenang.'}</p>
        </div>
        <div className="motion-studio__preset-actions">
          <div className="motion-studio__preset-options" role="group" aria-label="Pilihan preset">
            <button type="button" aria-pressed={preset === 'cinematic'} onClick={() => coordinator?.setPreset('cinematic')}>
              {preset === 'cinematic' ? <Check size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
              <span>Cinematic Smooth<small>Rekomendasi</small></span>
            </button>
            <button type="button" aria-pressed={preset === 'balanced'} onClick={() => coordinator?.setPreset('balanced')}>
              {preset === 'balanced' ? <Check size={15} aria-hidden="true" /> : <Layers3 size={15} aria-hidden="true" />}
              <span>Balanced<small>Lebih ringkas</small></span>
            </button>
          </div>
          <button className="motion-studio__play" type="button" onClick={() => select(experiences[preset === 'cinematic' ? 1 : 2], true)}>
            <Play size={15} aria-hidden="true" />Preview preset<ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </div>
      </section>

      <div className="motion-studio__stage">
        <aside className="motion-studio__menu" aria-label="Pilihan pengalaman">
          <span className="motion-studio__caption">Six perspectives</span>
          {experiences.map((experience, index) => (
            <button key={experience.id} type="button" aria-pressed={active.id === experience.id} onClick={() => select(experience)}>
              <span className="motion-studio__number">0{index + 1}</span>
              <experience.icon size={17} strokeWidth={1.6} aria-hidden="true" />
              <span>{experience.title}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          ))}
          <p>Pilih satu perspektif. Ulangi untuk melihat bentuk dan susunannya berubah.</p>
        </aside>

        <div className={expanded ? 'motion-studio__canvas is-expanded' : 'motion-studio__canvas'}>
          <MotionSurface className="motion-studio__feature" layout={false}>
            <div className="motion-studio__feature-top"><span>Sentra / MedBoard</span><active.icon size={22} strokeWidth={1.3} aria-hidden="true" /></div>
            <div className="motion-studio__sculpture" ref={sculpture} aria-hidden="true">
              <div className="motion-studio__orbit motion-studio__orbit--one" />
              <div className="motion-studio__orbit motion-studio__orbit--two" />
              <div className="motion-studio__orbit motion-studio__orbit--three" />
              <div className="motion-studio__core"><Layers3 size={48} strokeWidth={.8} /></div>
              <span className="motion-studio__orbit-point" />
            </div>
            <div className="motion-studio__feature-copy">
              <span className="motion-studio__caption">{active.title}</span>
              <h2>{active.subtitle}</h2>
              <p>{active.description}</p>
            </div>
            <div className="motion-studio__feature-bottom"><span>Continuity in every direction</span><span>0{experiences.findIndex((item) => item.id === active.id) + 1} / 06</span></div>
          </MotionSurface>
          <div className="motion-studio__tiles" aria-label="Susunan perspektif">
            {tiles.map((experience) => (
              <MotionSurface key={experience.id} className={active.id === experience.id ? 'motion-studio__tile is-selected' : 'motion-studio__tile'}>
                <experience.icon size={20} strokeWidth={1.4} aria-hidden="true" />
                <span>{experience.title}</span>
              </MotionSurface>
            ))}
          </div>
        </div>
      </div>

      <footer className="motion-studio__destinations">
        <div><span className="motion-studio__caption">Continue exploring</span><p>Bawa gerakan ini ke ruang kerja berikutnya.</p></div>
        <nav aria-label="Jelajahi ruang kerja">
          <MotionLink href="/calculator">Algorithma <ArrowUpRight size={14} aria-hidden="true" /></MotionLink>
          <MotionLink href="/icdx">ICD Coding <ArrowUpRight size={14} aria-hidden="true" /></MotionLink>
          <MotionLink href="/atlas">Atlas Anatomi <ArrowUpRight size={14} aria-hidden="true" /></MotionLink>
          <MotionLink href="/hub">Sentra Hub <ArrowUpRight size={14} aria-hidden="true" /></MotionLink>
          <MotionLink href="/sentrapedia">Sentrapedia <ArrowUpRight size={14} aria-hidden="true" /></MotionLink>
        </nav>
      </footer>
      <p className="motion-studio__announcement" role="status" aria-live="polite">{preset === 'cinematic' ? 'Cinematic Smooth' : 'Balanced'} · {active.title} · {reduced ? 'Gerakan minimal aktif.' : active.description}</p>
    </section>
  )
}
