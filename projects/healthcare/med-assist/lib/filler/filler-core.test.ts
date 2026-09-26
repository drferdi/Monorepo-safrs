// Designed and constructed by Drferdi.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { fillFields, fillSelect } from '@/lib/filler/filler-core';

describe('filler core select compatibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.getElementById('sentra-autosen-animation')?.remove();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills a text input when a select mapping targets a live text-backed field', async () => {
    document.body.innerHTML = '<input name="PeriksaFisik[hasil_imt]" type="text" />';
    const input = document.querySelector<HTMLInputElement>('input')!;
    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));
    input.addEventListener('blur', () => events.push('blur'));

    const result = await fillSelect('input[name="PeriksaFisik[hasil_imt]"]', 'Normal');

    expect(result.success).toBe(true);
    expect(input.value).toBe('Normal');
    expect(events).toEqual(['input', 'change', 'blur']);
  });

  it('does not overwrite an existing text-backed select value', async () => {
    document.body.innerHTML = '<input name="PeriksaFisik[hasil_imt]" type="text" value="Manual" />';
    const input = document.querySelector<HTMLInputElement>('input')!;
    const changeSpy = vi.fn();
    input.addEventListener('change', changeSpy);

    const result = await fillSelect('input[name="PeriksaFisik[hasil_imt]"]', 'Normal');

    expect(result.success).toBe(true);
    expect(input.value).toBe('Manual');
    expect(result.value).toBe('Manual');
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it('does not sleep after the final field in a batch', async () => {
    document.body.innerHTML = '<input name="Anamnesa[keluhan_utama]" />';
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    await fillFields(
      [
        {
          selector: 'input[name="Anamnesa[keluhan_utama]"]',
          value: 'Demam',
          type: 'text',
        },
      ],
      100
    );

    expect(timeoutSpy.mock.calls.some(([, timeout]) => timeout === 100)).toBe(false);
  });

  it('reuses the RME field highlight stylesheet across a fill batch', async () => {
    document.body.innerHTML = `
      <input name="Anamnesa[keluhan_utama]" />
      <input name="PeriksaFisik[detak_nadi]" />
    `;
    const appendSpy = vi.spyOn(document.head, 'appendChild');

    await fillFields(
      [
        {
          selector: 'input[name="Anamnesa[keluhan_utama]"]',
          value: 'Demam',
          type: 'text',
        },
        {
          selector: 'input[name="PeriksaFisik[detak_nadi]"]',
          value: 88,
          type: 'number',
        },
      ],
      0
    );

    const highlightStyleAppends = appendSpy.mock.calls.filter(([node]) => {
      return node instanceof HTMLStyleElement && node.id === 'sentra-autosen-animation';
    });
    expect(highlightStyleAppends).toHaveLength(1);
    expect(document.querySelectorAll('style#sentra-autosen-animation')).toHaveLength(1);
  });
});
