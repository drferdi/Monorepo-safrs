// Architected and built by Drferdi.
import { spawn } from 'node:child_process'

type Suite = {
  name: string
  aliases?: string[]
  command: string
  args: string[]
}

const suites: Suite[] = [
  {
    name: 'doctors-contacts-route',
    aliases: ['doctors-contacts', 'send-to-doctors'],
    command: process.execPath,
    // Uses --import (not the tsx CLI wrapper) with --conditions react-server so the route's
    // server-only import chain (crew-access-auth -> prisma) resolves under node --test.
    args: [
      '--conditions',
      'react-server',
      '--import',
      'tsx',
      '--test',
      'src/app/api/doctors/contacts/route.test.ts',
    ],
  },
  {
    name: 'assist-acceptance',
    aliases: ['assist', 'consult-events', 'anamnesis-extract'],
    command: process.execPath,
    // react-server condition: these modules import server-only.
    args: [
      '--conditions',
      'react-server',
      '--import',
      'tsx',
      '--test',
      'src/lib/telemedicine/consult-intelligence-events.test.ts',
      'src/app/api/clinical/anamnesis/extract/route.post.test.ts',
      'src/lib/cdss/engine-prompt.test.ts',
      'src/lib/emr/bridge-queue.test.ts',
    ],
  },
  {
    name: 'crew-access',
    aliases: ['registration', 'presence', 'acars'],
    command: process.execPath,
    // react-server condition: these modules import server-only.
    args: [
      '--conditions',
      'react-server',
      '--import',
      'tsx',
      '--test',
      'src/lib/server/crew-access-registration.test.ts',
      'src/lib/server/crew-presence.test.ts',
      'src/app/api/presence/route.test.ts',
      'src/lib/crew-online.test.ts',
      'src/lib/crew-access.test.ts',
    ],
  },
  {
    name: 'sentrapedia-contributions',
    aliases: ['sentrapedia', 'contributions'],
    command: process.execPath,
    // react-server condition: the routes import server-only.
    args: [
      '--conditions',
      'react-server',
      '--import',
      'tsx',
      '--test',
      'src/lib/server/sentrapedia-contributions.test.ts',
      'src/app/api/sentrapedia/contributions/route.test.ts',
    ],
  },
  {
    name: 'design',
    aliases: ['redesign', 'shell', 'tokens'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', '--test', 'src/app/design-tokens.test.ts',
      'src/app/text-case.test.ts', 'src/app/icons.test.ts', 'src/lib/text/sentence-case.test.ts', 'src/lib/text/tidy-case.test.ts', 'src/lib/text/tidy-field.test.ts', 'src/components/ui/ui.test.tsx', 'src/components/shell/shell.test.ts',
      'src/app/voice/audrey-page.test.ts', 'src/app/voice/visual/matrix-orb.test.ts', 'src/components/sign-in/intro.test.ts', 'src/components/sign-in/sentra-lockup.test.tsx'],
  },
  {
    name: 'profile',
    aliases: ['critical-mind', 'heatmap'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', '--test', 'src/lib/critical-mind/library.test.ts',
      'src/lib/report/clinical-activity.test.ts'],
  },
  {
    name: 'icd-coding',
    aliases: ['icdx', 'icd'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', '--test', 'src/app/icdx/icdx-page.test.ts', 'src/lib/icd/fuzzy.test.ts',
      'src/lib/icd/ai-pick.test.ts', 'src/lib/icd/referral.test.ts',
      'src/lib/icd/who-blocks.test.ts'],
  },
  {
    name: 'atlas',
    aliases: ['anatomy'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', '--test', 'src/lib/atlas/atlas.test.ts', 'src/app/atlas/atlas-page.test.ts'],
  },
  {
    name: 'auth-hardening',
    aliases: ['auth', 'security'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', 'scripts/test-auth-hardening.ts'],
  },
  {
    name: 'passkey-helpers',
    aliases: ['passkey', 'webauthn'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', '--test', 'scripts/test-passkey-helpers.ts'],
  },
  {
    name: 'safety-net',
    aliases: ['cdss', 'diagnosis'],
    command: process.execPath,
    args: ['./node_modules/tsx/dist/cli.mjs', 'scripts/test-cdss.ts'],
  },
  {
    name: 'intelligence-route',
    aliases: ['intelligence', 'trajectory', 'dashboard'],
    command: process.execPath,
    args: [
      './node_modules/tsx/dist/cli.mjs',
      '--test',
      'src/hooks/useEncounterQueue.test.ts',
      'src/hooks/useOperationalMetrics.test.ts',
      'src/hooks/useTrajectoryAnalysis.test.ts',
      'src/lib/clinical/trajectory-analyzer.test.ts',
      'src/lib/clinical/momentum-engine.test.ts',
      'src/lib/clinical/prediction-engine.test.ts',
      'src/lib/vitals/unified-vitals.test.ts',
      'src/lib/cdss/diagnose-parser.test.ts',
      'src/lib/emr/visit-history.test.ts',
      'src/lib/vitals/composite-deterioration.test.ts',
      'src/lib/vitals/instant-red-alerts.test.ts',
      'src/lib/intelligence/ai-insights.test.ts',
      'src/lib/intelligence/observability.test.ts',
      'src/lib/intelligence/server.test.ts',
      'src/lib/intelligence/socket-payload.test.ts',
      'src/lib/telemedicine/consult-to-bridge.test.ts',
      'src/lib/telemedicine/consult-accepted.test.ts',
      'src/lib/telemedicine/consult-api-validation.test.ts',
      'src/lib/telemedicine/consult-vital-signs.test.ts',
      'src/lib/telemedicine/consult-dedupe.test.ts',
      'src/lib/telemedicine/mira-differential.test.ts',
      'src/components/telemedicine/MiraDifferentialCard.test.tsx',
      'src/app/telemedicine/medlink-page.test.ts',
      'src/lib/telemedicine/device-check.test.ts',
      'src/lib/telemedicine/transcript-audio.test.ts',
      'src/lib/telemedicine/epuskesmas-summary.test.ts',
      'src/lib/telemedicine/openrouter.test.ts',
      'src/components/telemedicine/transcript-room.test.ts',
      'src/app/api/telemedicine/token/token-route.test.ts',
      'src/lib/audit/screening-audit-service.test.ts',
      'src/lib/server/doctor-contacts.test.ts',
      'src/app/api/clinical/anamnesis/extract/route.test.ts',
      'src/app/api/dashboard/intelligence/routes.test.ts',
      'src/app/api/dashboard/intelligence/observability-handler.test.ts',
      'src/app/api/dashboard/intelligence/alerts/acknowledge/acknowledge-handler.test.ts',
      'src/app/emr/emergency-override.test.ts',
      'src/app/emr/focus-spotlight.test.ts',
      'src/app/emr/assessment-copy.test.ts',
      'src/app/dashboard/intelligence/AIDisclosureBadge.test.tsx',
      'src/app/dashboard/intelligence/AIInsightsPanel.test.tsx',
      'src/app/dashboard/intelligence/ClinicalSafetyAlertBanner.test.tsx',
      'src/app/dashboard/intelligence/IntelligenceDashboardScaffold.test.tsx',
      'src/app/dashboard/intelligence/IntelligenceSocketProvider.test.tsx',
      'src/app/dashboard/intelligence/OperationalSummaryPanel.test.tsx',
      'src/app/dashboard/intelligence/loading.test.tsx',
      'src/app/dashboard/intelligence/error.test.tsx',
    ],
  },
]

function parseFilters(argv: string[]): string[] {
  const filters: string[] = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--filter') {
      const next = argv[i + 1]
      if (next) {
        filters.push(next.toLowerCase())
        i += 1
      }
      continue
    }

    if (arg.startsWith('--filter=')) {
      const value = arg.slice('--filter='.length).trim()
      if (value) filters.push(value.toLowerCase())
    }
  }

  return filters
}

function matchesFilter(suite: Suite, filter: string): boolean {
  const haystacks = [suite.name, ...(suite.aliases ?? [])].map((value) => value.toLowerCase())
  return haystacks.some((value) => value.includes(filter) || filter.includes(value))
}

function selectSuites(argv: string[]): Suite[] {
  const filters = parseFilters(argv)
  if (filters.length === 0) return suites

  const selected = suites.filter((suite) => filters.some((filter) => matchesFilter(suite, filter)))
  if (selected.length === 0) {
    const available = suites.map((suite) => suite.name).join(', ')
    throw new Error(`Filter suite tidak cocok. Gunakan salah satu: ${available}`)
  }

  return selected
}

async function runSuite(suite: Suite): Promise<void> {
  // All suite commands are process.execPath — validate before spawning.
  // spawn() with a pre-validated binary path and a static arg array (not shell) is not injectable.
  if (suite.command !== process.execPath) {
    throw new Error(`Unexpected suite command: ${suite.command}. Only process.execPath is allowed.`)
  }
  const env: NodeJS.ProcessEnv = { ...process.env }
  if (
    suite.name === 'auth-hardening' &&
    !process.env.DATABASE_URL?.trim() &&
    process.env.SKIP_AUTH_HARDENING !== '0' &&
    process.env.REQUIRE_AUTH_HARDENING !== '1'
  ) {
    console.warn(
      '[test-suite] DATABASE_URL is unset — skipping auth-hardening (set DATABASE_URL or REQUIRE_AUTH_HARDENING=1 to force).'
    )
    env.SKIP_AUTH_HARDENING = '1'
  }
  await new Promise<void>((resolve, reject) => {
    // Binary is always process.execPath (validated above); do not pass suite.command to spawn (Semgrep child_process taint).
    const child = spawn(process.execPath, suite.args, {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(
        new Error(
          `Test suite "${suite.name}" failed with exit code ${code ?? 'unknown'}. Command: ${suite.command} ${suite.args.join(' ')}`
        )
      )
    })

    child.on('error', reject)
  })
}

async function main(): Promise<void> {
  for (const suite of selectSuites(process.argv.slice(2))) {
    await runSuite(suite)
  }
}

void main()
