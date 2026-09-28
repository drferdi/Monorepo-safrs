import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { definitionFor, resetDiseaseDefinitionsCache, useDiseaseDefinitions } from './useDiseaseDefinitions';

const KB = {
  _metadata: { version: 'test' },
  penyakit: [
    { icd10: 'I50', definisi: '  Gagal jantung adalah sindrom klinis.  ' },
    { icd10: 'J06', definisi: 'Infeksi saluran pernafasan atas.' },
    { icd10: 'K29.7', definisi: '' },
  ],
};

describe('definitionFor', () => {
  const map = new Map([
    ['I50', 'Gagal jantung adalah sindrom klinis.'],
    ['J06', 'Infeksi saluran pernafasan atas.'],
  ]);

  it('matches the exact code, ignoring the dot and case', () => {
    expect(definitionFor(map, 'i50')).toBe('Gagal jantung adalah sindrom klinis.');
  });

  it('falls back to the three-character ICD root, as the knowledge-base lookup does', () => {
    expect(definitionFor(map, 'J06.9')).toBe('Infeksi saluran pernafasan atas.');
  });

  it('returns null when the knowledge base has no entry', () => {
    expect(definitionFor(map, 'K65.0')).toBeNull();
  });
});

describe('useDiseaseDefinitions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetDiseaseDefinitionsCache();
  });

  it('loads the definitions from the bundled knowledge base, trimmed, skipping empty ones', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(KB)));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDiseaseDefinitions());
    await waitFor(() => expect(result.current.size).toBe(2));
    expect(fetchMock).toHaveBeenCalledWith('/data/penyakit.json');
    expect(result.current.get('I50')).toBe('Gagal jantung adalah sindrom klinis.');
    expect(result.current.has('K297')).toBe(false);
  });

  it('stays empty when the knowledge base cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const { result } = renderHook(() => useDiseaseDefinitions());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.size).toBe(0);
  });
});
