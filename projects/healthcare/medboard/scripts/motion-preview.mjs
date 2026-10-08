// Local component harness. Never serves clinical data or changes application authentication.
import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const capsule = fileURLToPath(new URL('../', import.meta.url))
const harness = path.join(capsule, 'output/playwright/motion-harness')
const files = {
  'package.json': JSON.stringify({ name: 'medboard-motion-preview', version: '0.0.0', private: true }),
  'tsconfig.json': JSON.stringify({
    extends: '../../../tsconfig.json',
    compilerOptions: { baseUrl: '.', paths: { '@/*': ['../../../src/*'] }, incremental: false },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts', '.next/dev/types/**/*.ts'],
    exclude: ['node_modules'],
  }),
  'next.config.mjs': 'export default { experimental: { externalDir: true }, devIndicators: false }\n',
  'postcss.config.mjs': 'export default { plugins: { "@tailwindcss/postcss": {} } }\n',
  'app/layout.tsx': `import type { ReactNode } from 'react'
import '@fontsource-variable/ibm-plex-sans'
import '../../../../src/app/globals.css'
import '../../../../src/app/ui.css'
import '../../../../src/app/shell.css'
import '@/components/motion/motion.css'
import MotionProvider, { MotionViewport } from '@/components/motion/MotionProvider'
import MotionLink from '@/components/motion/MotionLink'
import AppNav from '@/components/AppNav'
import VerificationControls from './verification-controls'
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="id"><body><MotionProvider><div className="app-shell">
    <AppNav /><div className="app-main"><header className="app-header">
      <MotionLink href="/motion">MedBoard · Motion Studio</MotionLink>
      <span>Local visual verification</span>
    </header><main className="app-content"><MotionViewport>{children}</MotionViewport><VerificationControls /></main></div>
  </div></MotionProvider></body></html>
}
`,
  'app/page.tsx': `export { default } from '@/components/motion/MotionStudio'\n`,
  'app/motion/page.tsx': `export { default } from '@/components/motion/MotionStudio'\n`,
  'app/[workspace]/page.tsx': `import MotionLink from '@/components/motion/MotionLink'
import MotionSurface from '@/components/motion/MotionSurface'
const names: Record<string, string> = { calculator: 'Algorithma', icdx: 'ICD Coding', atlas: 'Atlas Anatomi', hub: 'Sentra Hub', emr: 'Intelligence EMR', acars: 'Sentra Network', chat: 'Sentra Social', sentrapedia: 'Sentrapedia', 'critical-mind': 'Critical Mind' }
export default async function Workspace({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params
  return <section><h1>{names[workspace] ?? workspace}</h1>
    <p>Local navigation fixture. No clinical or operational data.</p>
    <MotionSurface className="ui-card"><div className="ui-card__body">
      <h2>Workspace</h2><p>Production motion components and route coordinator.</p>
    </div></MotionSurface>
    <nav aria-label="Ruang kerja"><MotionLink href="/motion">Motion Studio</MotionLink>{' · '}
      <MotionLink href="/calculator">Algorithma</MotionLink>{' · '}
      <MotionLink href="/icdx">ICD Coding</MotionLink>{' · '}
      <MotionLink href="/atlas">Atlas Anatomi</MotionLink>{' · '}
      <MotionLink href="/hub">Sentra Hub</MotionLink>{' · '}
      <MotionLink href="/sentrapedia">Sentrapedia</MotionLink>{' · '}
      <MotionLink href="/critical-mind">Critical Mind</MotionLink>{' · '}
      <MotionLink href="/emr">Intelligence EMR</MotionLink>
    </nav></section>
}
`,
  'app/verification-controls.tsx': `'use client'
export default function VerificationControls() {
  return <details><summary>Local verification controls</summary>
    <button type="button" onClick={() => {
      const canvas = document.querySelector<HTMLCanvasElement>('.dashboard-motion-portal')
      const gl = canvas?.getContext('webgl2')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    }}>Simulate WebGL loss</button>
  </details>
}
`,
}

for (const [name, content] of Object.entries(files)) {
  const destination = path.join(harness, name)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, content)
}
if (process.argv.includes('--prepare')) process.exit(0)
const child = spawn(process.execPath, [path.join(capsule, 'node_modules/next/dist/bin/next'), 'dev', harness, '--webpack', '--hostname', '127.0.0.1', '--port', '4347'], {
  cwd: capsule,
  stdio: 'inherit',
  windowsHide: true,
})
child.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
