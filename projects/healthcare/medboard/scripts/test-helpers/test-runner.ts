// Architected and built by Drferdi.
import fs from 'node:fs/promises'
import path from 'node:path'

export type TestResult = {
  name: string
  status: 'PASS' | 'FAIL'
  error?: string
}

type TestCase = {
  name: string
  run: () => Promise<void> | void
}

export function createTestRunner() {
  const tests: TestCase[] = []
  const results: TestResult[] = []

  function test(name: string, run: () => Promise<void> | void): void {
    tests.push({ name, run })
  }

  async function runAll(): Promise<TestResult[]> {
    for (const current of tests) {
      try {
        await current.run()
        results.push({ name: current.name, status: 'PASS' })
      } catch (error) {
        results.push({
          name: current.name,
          status: 'FAIL',
          error: error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error),
        })
      }
    }

    return results
  }

  return { test, runAll, results }
}

export async function writeTestReport(
  fileName: string,
  title: string,
  results: TestResult[]
): Promise<void> {
  const runtimeDir = path.join(process.cwd(), 'runtime')
  await fs.mkdir(runtimeDir, { recursive: true })

  const passCount = results.filter(result => result.status === 'PASS').length
  const failCount = results.length - passCount

  const lines = [
    title,
    `Generated: ${new Date().toISOString()}`,
    `Total: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`,
    '',
  ]

  for (const result of results) {
    lines.push(`[${result.status}] ${result.name}`)
    if (result.error) {
      lines.push(result.error)
      lines.push('')
    }
  }

  await fs.writeFile(path.join(runtimeDir, fileName), lines.join('\n'), 'utf-8')
}
