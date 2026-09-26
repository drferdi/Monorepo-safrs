'use client'

import { motion, useReducedMotion } from 'framer-motion'

import {
  getRevealInitial,
  motionVariants,
  motionViewport,
  staggerContainer,
  thinkingMeta,
  thinkingNodes,
  transitions,
  useMotionReady,
} from '@/components/showcase/thinking-stack-config'
import { ThinkingTerminal } from '@/components/showcase/ThinkingTerminal'
import { layoutGovernance } from '@/lib/design-governance'
import { cn } from '@/lib/utils'

export default function Showcase() {
  const shouldReduce = useReducedMotion()
  const isMotionReady = useMotionReady()
  const revealInitial = getRevealInitial(isMotionReady, shouldReduce, 'hidden')

  return (
    <section
      aria-labelledby="thinking-stack-title"
      className={cn('fi-section fi-thinking-editorial', layoutGovernance.sectionY.spacious)}
      id="expertise"
    >
      <div className={cn(layoutGovernance.container.wide, layoutGovernance.sectionX)}>
        <div aria-hidden="true" className="fi-editorial-page-rule"></div>

        <motion.header
          aria-label="Header editorial The Thinking Stack"
          className="fi-thinking-masthead"
          initial={revealInitial}
          whileInView="visible"
          viewport={motionViewport}
          variants={motionVariants.fadeDown}
          transition={shouldReduce ? { duration: 0 } : transitions.medium}
        >
          <div className="fi-thinking-masthead-left">{thinkingMeta.sectionLabel}</div>
          <div className="fi-thinking-masthead-center">{thinkingMeta.editionLabel}</div>
          <div className="fi-thinking-masthead-right">{thinkingMeta.notesLabel}</div>
        </motion.header>

        <motion.div
          className="fi-thinking-hero-grid"
          initial={revealInitial}
          whileInView="visible"
          viewport={motionViewport}
          variants={staggerContainer(0.12, 0.1)}
          transition={shouldReduce ? { staggerChildren: 0, delayChildren: 0 } : undefined}
        >
          <motion.aside
            aria-label="Visual terminal orkestrasi"
            className="fi-thinking-section-mark"
            variants={motionVariants.fadeUp}
            transition={shouldReduce ? { duration: 0 } : transitions.medium}
          >
            <span>Bagian</span>
            <strong
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                letterSpacing: '-0.04em',
                fontSize: 'clamp(28px, 2.6vw, 40px)',
                lineHeight: 0.88,
                fontWeight: 400,
                opacity: 0.55,
              }}
            >
              SENTRA AGENTS
            </strong>
            <i aria-hidden="true"></i>
            <b aria-hidden="true">✧</b>
          </motion.aside>
          <motion.div
            className="fi-thinking-title-block"
            variants={motionVariants.slideIn}
            transition={shouldReduce ? { duration: 0 } : transitions.medium}
          >
            <div className="fi-kicker">Rekayasa Kecerdasan</div>
            <h2
              className="fi-thinking-title"
              id="thinking-stack-title"
              style={{ fontSize: 'clamp(38px, 5vw, 72px)', opacity: 0.75 }}
            >
              The Chief&apos;s Orchestration Agents
            </h2>
            <div aria-hidden="true" className="fi-thinking-title-rule">
              <span></span>
            </div>
            <p className="fi-thinking-pullquote" style={{ opacity: 0.8 }}>
              The Chief&apos;s Orchestration Agents adalah ruang orkestrasi terbuka untuk membangun
              kecerdasan klinis yang bertanggung jawab.
            </p>
          </motion.div>
          <motion.aside
            aria-label="Visual terminal orkestrasi"
            className="fi-thinking-terminal-visual"
            variants={motionVariants.fadeUp}
            transition={shouldReduce ? { duration: 0 } : { ...transitions.medium, delay: 0.2 }}
          >
            <ThinkingTerminal />
          </motion.aside>
        </motion.div>

        <div aria-hidden="true" className="fi-thinking-divider"></div>

        <div className="fi-thinking-orchestration">
          <motion.aside
            className="fi-thinking-sidebar"
            initial={revealInitial}
            whileInView="visible"
            viewport={motionViewport}
            variants={motionVariants.slideIn}
            transition={shouldReduce ? { duration: 0 } : transitions.medium}
          >
            <p>
              Ruang orkestrasi terbuka yang terinspirasi Langflow, lalu diterjemahkan menjadi sistem
              editorial.
            </p>
            <span aria-hidden="true"></span>
            <p>Setiap peran menyumbang kemampuan reasoning yang berbeda.</p>
            <span aria-hidden="true"></span>
            <p>
              Bersama-sama, semuanya membentuk arsitektur deliberatif untuk clinical intelligence.
            </p>
            <b aria-hidden="true">✣</b>
          </motion.aside>

          <div className="fi-thinking-graph-wrapper">
            <motion.div
              aria-label="Graf orkestrasi kognitif founder"
              className="fi-thinking-graph"
              initial={revealInitial}
              whileInView="visible"
              viewport={motionViewport}
              variants={staggerContainer(0.1, 0.2)}
              transition={shouldReduce ? { staggerChildren: 0, delayChildren: 0 } : undefined}
            >
              <svg
                aria-hidden="true"
                className="fi-thinking-wires"
                preserveAspectRatio="none"
                viewBox="0 0 1200 430"
              >
                <path d="M 160 210 C 210 210 230 93 300 93"></path>
                <path d="M 160 210 C 210 210 230 305 408 305"></path>
                <path d="M 460 93 C 500 93 540 93 576 93"></path>
                <path d="M 736 93 C 776 93 812 93 852 93"></path>
                <path d="M 1012 93 C 1040 93 1050 210 1056 210"></path>
                <path d="M 844 305 C 940 305 1040 210 1056 210"></path>
                <path d="M 568 305 C 606 305 646 305 684 305"></path>
                <path d="M 408 210 C 408 250 408 270 408 305"></path>
                <path d="M 870 210 C 870 250 856 280 844 305"></path>
                <circle cx="160" cy="210" r="5"></circle>
                <circle cx="300" cy="93" r="5"></circle>
                <circle cx="460" cy="93" r="5"></circle>
                <circle cx="576" cy="93" r="5"></circle>
                <circle cx="736" cy="93" r="5"></circle>
                <circle cx="852" cy="93" r="5"></circle>
                <circle cx="1012" cy="93" r="5"></circle>
                <circle cx="408" cy="305" r="5"></circle>
                <circle cx="568" cy="305" r="5"></circle>
                <circle cx="684" cy="305" r="5"></circle>
                <circle cx="844" cy="305" r="5"></circle>
                <circle cx="1056" cy="210" r="5"></circle>
              </svg>

              {thinkingNodes.map((node, i) => (
                <motion.article
                  key={i}
                  className={node.className}
                  style={node.style}
                  variants={motionVariants.scaleReveal}
                  transition={
                    shouldReduce ? { duration: 0 } : { ...transitions.dramatic, delay: i * 0.08 }
                  }
                >
                  <span>{node.label}</span>
                  <h3>
                    {node.title.split('\n').map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < node.title.split('\n').length - 1 ? <br /> : ''}
                      </span>
                    ))}
                  </h3>
                  <p>{node.desc}</p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </div>

        <motion.footer
          aria-label="Thinking stack metadata"
          className="fi-thinking-footnotes"
          initial={revealInitial}
          whileInView="visible"
          viewport={motionViewport}
          variants={motionVariants.fadeIn}
          transition={shouldReduce ? { duration: 0 } : { ...transitions.medium, delay: 0.1 }}
        >
          <div>
            <strong>Fig. 02.01</strong>
          </div>
          <div>
            <em>
              Ruang orkestrasi The Thinking Stack.
              <br />
              Peran-peran dihubungkan oleh tujuan, bukan sekadar proses.
            </em>
          </div>
          <div>
            <strong>Sumber</strong>
            <span>Laboratorium Catatan Founder</span>
          </div>
          <div>
            <strong>Catatan</strong>
            <span>
              Bukan sekadar workflow.
              <br />
              Sebuah cara berpikir.
            </span>
          </div>
          <div>
            <strong>Status</strong>
            <span>Terus disempurnakan</span>
          </div>
          <div>
            <strong>Pembaruan</strong>
            <span>{thinkingMeta.lastUpdatedLabel}</span>
          </div>
          <div aria-hidden="true" className="fi-thinking-ornament">
            ✧
          </div>
        </motion.footer>

        <div aria-hidden="true" className="fi-editorial-page-rule bottom"></div>
      </div>
    </section>
  )
}
