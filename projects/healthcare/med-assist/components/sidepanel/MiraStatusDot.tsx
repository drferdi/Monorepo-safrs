/** Small dot in the header showing whether the MIRA reasoning service is reachable. */
import React, { useEffect, useState } from 'react';

import { MIRA_STATUS_STORAGE_KEY, type MiraStatus } from '@/lib/diagnosis-engine/mira-supervisor';
import { getDiagnosisEngineConfig } from '@/lib/iskandar-diagnosis-engine/feature-flags';

const TITLES: Record<MiraStatus['state'], string> = {
  ready: 'MIRA siap',
  starting: 'MIRA sedang menyala',
  down: 'MIRA mati',
  failed: 'MIRA gagal menyala',
  'not-installed': 'MIRA belum terpasang · jalankan install_host.ps1',
};

export const MiraStatusDot: React.FC = () => {
  const enabled = getDiagnosisEngineConfig().diagnosisEngine !== 'legacy';
  const [status, setStatus] = useState<MiraStatus | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Capture the extension API surface once: the cleanup below must call `removeListener` on the
    // same object `addListener` was called on, not re-resolve the `browser` global at unmount time
    // (tests stub/unstub that global independently of component lifecycle).
    const storage = browser.storage;
    let active = true;
    storage.local
      .get(MIRA_STATUS_STORAGE_KEY)
      .then((raw) => {
        if (active) setStatus((raw[MIRA_STATUS_STORAGE_KEY] as MiraStatus | undefined) ?? null);
      })
      .catch(() => undefined);
    const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local' || !(MIRA_STATUS_STORAGE_KEY in changes)) return;
      setStatus((changes[MIRA_STATUS_STORAGE_KEY].newValue as MiraStatus | undefined) ?? null);
    };
    storage.onChanged.addListener(onChanged);
    return () => {
      active = false;
      storage.onChanged.removeListener(onChanged);
    };
  }, [enabled]);

  if (!enabled || !status) return null;
  const title = status.reason ? `${TITLES[status.state]} · ${status.reason}` : TITLES[status.state];
  return <span className="mira-status-dot" data-state={status.state} title={title} aria-label={title} role="status" />;
};
