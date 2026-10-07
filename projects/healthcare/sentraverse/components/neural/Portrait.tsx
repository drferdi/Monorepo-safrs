import Image from 'next/image'
import styles from './journey.module.css'

// The one human face of the journey (Chief 2026-10-07): the founder's portrait in a thin glass
// frame over an ambient halo. Markup only; NeuralJourney wires the motion through the data
// attributes, so this renders the same in the reading, SVG-fallback and no-JavaScript cases.
export default function Portrait() {
  return (
    <figure data-portrait className={styles.portrait}>
      <span data-portrait-halo className={styles.portraitHalo} aria-hidden="true" />
      <div data-portrait-card className={styles.portraitCard}>
        <div data-portrait-image className={styles.portraitImage}>
          <Image src="/portrait-ferdi.webp" alt="dr. Ferdi Iskandar" fill sizes="(max-width: 767px) 36vw, 200px" />
        </div>
        <span className={styles.portraitFrame} aria-hidden="true" />
      </div>
      <figcaption>dr. Ferdi Iskandar · Founder</figcaption>
    </figure>
  )
}
