/**
 * Developer/admin-only picker for the planning model of the MIRA reasoning service.
 *
 * Shown only when the MIRA engine is on, `VITE_MIRA_PLAN_MODELS` lists options, and this is a
 * development build or the signed-in user is an admin. Physicians never see it. The choice is
 * stored device-locally and sent with each MIRA step; the service checks it against its own
 * allowlist.
 */

import React, { useEffect, useState } from 'react';

import {
  getMiraPlanModel,
  listMiraPlanModels,
  setMiraPlanModel,
} from '@/lib/diagnosis-engine/mira-plan-model';
import { getDiagnosisEngineConfig } from '@/lib/iskandar-diagnosis-engine/feature-flags';

async function mayPickModel(): Promise<boolean> {
  if (import.meta.env.DEV === true) return true;
  try {
    const { getStoredSession } = await import('@/lib/api/auth-client');
    return (await getStoredSession())?.user.role === 'admin';
  } catch {
    return false;
  }
}

export const MiraPlanModelPicker: React.FC = () => {
  const models = listMiraPlanModels();
  const offered = models.length > 0 && getDiagnosisEngineConfig().diagnosisEngine === 'mira';
  const [allowed, setAllowed] = useState(false);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!offered) return;
    let active = true;
    void (async () => {
      const permitted = await mayPickModel();
      const current = permitted ? await getMiraPlanModel() : undefined;
      if (!active) return;
      setAllowed(permitted);
      setSelected(current ?? '');
    })();
    return () => {
      active = false;
    };
  }, [offered]);

  if (!offered || !allowed) return null;

  const choose = (next: string) => {
    const previous = selected;
    setSelected(next);
    setMiraPlanModel(next || undefined).catch(() => setSelected(previous));
  };

  return (
    <label className="footer-model-picker">
      <span>Model MIRA</span>
      <select
        aria-label="Model perencanaan MIRA"
        value={selected}
        onChange={(event) => choose(event.target.value)}
      >
        <option value="">Default layanan</option>
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </label>
  );
};
