import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const TEST_DIRECTORIES = ['api', 'components', 'services', 'vite-pages']
const TEST_FILE_PATTERN = /\.test\.tsx?$/

async function findTestFiles(directory) {
  let entries

  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return []
    }
    throw error
  }

  const files = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const path = resolve(directory, entry.name)
        if (entry.isDirectory()) return findTestFiles(path)
        return entry.isFile() && TEST_FILE_PATTERN.test(entry.name) ? [path] : []
      })
  )

  return files.flat()
}

const testFiles = (
  await Promise.all(TEST_DIRECTORIES.map((directory) => findTestFiles(resolve(directory))))
)
  .flat()
  .sort((left, right) => left.localeCompare(right))

if (testFiles.length === 0) {
  throw new Error('No MEDLINK test files were discovered.')
}

const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...testFiles], {
  stdio: 'inherit',
})

child.once('error', (error) => {
  throw error
})

child.once('close', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0)
})
