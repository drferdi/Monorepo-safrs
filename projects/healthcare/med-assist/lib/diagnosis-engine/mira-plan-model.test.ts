// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MIRA_PLAN_MODEL_STORAGE_KEY,
  getMiraPlanModel,
  listMiraPlanModels,
  setMiraPlanModel,
} from './mira-plan-model';

function memoryStorage() {
  const items: Record<string, unknown> = {};
  return {
    items,
    local: {
      get: async (key: string) => (key in items ? { [key]: items[key] } : {}),
      set: async (values: Record<string, unknown>) => void Object.assign(items, values),
      remove: async (key: string) => void delete items[key],
    },
  };
}

describe('MIRA planning model choice', () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal('browser', { storage: { local: storage.local } });
    vi.stubEnv('VITE_MIRA_PLAN_MODELS', ' google/gemini-3.1-flash-lite:nitro, inception/mercury-2,,inception/mercury-2 ');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('lists the build-time options once each, in order', () => {
    expect(listMiraPlanModels()).toEqual(['google/gemini-3.1-flash-lite:nitro', 'inception/mercury-2']);
    expect(listMiraPlanModels('')).toEqual([]);
    expect(listMiraPlanModels(42)).toEqual([]);
  });

  it('stores a choice and clears it back to the service default', async () => {
    await setMiraPlanModel('inception/mercury-2');
    expect(storage.items[MIRA_PLAN_MODEL_STORAGE_KEY]).toBe('inception/mercury-2');
    expect(await getMiraPlanModel()).toBe('inception/mercury-2');

    await setMiraPlanModel(undefined);
    expect(MIRA_PLAN_MODEL_STORAGE_KEY in storage.items).toBe(false);
    expect(await getMiraPlanModel()).toBeUndefined();
  });

  it('ignores a stored model that is no longer offered', async () => {
    storage.items[MIRA_PLAN_MODEL_STORAGE_KEY] = 'openai/gpt-5.4-pro';
    expect(await getMiraPlanModel()).toBeUndefined();
  });

  it('falls back to the service default when storage fails', async () => {
    vi.stubGlobal('browser', undefined);
    expect(await getMiraPlanModel()).toBeUndefined();
  });
});
