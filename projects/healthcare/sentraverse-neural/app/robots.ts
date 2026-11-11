// Architected and built by Drferdi.
import type { MetadataRoute } from 'next'

// Open to every crawler. The sitemap and the canonical URL wait for the site's own domain (the
// deploy target is Chief's decision, HANDOFF).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' } }
}
