// Safe URL helpers — prevent javascript:/data: protocol injection in img src and a href.

/**
 * Validates a URL for use as an img src or a href.
 * Allows:
 *   - Relative paths that start with / (not protocol-relative //)
 *   - Absolute http: or https: URLs
 * Blocks: javascript:, data:, vbscript:, // protocol-relative, and malformed values.
 */
export function safeUrl(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback
  // Relative path — safe by construction (browser resolves against current origin)
  if (url.startsWith('/') && !url.startsWith('//')) return url
  // Absolute URL — allow only http/https protocols
  try {
    const { protocol } = new URL(url)
    if (protocol === 'http:' || protocol === 'https:') return url
  } catch {
    // Malformed URL
  }
  return fallback
}

/**
 * Returns a safe href for use in <a href>. Falls back to '#' so the link
 * is inert rather than navigating to a potentially dangerous URL.
 */
export function safeHref(url: string | null | undefined): string {
  return safeUrl(url, '#')
}
