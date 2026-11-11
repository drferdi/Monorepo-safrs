
import fs from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { readOptionalEnv, resolveRuntimePathFromEnv } from '@/lib/server/env'
import { resolveRuntimeDataFile } from '@/lib/server/runtime-data-path'
import type { Lb1Config } from './types'

// ─── Path helpers ─────────────────────────────────────────────────────────────

export function getHistoryFile(): string {
  return resolveRuntimePathFromEnv('LB1_HISTORY_FILE', 'runtime/lb1-run-history.jsonl')
}

export function getDataSourceDir(): string {
  return resolveRuntimePathFromEnv('LB1_DATA_SOURCE_DIR', 'runtime/lb1-data')
}

export function getOutputDir(): string {
  return resolveRuntimePathFromEnv('LB1_OUTPUT_DIR', 'runtime/lb1-output')
}

export function getTemplatePath(): string {
  return resolveRuntimePathFromEnv('LB1_TEMPLATE_PATH', 'runtime/Laporan SP3 LB1.xlsx')
}

export function getMappingPath(): string {
  return resolveRuntimePathFromEnv('LB1_MAPPING_PATH', 'runtime/diagnosis_mapping.csv')
}

export function resolveProjectPath(configValue: unknown, fallback: string): string {
  const raw = String(configValue ?? '').trim()
  if (!raw) return fallback
  if (path.isAbsolute(raw)) return raw

  const normalized = raw.replace(/\\/g, '/')
  if (normalized.startsWith('runtime/')) {
    return resolveRuntimeDataFile(normalized.slice('runtime/'.length))
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), raw)
}

export function getConfigPath(): string {
  return resolveRuntimePathFromEnv('LB1_CONFIG_PATH', 'runtime/lb1-config.yaml')
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export function resolveLb1RuntimePaths(config: Lb1Config | null): {
  dataDir: string
  outputDir: string
  templatePath: string
  mappingPath: string
} {
  const lb1 =
    config?.lb1 && typeof config.lb1 === 'object' ? (config.lb1 as Record<string, unknown>) : {}

  return {
    dataDir: getDataSourceDir(),
    outputDir: resolveProjectPath(lb1.output_dir, getOutputDir()),
    templatePath: resolveProjectPath(lb1.template_path, getTemplatePath()),
    mappingPath: resolveProjectPath(lb1.mapping_path, getMappingPath()),
  }
}

export function getLb1RmeCredentialEnvNames(config: Lb1Config | null): {
  usernameEnv: string
  passwordEnv: string
} {
  const usernameEnv = config?.rme?.username_env?.trim() || 'EMR_USERNAME'
  const passwordEnv = config?.rme?.password_env?.trim() || 'EMR_PASSWORD'

  return { usernameEnv, passwordEnv }
}

export function hasLb1RmeCredentials(config: Lb1Config | null): boolean {
  const { usernameEnv, passwordEnv } = getLb1RmeCredentialEnvNames(config)
  return Boolean(readOptionalEnv(usernameEnv) && readOptionalEnv(passwordEnv))
}

// ─── Load YAML config (lb1-config.yaml) ──────────────────────────────────────

export function loadLb1Config(): Lb1Config | null {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) return null

  try {
    // Lazy import js-yaml
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yaml = require('js-yaml') as { load: (s: string) => unknown }
    const content = fs.readFileSync(configPath, 'utf-8')
    return yaml.load(content) as Lb1Config
  } catch (error) {
    console.warn(
      'Gagal membaca config LB1:',
      configPath,
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}
