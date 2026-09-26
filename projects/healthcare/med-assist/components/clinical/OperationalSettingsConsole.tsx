// Designed and constructed by Drferdi.

import {
  Bell,
  Database,
  Eye,
  EyeOff,
  Moon,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Wifi,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import { getAuthConfig, probeApiBaseUrl, saveAuthConfig } from '@/lib/api/auth-client';
import {
  getBridgeConfig,
  getBridgeRuntimeStatus,
  saveBridgeConfig,
  type BridgeRuntimeReadiness,
} from '@/lib/api/bridge-client';
import { SETTINGS_STORAGE_KEY, WORKSPACE_URL_STORAGE_KEY } from '@/lib/app-identity';
import { isOpenAIAvailable } from '@/lib/iskandar-diagnosis-engine/llm-reasoner';
import {
  getStoredOpenAIConfig,
  saveStoredOpenAIConfig,
} from '@/lib/iskandar-diagnosis-engine/openai-key-store';

interface SettingItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const STORAGE_KEY = SETTINGS_STORAGE_KEY;
const DEFAULT_WORKSPACE_URL = 'https://kotakediri.epuskesmas.id';
const DEFAULT_API_BASE_URL = 'https://crew.puskesmasbalowerti.com';

const DEFAULT_SETTINGS: SettingItem[] = [
  {
    id: 'auto-fill',
    label: 'Auto-fill EMR',
    description: 'Automatically fill ePuskesmas forms',
    enabled: true,
  },
  {
    id: 'alerts',
    label: 'Emergency Alerts',
    description: 'Show critical condition warnings',
    enabled: true,
  },
  {
    id: 'bridge',
    label: 'Dashboard Sync',
    description: 'Sync with Sentra Intelligence',
    enabled: true,
  },
  {
    id: 'sounds',
    label: 'Sound Notifications',
    description: 'Play sounds for alerts',
    enabled: false,
  },
  { id: 'dark-mode', label: 'Dark Mode', description: 'Use dark color scheme', enabled: true },
  {
    id: 'telemetry',
    label: 'Usage Analytics',
    description: 'Send anonymous usage data',
    enabled: false,
  },
];

function getExtensionBuildInfo(): { version: string; buildLabel: string } {
  try {
    const manifest = browser.runtime.getManifest();
    return {
      version: manifest.version,
      buildLabel: manifest.version_name?.trim() || 'Manifest build',
    };
  } catch {
    return {
      version: 'unknown',
      buildLabel: 'Manifest unavailable',
    };
  }
}

function loadPersistedSettings(): {
  toggles: Record<string, boolean>;
  workspaceUrl: string;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { toggles: Record<string, boolean>; workspaceUrl: string };
  } catch {
    return null;
  }
}

/**
 * OperationalSettingsConsole
 *
 * @remarks
 * TODO: Add detailed description, parameters, and examples
 * Auto-generated on 2026-04-15
 */

