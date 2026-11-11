import 'server-only'

import { readBooleanEnv } from '@/lib/server/env'

/** LEGACY_CDSS_ENGINE_ENABLED=true turns the retired diagnosis engine back on; off when unset. */
export function isLegacyCdssEngineEnabled(): boolean {
  return readBooleanEnv('LEGACY_CDSS_ENGINE_ENABLED', false)
}
