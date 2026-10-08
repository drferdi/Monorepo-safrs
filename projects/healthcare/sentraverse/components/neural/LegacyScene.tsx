import Image from 'next/image'
import styles from './legacy.module.css'

// The final chapter's scene (Chief 2026-10-09, "THE LEGACY"): a black void that closes over the
// neural field, the founder's film standing large in the stage (a canvas the master draws the
// scroll position's frame into, `film.ts`, with a second canvas over it where part of the face
// becomes neural tissue at the end, `morph.ts`), and a vignette over it all. The image beneath
// the canvases is the film's last frame, the still poster: reading mode and the no-JavaScript page.
// Server-rendered and complete by its stylesheet; the cinematic timeline in `timeline.ts` starts
// the void open and the film dark and brings them in by phase.
export default function LegacyScene() {
  return (
    <div data-legacy className={styles.scene}>
      <div data-legacy-void className={styles.void} aria-hidden="true" />
      <div data-film className={styles.film}>
        <Image src="/legacy-film/poster.webp" alt="dr. Ferdi Iskandar" fill sizes="(max-width: 767px) 92vw, 760px" />
        <canvas data-film-canvas aria-hidden="true" />
        <canvas data-film-morph aria-hidden="true" />
      </div>
      <div data-legacy-vignette className={styles.vignette} aria-hidden="true" />
    </div>
  )
}
