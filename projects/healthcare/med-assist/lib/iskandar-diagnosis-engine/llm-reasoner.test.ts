import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isOpenAIAvailable, runLLMReasoning } from './llm-reasoner';
import { OPENAI_CONFIG_STORAGE_KEY } from './openai-key-store';
import type { MatchedCandidate } from './symptom-matcher';

const storageGet = vi.fn();
const storageSet = vi.fn().mockResolvedValue(undefined);
const fetchMock = vi.fn();

/** Seed browser.storage.local with the given OpenAI config (or nothing). */
function seedStoredConfig(config?: { apiKey: string; model?: string }) {
  storageGet.mockImplementation(async (key: string) => {
    if (key === OPENAI_CONFIG_STORAGE_KEY && config) {
      return { [OPENAI_CONFIG_STORAGE_KEY]: config };
    }
    return {};
  });
}

function makeCandidate(overrides: Partial<MatchedCandidate> = {}): MatchedCandidate {
  return {
    diseaseId: 'J06',
    nama: 'ISPA',
    icd10: 'J06',
    kompetensi: '4A',
    bodySystem: 'respiratory',
    matchScore: 0.5,
    rawMatchScore: 0.5,
    matchedSymptoms: ['demam', 'batuk'],
    totalSymptoms: 3,
    redFlags: [],
    terpiData: [],
    kriteria_rujukan: '',
    definisi: 'Infeksi saluran pernapasan akut.',
    diagnosisBanding: [],
    ...overrides,
  };
}

beforeEach(() => {
  storageGet.mockReset();
  storageSet.mockClear();
  fetchMock.mockReset();
  seedStoredConfig(undefined);
  (
    globalThis as typeof globalThis & {
      browser?: { storage: { local: { get: typeof storageGet; set: typeof storageSet } } };
    }
  ).browser = {
    storage: { local: { get: storageGet, set: storageSet } },
  };
  globalThis.fetch = fetchMock as typeof fetch;
});

describe('isOpenAIAvailable', () => {
  it('returns false when no API key is stored', async () => {
    const result = await isOpenAIAvailable();
    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns true when a stored key reaches the OpenAI models endpoint', async () => {
    seedStoredConfig({ apiKey: 'sk-test-key' });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    const result = await isOpenAIAvailable();
    expect(result).toBe(true);
  });

  it('returns false when the OpenAI API is down (key present)', async () => {
    seedStoredConfig({ apiKey: 'sk-test-key' });
    fetchMock.mockRejectedValue(new Error('Connection refused'));
    const result = await isOpenAIAvailable();
    expect(result).toBe(false);
  });
});

describe('runLLMReasoning — fail-closed key handling', () => {
  it('returns fail-closed local result when no KB candidates are provided', async () => {
    const result = await runLLMReasoning({
      candidates: [],
      keluhanUtama: 'Demam dan batuk 3 hari',
    });

    expect(result.source).toBe('local');
    expect(result.modelVersion).toBe('IDE-V1-KB-empty');
    expect(result.suggestions).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('degrades to KB-only (no crash, no network) when key is not configured', async () => {
    const result = await runLLMReasoning({
      candidates: [makeCandidate()],
      keluhanUtama: 'Demam dan batuk 3 hari',
    });

    expect(result.source).toBe('local');
    expect(result.modelVersion).toBe('IDE-V1-KB');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.dataQualityWarnings.join(' ')).toContain('Pengaturan');
  });

  it('uses the stored key and model when configured', async () => {
    seedStoredConfig({ apiKey: 'sk-live-key', model: 'gpt-5.4-mini' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    rank: 1,
                    diagnosis_name: 'ISPA',
                    icd10_code: 'J06',
                    confidence: 0.6,
                    reasoning: 'Sesuai keluhan.',
                    red_flags: [],
                    recommended_actions: [],
                  },
                ],
              }),
            },
          },
        ],
      }),
    });

    const result = await runLLMReasoning({
      candidates: [makeCandidate()],
      keluhanUtama: 'Demam dan batuk 3 hari',
    });

    expect(result.source).toBe('ai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer sk-live-key',
    });
    expect(JSON.parse((init as RequestInit).body as string).model).toBe('gpt-5.4-mini');
  });
});

describe('runLLMReasoning — hard-gate invent (reranker only)', () => {
  function mockLlmSuggestions(
    suggestions: Array<{
      diagnosis_name: string;
      icd10_code: string;
      confidence: number;
      reasoning?: string;
    }>
  ): void {
    seedStoredConfig({ apiKey: 'sk-live-key', model: 'gpt-5.4-mini' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: suggestions.map((s, i) => ({
                  rank: i + 1,
                  diagnosis_name: s.diagnosis_name,
                  icd10_code: s.icd10_code,
                  confidence: s.confidence,
                  reasoning: s.reasoning || 'LLM reasoning.',
                  red_flags: [],
                  recommended_actions: [],
                })),
              }),
            },
          },
        ],
      }),
    });
  }

  it('drops invented ICD codes that are outside the KB candidate set', async () => {
    mockLlmSuggestions([
      {
        diagnosis_name: 'ISPA',
        icd10_code: 'J06',
        confidence: 0.7,
        reasoning: 'Sesuai kandidat KB.',
      },
      {
        diagnosis_name: 'Penyakit cacing tambang',
        icd10_code: 'B76',
        confidence: 0.99,
        reasoning: 'Invented outside candidates.',
      },
      {
        diagnosis_name: 'Sepsis',
        icd10_code: 'A41.9',
        confidence: 0.95,
        reasoning: 'Also invented.',
      },
    ]);

    const result = await runLLMReasoning({
      candidates: [
        makeCandidate({ icd10: 'J06', nama: 'ISPA', matchScore: 0.55 }),
        makeCandidate({
          diseaseId: 'J00',
          icd10: 'J00',
          nama: 'Common Cold',
          matchScore: 0.4,
        }),
      ],
      keluhanUtama: 'Demam dan batuk 3 hari',
    });

    expect(result.source).toBe('ai');
    expect(result.suggestions.map((s) => s.icd10_code)).toEqual(['J06']);
    expect(result.suggestions.every((s) => ['J06', 'J00'].includes(s.icd10_code))).toBe(true);
    expect(result.dataQualityWarnings.join(' ')).toMatch(/invent|dropped|candidate/i);
  });

  it('falls back to KB-only when every LLM suggestion is invented', async () => {
    mockLlmSuggestions([
      {
        diagnosis_name: 'Penyakit cacing tambang',
        icd10_code: 'B76',
        confidence: 0.99,
      },
      {
        diagnosis_name: 'Sepsis',
        icd10_code: 'A41.9',
        confidence: 0.95,
      },
    ]);

    const candidates = [
      makeCandidate({ icd10: 'J06', nama: 'ISPA', matchScore: 0.55 }),
      makeCandidate({
        diseaseId: 'J00',
        icd10: 'J00',
        nama: 'Common Cold',
        matchScore: 0.4,
      }),
    ];

    const result = await runLLMReasoning({
      candidates,
      keluhanUtama: 'Demam dan batuk 3 hari',
    });

    expect(result.source).toBe('local');
    expect(result.modelVersion).toBe('IDE-V1-KB');
    expect(result.suggestions.map((s) => s.icd10_code)).toEqual(['J06', 'J00']);
    expect(result.suggestions.some((s) => s.icd10_code === 'B76')).toBe(false);
    expect(result.dataQualityWarnings.join(' ')).toMatch(/invent|KB-only|candidate/i);
  });
});
