import { medlensClient } from '@/lib/api/medlens-client';
import type { MedlensRuntimeStatus } from '@/lib/api/medlens-client';
import { useEffect, useState } from 'react';

import { EcgDiagnosticAssist } from './EcgDiagnosticAssist';

const modules = [
  { id: 'cardiolens', label: 'CardioLens', detail: 'EKG / echo / cardiac report', enabled: true },
] as const;

const MEDLENS_LABEL_CLASS = 'sentra-section-label';
const MEDLENS_NOTE_CLASS = 'sentra-footer-note text-left not-italic';

export function MedLensConsole(): JSX.Element {
  const [runtimeStatus, setRuntimeStatus] = useState<MedlensRuntimeStatus | null>(null);
  const [isCheckingRuntime, setIsCheckingRuntime] = useState(true);

  async function refreshRuntimeStatus(): Promise<void> {
    setIsCheckingRuntime(true);
    try {
      const nextStatus = await medlensClient.getRuntimeStatus();
      setRuntimeStatus(nextStatus);
    } finally {
      setIsCheckingRuntime(false);
    }
  }

  useEffect(() => {
    void refreshRuntimeStatus();
  }, []);

  const moduleEnabled = runtimeStatus?.readiness === 'ready';
  const moduleDetail = isCheckingRuntime
    ? 'Memeriksa kesiapan route MedLens...'
    : runtimeStatus?.message || modules[0].detail;
  const runtimeToneClass =
    runtimeStatus?.readiness === 'ready'
      ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-300'
      : 'border-amber-600/30 bg-amber-600/10 text-amber-300';

  return (
    <div className="-mx-1 flex flex-col gap-3 px-2 py-3 fade-in" data-testid="medlens-shell-slot">
      <section className="rounded-xl border border-[var(--sentra-border)] bg-[var(--sentra-card)] p-4 shadow-light-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={MEDLENS_LABEL_CLASS}>Clinical Vision Intelligence</div>
            <div className={MEDLENS_LABEL_CLASS}>Sentra MedLens</div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              isCheckingRuntime
                ? 'border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] text-[var(--text-muted)]'
                : runtimeToneClass
            }`}
          >
            {isCheckingRuntime
              ? 'Runtime: loading'
              : moduleEnabled
                ? 'Runtime: ready'
                : 'Runtime: attention'}
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              disabled={!module.enabled || !moduleEnabled}
              className={`rounded-lg border p-3 text-left shadow-light-soft-inset transition-all ${
                module.enabled && moduleEnabled
                  ? 'border-[var(--accent-border-soft)] bg-[var(--neu-inset-bg)] text-[var(--text-main)]'
                  : 'border-[var(--sentra-border)] bg-[var(--neu-inset-bg)] text-[var(--text-muted)] opacity-60'
              }`}
            >
              <span className={`${MEDLENS_LABEL_CLASS} block`}>{module.label}</span>
              <span className={`${MEDLENS_NOTE_CLASS} mt-1 block leading-4`}>{moduleDetail}</span>
            </button>
          ))}
        </div>
      </section>

      <EcgDiagnosticAssist
        runtimeStatus={runtimeStatus}
        onRetryRuntimeStatus={() => {
          void refreshRuntimeStatus();
        }}
      />
    </div>
  );
}

export default MedLensConsole;