export function OperationalSettingsConsole(): JSX.Element {
  const buildInfo = getExtensionBuildInfo();
  const [settings, setSettings] = useState<SettingItem[]>(() => {
    const persisted = loadPersistedSettings();
    if (!persisted) return DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS.map((s) => ({
      ...s,
      enabled: persisted.toggles[s.id] ?? s.enabled,
    }));
  });

  const [workspaceUrl, setWorkspaceUrl] = useState<string>(() => {
    return loadPersistedSettings()?.workspaceUrl ?? DEFAULT_WORKSPACE_URL;
  });
  const [authBaseUrl, setAuthBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [automationToken, setAutomationToken] = useState('');

  const [saved, setSaved] = useState(false);
  const [bridgeRuntimeStatus, setBridgeRuntimeStatus] = useState<
    BridgeRuntimeReadiness | 'unknown'
  >('unknown');
  const [bridgeRuntimeMessage, setBridgeRuntimeMessage] = useState(
    'Verifikasi server belum dijalankan.'
  );
  const [apiProbeStatus, setApiProbeStatus] = useState<{
    tone: 'neutral' | 'success' | 'error';
    text: string;
  }>({
    tone: 'neutral',
    text: 'Belum dites',
  });
  const [isApiProbeLoading, setIsApiProbeLoading] = useState(false);

  // OpenAI reranker credentials — stored in browser.storage.local (device-local,
  // never synced, never baked into the build). Empty key = LLM rerank disabled,
  // engine falls back to deterministic KB-only mode.
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isOpenaiProbeLoading, setIsOpenaiProbeLoading] = useState(false);
  const [openaiStatus, setOpenaiStatus] = useState<{
    tone: 'neutral' | 'success' | 'error';
    text: string;
  }>({ tone: 'neutral', text: 'Belum diisi' });

  // Expose workspaceUrl for other modules via localStorage
  useEffect(() => {
    localStorage.setItem(WORKSPACE_URL_STORAGE_KEY, workspaceUrl);
  }, [workspaceUrl]);

  useEffect(() => {
    const syncBridgeRuntimeState = async (): Promise<void> => {
      try {
        const config = await getBridgeConfig();
        setSettings((prev) =>
          prev.map((item) => (item.id === 'bridge' ? { ...item, enabled: config.enabled } : item))
        );
        const runtimeStatus = await getBridgeRuntimeStatus();
        setBridgeRuntimeStatus(runtimeStatus.readiness);
        setBridgeRuntimeMessage(runtimeStatus.message);
      } catch {
        setBridgeRuntimeStatus('server_error');
        setBridgeRuntimeMessage('Verifikasi bridge gagal dijalankan.');
      }
    };

    void syncBridgeRuntimeState();
  }, []);

  useEffect(() => {
    const syncAuthConfig = async (): Promise<void> => {
      try {
        const authConfig = await getAuthConfig();
        setAuthBaseUrl(authConfig.baseUrl || DEFAULT_API_BASE_URL);
        setAutomationToken(authConfig.automationToken || '');
      } catch {
        setAuthBaseUrl(DEFAULT_API_BASE_URL);
        setAutomationToken('');
      }
    };
    void syncAuthConfig();
  }, []);

  useEffect(() => {
    const syncOpenAIConfig = async (): Promise<void> => {
      try {
        const cfg = await getStoredOpenAIConfig();
        setOpenaiKey(cfg.apiKey);
        setOpenaiModel(cfg.model ?? '');
        setOpenaiStatus(
          cfg.apiKey
            ? { tone: 'neutral', text: 'Tersimpan (belum dites)' }
            : { tone: 'neutral', text: 'Belum diisi' }
        );
      } catch {
        setOpenaiStatus({ tone: 'neutral', text: 'Belum diisi' });
      }
    };
    void syncOpenAIConfig();
  }, []);

  const toggleSetting = (id: string) => {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleSave = async () => {
    const payload = {
      toggles: Object.fromEntries(settings.map((s) => [s.id, s.enabled])),
      workspaceUrl,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const bridgeEnabled = settings.find((item) => item.id === 'bridge')?.enabled ?? true;
    try {
      await saveAuthConfig({
        baseUrl: authBaseUrl.trim() || DEFAULT_API_BASE_URL,
        automationToken,
      });
      await saveBridgeConfig({ enabled: bridgeEnabled });
      const runtimeStatus = await getBridgeRuntimeStatus();
      setBridgeRuntimeStatus(runtimeStatus.readiness);
      setBridgeRuntimeMessage(runtimeStatus.message);
    } catch {
      setBridgeRuntimeStatus('server_error');
      setBridgeRuntimeMessage('Bridge gagal disimpan atau diverifikasi.');
    }

    try {
      await saveStoredOpenAIConfig({ apiKey: openaiKey, model: openaiModel });
      setOpenaiStatus(
        openaiKey.trim()
          ? { tone: 'neutral', text: 'Tersimpan (belum dites)' }
          : { tone: 'neutral', text: 'Belum diisi' }
      );
    } catch {
      setOpenaiStatus({ tone: 'error', text: 'Gagal menyimpan API key.' });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    setSettings(DEFAULT_SETTINGS);
    setWorkspaceUrl(DEFAULT_WORKSPACE_URL);
    setAuthBaseUrl(DEFAULT_API_BASE_URL);
    setAutomationToken('');
    localStorage.removeItem(STORAGE_KEY);
    try {
      await saveAuthConfig({ baseUrl: DEFAULT_API_BASE_URL, automationToken: '' });
      const bridgeEnabled = DEFAULT_SETTINGS.find((item) => item.id === 'bridge')?.enabled ?? true;
      await saveBridgeConfig({ enabled: bridgeEnabled });
      const runtimeStatus = await getBridgeRuntimeStatus();
      setBridgeRuntimeStatus(runtimeStatus.readiness);
      setBridgeRuntimeMessage(runtimeStatus.message);
    } catch {
      setBridgeRuntimeStatus('server_error');
      setBridgeRuntimeMessage('Reset bridge gagal diverifikasi.');
    }
    setApiProbeStatus({ tone: 'neutral', text: 'Belum dites' });

    setOpenaiKey('');
    setOpenaiModel('');
    try {
      await saveStoredOpenAIConfig({ apiKey: '', model: '' });
    } catch {
      // non-fatal
    }
    setOpenaiStatus({ tone: 'neutral', text: 'Belum diisi' });
  };

  const handleTestOpenAI = async () => {
    setIsOpenaiProbeLoading(true);
    try {
      // Persist first — isOpenAIAvailable() probes the stored key, not the field.
      await saveStoredOpenAIConfig({ apiKey: openaiKey, model: openaiModel });
      if (!openaiKey.trim()) {
        setOpenaiStatus({ tone: 'neutral', text: 'Belum diisi' });
        return;
      }
      const ok = await isOpenAIAvailable();
      setOpenaiStatus(
        ok
          ? { tone: 'success', text: 'Terhubung ✓' }
          : { tone: 'error', text: 'Gagal terhubung — cek API key.' }
      );
    } catch {
      setOpenaiStatus({ tone: 'error', text: 'Gagal terhubung — cek API key.' });
    } finally {
      setIsOpenaiProbeLoading(false);
    }
  };

  const handleTestApiBaseUrl = async () => {
    setIsApiProbeLoading(true);
    try {
      const result = await probeApiBaseUrl(authBaseUrl);
      setApiProbeStatus({
        tone: result.ok ? 'success' : 'error',
        text: result.message,
      });
    } finally {
      setIsApiProbeLoading(false);
    }
  };

  const bridgeRuntimeStatusLabel: Record<typeof bridgeRuntimeStatus, string> = {
    unknown: 'Runtime: loading',
    ready: 'Runtime: server verified',
    disabled: 'Runtime: disabled',
    auth_required: 'Runtime: auth required',
    server_unreachable: 'Runtime: server unreachable',
    server_error: 'Runtime: server error',
  };

  const settingIcons: Record<string, React.ReactNode> = {
    'auto-fill': <Database className="w-3.5 h-3.5" />,
    alerts: <Bell className="w-3.5 h-3.5" />,
    bridge: <Wifi className="w-3.5 h-3.5" />,
    sounds: <Bell className="w-3.5 h-3.5" />,
    'dark-mode': <Moon className="w-3.5 h-3.5" />,
    telemetry: <Shield className="w-3.5 h-3.5" />,
  };

  const bridgeRuntimeToneClass =
    bridgeRuntimeStatus === 'ready'
      ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-300'
      : bridgeRuntimeStatus === 'disabled'
        ? 'border-slate-500/30 bg-slate-500/10 text-slate-300'
        : bridgeRuntimeStatus === 'unknown'
          ? 'border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] text-[var(--text-muted)]'
          : 'border-amber-600/30 bg-amber-600/10 text-amber-300';

  const apiProbeToneClass =
    apiProbeStatus.tone === 'success'
      ? 'text-[#6B9B8A]'
      : apiProbeStatus.tone === 'error'
        ? 'text-[#ef4444]'
        : 'text-[var(--text-muted)]';

  const inputClass =
    'w-full rounded-xl border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] px-3 py-2.5 text-xs text-[var(--text-main)] shadow-light-soft-inset outline-none placeholder:text-[var(--text-muted)] transition-all focus:border-[#6B9B8A]/40 focus:ring-2 focus:ring-[#6B9B8A]/15';

  return (
    <div className="-mx-1 flex flex-col gap-3 px-2 py-3 fade-in">
      <section className="rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-4 shadow-light-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-[#6B9B8A]" />
              <h2 className="text-base font-semibold text-[var(--text-main)]">Pengaturan</h2>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
              Atur endpoint operasional, sinkronisasi bridge, dan preferensi fitur tanpa mengubah
              workflow klinis.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${bridgeRuntimeToneClass}`}
          >
            {bridgeRuntimeStatusLabel[bridgeRuntimeStatus]}
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] px-3 py-2 shadow-light-soft-inset">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Bridge status
            </div>
            <div className="mt-1 text-xs text-[var(--text-main)]">{bridgeRuntimeMessage}</div>
          </div>
          <div className="rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] px-3 py-2 shadow-light-soft-inset">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Build
            </div>
            <div className="mt-1 font-mono text-[10px] text-[var(--text-main)]">
              {buildInfo.buildLabel} · v{buildInfo.version}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-4 shadow-light-soft">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Workspace
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              ePuskesmas URL
            </span>
            <input
              type="text"
              value={workspaceUrl}
              onChange={(e) => setWorkspaceUrl(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Crew API Base URL
            </span>
            <input
              type="text"
              value={authBaseUrl}
              onChange={(e) => setAuthBaseUrl(e.target.value)}
              className={inputClass}
              placeholder="https://crew.example.com"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleTestApiBaseUrl()}
              disabled={isApiProbeLoading}
              className="rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-main)] shadow-light-soft transition-all duration-200 hover:border-[#6B9B8A]/40 hover:text-[var(--accent-med)] disabled:opacity-50"
            >
              {isApiProbeLoading ? 'Testing...' : 'Test API'}
            </button>
            <span className={`text-[10px] ${apiProbeToneClass}`}>{apiProbeStatus.text}</span>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Bridge Automation Token
            </span>
            <input
              type="password"
              value={automationToken}
              onChange={(e) => setAutomationToken(e.target.value)}
              className={inputClass}
              placeholder="Harus sama dengan CREW_ACCESS_AUTOMATION_TOKEN di dashboard"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-4 shadow-light-soft">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#6B9B8A]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            AI Reranker (OpenAI)
          </span>
        </div>
        <p className="mb-3 text-[10px] leading-relaxed text-[var(--text-muted)]">
          Opsional. Kunci disimpan lokal di perangkat ini saja (tidak ikut ter-build/di-share). Bila
          dikosongkan, diagnosis tetap berjalan memakai mesin KB lokal tanpa AI rerank.
        </p>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              OpenAI API Key
            </span>
            <div className="relative">
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className={inputClass}
                placeholder="sk-..."
                aria-label="OpenAI API Key"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowOpenaiKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]"
                aria-label={showOpenaiKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
              >
                {showOpenaiKey ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Model
            </span>
            <input
              type="text"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              className={inputClass}
              placeholder="gpt-4o-mini"
              aria-label="OpenAI Model"
            />
            <span className="block text-[10px] leading-relaxed text-[var(--text-muted)]">
              Nama model API OpenAI kadang punya akhiran versi — cek nama persisnya di dashboard
              OpenAI Anda. Kosongkan untuk memakai default build.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleTestOpenAI()}
              disabled={isOpenaiProbeLoading}
              className="rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-main)] shadow-light-soft transition-all duration-200 hover:border-[#6B9B8A]/40 hover:text-[var(--accent-med)] disabled:opacity-50"
            >
              {isOpenaiProbeLoading ? 'Testing...' : 'Test & Simpan Key'}
            </button>
            <span
              className={`text-[10px] ${
                openaiStatus.tone === 'success'
                  ? 'text-[#6B9B8A]'
                  : openaiStatus.tone === 'error'
                    ? 'text-[#ef4444]'
                    : 'text-[var(--text-muted)]'
              }`}
            >
              {openaiStatus.text}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-4 shadow-light-soft">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Features
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] p-3 shadow-light-soft-inset"
            >
              <div className="flex min-w-0 items-start gap-2">
                <div className="mt-0.5 text-[var(--text-muted)]">{settingIcons[setting.id]}</div>
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-[var(--text-main)]">
                    {setting.label}
                  </span>
                  <span className="block text-[10px] leading-relaxed text-[var(--text-muted)]">
                    {setting.description}
                  </span>
                  {setting.id === 'bridge' ? (
                    <span className="mt-1 block text-[10px] text-[#6B9B8A]">
                      {bridgeRuntimeStatusLabel[bridgeRuntimeStatus].replace(/^Runtime:\s*/i, '')}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting(setting.id)}
                aria-pressed={setting.enabled}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200 ${
                  setting.enabled
                    ? 'border-[#6B9B8A]/40 bg-[#6B9B8A]/80 shadow-glow-green-soft'
                    : 'border-[var(--sentra-border)] bg-[var(--alum-dark)] shadow-light-soft-inset'
                }`}
              >
                <div
                  className="absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-md transition-transform duration-200"
                  style={{ transform: setting.enabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--sentra-border)] py-3 text-xs font-semibold transition-all duration-200 ${
            saved
              ? 'bg-[#6B9B8A]/20 text-[#6B9B8A] shadow-glow-green-soft'
              : 'bg-[var(--neu-inset-bg)] text-[var(--text-main)] shadow-light-soft hover:border-[#6B9B8A]/35 hover:text-[var(--accent-med)] hover:shadow-glow-green-soft'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] px-3 py-2 shadow-light-soft">
          <span className="text-[10px] leading-relaxed text-[var(--text-muted)]">
            Simpan setelah mengubah endpoint, token, atau toggle bridge.
          </span>
          <button
            type="button"
            onClick={() => void handleReset()}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)] transition-all duration-200 hover:text-[var(--text-main)] hover:shadow-light-soft-inset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
