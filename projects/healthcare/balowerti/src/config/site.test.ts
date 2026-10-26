import { describe, expect, it } from 'vitest'

import { buildWhatsAppUrl, getSafeCrewPortalUrl, SITE_INFO } from './site'

describe('site config contracts', () => {
  it('builds a WhatsApp URL with the configured international number', () => {
    const url = buildWhatsAppUrl('Halo dokter & tim')

    expect(url).toBe(
      `https://wa.me/${SITE_INFO.whatsappInternational}?text=Halo%20dokter%20%26%20tim`
    )
  })

  it('rejects loopback crew portal URLs by default, including IPv6 localhost', () => {
    expect(getSafeCrewPortalUrl('http://localhost:3000/internal')).toBeNull()
    expect(getSafeCrewPortalUrl('http://127.0.0.1:3000/internal')).toBeNull()
    expect(getSafeCrewPortalUrl('http://[::1]:3000/internal')).toBeNull()
  })

  it('allows loopback crew portal URLs only when explicitly enabled', () => {
    expect(getSafeCrewPortalUrl('http://[::1]:3000/internal', true)).toBe(
      'http://[::1]:3000/internal'
    )
  })
})
