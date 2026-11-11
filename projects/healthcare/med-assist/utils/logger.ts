// Designed and constructed by Drferdi.
/**
 * Structured runtime logger with optional debug scopes and log redaction.
 */

export type LoggerScope = 'global' | 'riwayat' | 'background' | 'content' | 'filler';

type LogMethod = 'log' | 'warn' | 'error';

const toBool = (value: unknown): boolean => String(value).toLowerCase() === 'true';

const clampDepth = (depth: number): number => (depth > 4 ? 4 : depth);

const SENSITIVE_KEY_PATTERN =
  /(patient|nama|name|rm|nik|alamat|phone|telp|keluhan|anamnesa|diagnosa|resep|allerg|alergi|pelayanan|encounter|dob|tanggal_lahir)/i;

function sanitizeObject(
  value: Record<string, unknown>,
  depth: number,
  seen: WeakSet<object>
): Record<string, unknown> {
  const nextDepth = clampDepth(depth + 1);
  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = '[REDACTED]';
      continue;
    }

    output[key] = sanitizeForLog(nested, nextDepth, seen);
  }

  return output;
}

/**
 * sanitizeForLog
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export function sanitizeForLog(
  value: unknown,
  depth: number = 0,
  seen: WeakSet<object> = new WeakSet<object>()
): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > 240 ? `${value.slice(0, 237)}...` : value;
  }

  if (typeof value === 'function') {
    return '[Function]';
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  if (depth >= 4) {
    return '[Truncated]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const nextDepth = clampDepth(depth + 1);
    return value.slice(0, 20).map((item) => sanitizeForLog(item, nextDepth, seen));
  }

  return sanitizeObject(value as Record<string, unknown>, depth, seen);
}

/**
 * isDebugScopeEnabled
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const isDebugScopeEnabled = (scope: LoggerScope): boolean => {
  const globalEnabled = toBool(import.meta.env.VITE_DEBUG);

  if (scope === 'global') {
    return globalEnabled;
  }

  switch (scope) {
    case 'riwayat':
      return toBool(import.meta.env.VITE_DEBUG_RIWAYAT) || globalEnabled;
    case 'background':
      return toBool(import.meta.env.VITE_DEBUG_BACKGROUND) || globalEnabled;
    case 'content':
      return toBool(import.meta.env.VITE_DEBUG_CONTENT) || globalEnabled;
    case 'filler':
      return toBool(import.meta.env.VITE_DEBUG_FILLER) || globalEnabled;
    default:
      return globalEnabled;
  }
};

const emit = (method: LogMethod, prefix: string, args: unknown[]): void => {
  const payload = args.map((arg) => sanitizeForLog(arg));

  if (method === 'error') {
    console.error(prefix, ...payload);
    return;
  }

  if (method === 'warn') {
    console.warn(prefix, ...payload);
    return;
  }

  console.log(prefix, ...payload);
};

export const logger = {
  debug: (...args: unknown[]): void => {
    if (!isDebugScopeEnabled('global')) return;
    emit('log', '[DEBUG]', args);
  },
  riwayat: (...args: unknown[]): void => {
    if (!isDebugScopeEnabled('riwayat')) return;
    emit('log', '[RIWAYAT]', args);
  },
  warn: (...args: unknown[]): void => {
    emit('warn', '[WARN]', args);
  },
  error: (...args: unknown[]): void => {
    emit('error', '[ERROR]', args);
  },
};

/**
 * createLogger
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-03-12
 */

export const createLogger = (scope: string, debugScope: LoggerScope = 'global') => ({
  debug: (...args: unknown[]): void => {
    if (!isDebugScopeEnabled(debugScope)) return;
    emit('log', `[${scope}]`, args);
  },
  warn: (...args: unknown[]): void => {
    emit('warn', `[${scope}]`, args);
  },
  error: (...args: unknown[]): void => {
    emit('error', `[${scope}]`, args);
  },
});
