import { useSyncExternalStore, type ReactNode } from 'react'

export const thinkingNodes = [
  {
    className: 'fi-thinking-node fi-node-input',
    style: { ['--x' as string]: '0%', ['--y' as string]: '171px' },
    label: 'Masukan',
    title: 'Clinical\nComplexity',
    desc: 'Tidak terstruktur, berubah-ubah, dan berisiko tinggi.',
  },
  {
    className: 'fi-thinking-node fi-node-top-1',
    style: { ['--x' as string]: '25%', ['--y' as string]: '40px' },
    label: 'Proses',
    title: 'Intelligence Engineer\n& Systems Architect',
    desc: 'Merekayasa fondasi sistem yang mampu belajar, beradaptasi, dan tetap dapat diaudit.',
  },
  {
    className: 'fi-thinking-node fi-node-top-2',
    style: { ['--x' as string]: '48%', ['--y' as string]: '40px' },
    label: 'Proses',
    title: 'Autonomous\nSystems Strategist',
    desc: 'Mengubah otomatisasi menjadi otonomi terbatas yang tidak mengambil alih tanggung jawab klinis.',
  },
  {
    className: 'fi-thinking-node fi-node-top-3',
    style: { ['--x' as string]: '71%', ['--y' as string]: '40px' },
    label: 'Proses',
    title: 'Principal of\nAugmented Engineering',
    desc: 'Mendesain teknologi sebagai ekstensi kapasitas intelektual manusia.',
  },
  {
    className: 'fi-thinking-node fi-node-bottom-1',
    style: { ['--x' as string]: '34%', ['--y' as string]: '270px' },
    label: 'Proses',
    title: 'Neural Infrastructure\nDesigner',
    desc: 'Membangun jaringan data, retrieval, dan reasoning untuk mengekstrak sinyal klinis.',
  },
  {
    className: 'fi-thinking-node fi-node-bottom-2',
    style: { ['--x' as string]: '57%', ['--y' as string]: '270px' },
    label: 'Proses',
    title: 'Cognitive Architecture\nEngineer',
    desc: 'Merancang alur berpikir yang menjelaskan alasan, batas, ketidakpastian, dan rekomendasi.',
  },
  {
    className: 'fi-thinking-node fi-node-output',
    style: { ['--x' as string]: '88%', ['--y' as string]: '171px' },
    label: 'Keluaran',
    title: 'Responsible\nClinical Intelligence',
    desc: 'Insight yang lebih jernih. Keputusan yang lebih baik. Care yang lebih aman.',
  },
] as const

export const transitions = {
  fast: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  medium: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  slow: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  epic: { duration: 2.0, ease: [0.16, 1, 0.3, 1] },
  dramatic: { duration: 0.6, ease: [0.22, 1.61, 0.36, 1] },
} as const

export const motionVariants = {
  fadeUp: {
    hidden: { y: 40, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
  fadeDown: {
    hidden: { y: -20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
  slideIn: {
    hidden: { x: -60, opacity: 0 },
    visible: { x: 0, opacity: 1 },
  },
  scaleReveal: {
    hidden: { scale: 0.92, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
} as const

export const motionViewport = { once: true, amount: 0.15 }

export const thinkingMeta = {
  sectionLabel: 'SENTRA TABLET',
  editionLabel: '7 JULI 2026',
  notesLabel: 'Terus berkembang',
  lastUpdatedLabel: 'Terus berkembang',
} as const

export const staggerContainer = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
})

export function getRevealInitial<T>(
  isMotionReady: boolean,
  shouldReduce: boolean | null,
  hiddenState: T
): T | false {
  if (!isMotionReady || shouldReduce) {
    return false
  }

  return hiddenState
}

function subscribe() {
  return () => {}
}

export function useMotionReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

export type TerminalSpeaker = {
  user: string
  host: string
  path: string
}

export type TerminalLine = {
  id: number
  type: 'command' | 'output' | 'code' | 'banner'
  text?: string
  tone?: 'dim' | 'success' | 'info'
  speaker?: TerminalSpeaker
  complete?: boolean
}

export const terminalSpeaker: TerminalSpeaker = {
  user: 'ferdi',
  host: 'sentrahai.com',
  path: '~/projects/sentrahai.com',
}

export const terminalCode = `import { AgentOrchestrator } from './core';
import { DextonAgent, ClaudeAgent, KimiAgent, AntigravityAgent } from './agents';

const swarm = new AgentOrchestrator({
  mode: 'parallel',
  retryPolicy: 'exponential',
});

swarm.register(DextonAgent);
swarm.register(ClaudeAgent);
swarm.register(KimiAgent);
swarm.register(AntigravityAgent); // Chief insisted`

export function getTerminalDelay(char: string, index: number, baseSpeed: number) {
  if (char === '\n') return 96
  if (char === ' ') return 34 + ((index * 11) % 24)
  if (['.', ',', ';', '{', '}', '(', ')'].includes(char)) return 78
  return baseSpeed + ((char.charCodeAt(0) + index * 17) % 28)
}

export function getCommonPrefixLength(left: string, right: string) {
  const limit = Math.min(left.length, right.length)
  let index = 0

  while (index < limit && left[index] === right[index]) {
    index += 1
  }

  return index
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function SyntaxHighlightedCode({ text = '' }: { text?: string }) {
  const tokens: ReactNode[] = []
  const matcher =
    /\b(import|from|const|let|var|new|class|function|return|if|else|async|await)\b|\b(AgentOrchestrator|DextonAgent|ClaudeAgent|KimiAgent)\b|('[^']*')|\b(\d+)\b/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = matcher.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push(text.slice(cursor, match.index))
    }

    const [value, keyword, className, stringValue] = match
    if (keyword) {
      tokens.push(
        <span className="fi-terminal-sh-keyword" key={`${match.index}-keyword`}>
          {value}
        </span>
      )
    } else if (className) {
      tokens.push(
        <span className="fi-terminal-sh-class" key={`${match.index}-class`}>
          {value}
        </span>
      )
    } else if (stringValue) {
      tokens.push(
        <span className="fi-terminal-sh-string" key={`${match.index}-string`}>
          {value}
        </span>
      )
    } else {
      tokens.push(
        <span className="fi-terminal-sh-number" key={`${match.index}-number`}>
          {value}
        </span>
      )
    }

    cursor = match.index + value.length
  }

  if (cursor < text.length) {
    tokens.push(text.slice(cursor))
  }

  return <>{tokens}</>
}
