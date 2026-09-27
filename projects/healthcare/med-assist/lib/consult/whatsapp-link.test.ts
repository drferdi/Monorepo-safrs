import { describe, expect, it } from 'vitest';

import { buildDoctorAlertLink } from './whatsapp-link';

describe('buildDoctorAlertLink', () => {
  it('builds a wa.me link carrying only the triage zone', () => {
    const url = buildDoctorAlertLink('6280000000001', 'kuning');
    expect(url).toBe(
      'https://wa.me/6280000000001?text=' +
        encodeURIComponent('Sentra Assist: konsul triase KUNING. Mohon cek Sentra Assist.')
    );
  });

  it('keeps digits only', () => {
    expect(buildDoctorAlertLink('+62 800-0000-0001', 'merah')).toMatch(/^https:\/\/wa\.me\/6280000000001\?text=/);
  });
});
