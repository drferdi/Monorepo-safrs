import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { diseaseNoteFor, resetDiseaseNotesCache, useDiseaseNotes, type DiseaseNote } from './useDiseaseNotes';

const KB = {
  _metadata: { version: 'test' },
  penyakit: [
    { icd10: 'I50', definisi: '  Gagal jantung adalah sindrom klinis.  ', komplikasi: ['Edema paru akut', ' ', 'Syok kardiogenik'] },
    { icd10: 'J06', definisi: 'Infeksi saluran pernafasan atas.' },
    { icd10: 'K29.7', definisi: '', komplikasi: [] },
  ],
};

describe('diseaseNoteFor', () => {
  const notes = new Map<string, DiseaseNote>([
    ['I50', { definition: 'Gagal jantung adalah sindrom klinis.', complications: ['Edema paru akut'] }],
    ['J06', { definition: 'Infeksi saluran pernafasan atas.', complications: [] }],
  ]);

  it('matches the exact code, ignoring the dot and case', () => {
    expect(diseaseNoteFor(notes, 'i50')?.definition).toBe('Gagal jantung adalah sindrom klinis.');
  });

  it('falls back to the three-character ICD root, as the knowledge-base lookup does', () => {
    expect(diseaseNoteFor(notes, 'J06.9')?.definition).toBe('Infeksi saluran pernafasan atas.');
  });

  it('returns null when the knowledge base has no entry', () => {
    expect(diseaseNoteFor(notes, 'K65.0')).toBeNull();
  });
});

describe('useDiseaseNotes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetDiseaseNotesCache();
  });

  it('loads definitions and complications from the bundled knowledge base, trimmed, skipping empty entries', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(KB)));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDiseaseNotes());
    await waitFor(() => expect(result.current.size).toBe(2));
    expect(fetchMock).toHaveBeenCalledWith('/data/penyakit.json');
    expect(result.current.get('I50')).toEqual({
      definition: 'Gagal jantung adalah sindrom klinis.',
      complications: ['Edema paru akut', 'Syok kardiogenik'],
    });
    expect(result.current.get('J06')).toEqual({ definition: 'Infeksi saluran pernafasan atas.', complications: [] });
    expect(result.current.has('K297')).toBe(false);
  });

  it('stays empty when the knowledge base cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const { result } = renderHook(() => useDiseaseNotes());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.size).toBe(0);
  });
});
