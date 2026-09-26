// Drferdi — vision, brought to life.
import 'server-only'

import {
  readBooleanEnv,
  readEnv,
  readOptionalEnv,
  resolveRuntimePathFromEnv,
} from '@/lib/server/env'
import type { EMRTransferConfig } from './types'

const DEFAULT_EMR_BASE_URL = 'https://kotakediri.epuskesmas.id'

export function getEmrTransferConfig(): EMRTransferConfig {
  const baseUrl = readEnv('EMR_BASE_URL', DEFAULT_EMR_BASE_URL).replace(/\/$/, '')

  return {
    baseUrl,
    loginUrl: readOptionalEnv('EMR_LOGIN_URL') ?? `${baseUrl}/login`,
    sessionStoragePath: resolveRuntimePathFromEnv(
      'EMR_SESSION_STORAGE_PATH',
      'runtime/emr-session.json'
    ),
    headless: readBooleanEnv('EMR_HEADLESS', true),
  }
}

/** Read ePuskesmas credentials directly from env — never stored in config objects. */
export function getEMRCredentials(): { username: string; password: string } {
  return {
    username: readOptionalEnv('EMR_USERNAME') ?? '',
    password: readOptionalEnv('EMR_PASSWORD') ?? '',
  }
}
