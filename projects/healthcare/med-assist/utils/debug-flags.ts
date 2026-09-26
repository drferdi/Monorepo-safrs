// Designed and constructed by Drferdi.
/**
 * Runtime debug flags for targeted diagnostics.
 */

import { isDebugScopeEnabled, logger } from './logger';

/**
 * isGlobalDebugEnabled
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const isGlobalDebugEnabled = (): boolean => isDebugScopeEnabled('global');

/**
 * isRiwayatDebugEnabled
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const isRiwayatDebugEnabled = (): boolean => isDebugScopeEnabled('riwayat');

/**
 * riwayatDebugLog
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const riwayatDebugLog = (...args: unknown[]): void => {
  if (isRiwayatDebugEnabled()) logger.riwayat(...args);
};

/**
 * riwayatDebugWarn
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const riwayatDebugWarn = (...args: unknown[]): void => {
  if (isRiwayatDebugEnabled()) logger.warn(...args);
};
