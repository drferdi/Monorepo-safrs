import { describe, it, expect } from 'vitest';

import { getDiagnosisEngineConfig } from './feature-flags';

describe('getDiagnosisEngineConfig', () => {
  it('returns default config with build-time defaults', () => {
    const config = getDiagnosisEngineConfig();
    expect(config.enableTrajectoryBridge).toBe(true);
    expect(config.enableTherapy).toBe(true);
    expect(config.openaiTimeoutMs).toBe(12000);
    expect(config.openaiModel).toBe('gpt-4o-mini');
    expect(config.fallbackToKBOnly).toBe(true);
  });

  it('does not expose an API key field (key lives in browser.storage.local, not env)', () => {
    const config = getDiagnosisEngineConfig();
    expect('openaiApiKey' in config).toBe(false);
    expect('enableOpenAI' in config).toBe(false);
  });

  it('respects environment overrides to disable trajectory bridge', () => {
    const original = process.env.SENTRA_DISABLE_TRAJECTORY_BRIDGE;
    process.env.SENTRA_DISABLE_TRAJECTORY_BRIDGE = 'true';
    const config = getDiagnosisEngineConfig();
    expect(config.enableTrajectoryBridge).toBe(false);
    process.env.SENTRA_DISABLE_TRAJECTORY_BRIDGE = original;
  });

  it('respects environment overrides to disable therapy', () => {
    const original = process.env.SENTRA_DISABLE_THERAPY;
    process.env.SENTRA_DISABLE_THERAPY = 'true';
    const config = getDiagnosisEngineConfig();
    expect(config.enableTherapy).toBe(false);
    process.env.SENTRA_DISABLE_THERAPY = original;
  });

  it('respects custom OpenAI timeout', () => {
    const original = process.env.SENTRA_OPENAI_TIMEOUT_MS;
    process.env.SENTRA_OPENAI_TIMEOUT_MS = '15000';
    const config = getDiagnosisEngineConfig();
    expect(config.openaiTimeoutMs).toBe(15000);
    process.env.SENTRA_OPENAI_TIMEOUT_MS = original;
  });

  it('respects custom OpenAI model', () => {
    const original = process.env.SENTRA_OPENAI_MODEL;
    process.env.SENTRA_OPENAI_MODEL = 'gpt-4o';
    const config = getDiagnosisEngineConfig();
    expect(config.openaiModel).toBe('gpt-4o');
    process.env.SENTRA_OPENAI_MODEL = original;
  });
});
