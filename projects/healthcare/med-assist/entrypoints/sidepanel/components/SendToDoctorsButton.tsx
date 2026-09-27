import { useState } from 'react';
import { browser } from 'wxt/browser';

import { getDoctorContacts, type DoctorContact } from '@/lib/api/bridge-client';
import { buildDoctorAlertLink } from '@/lib/consult/whatsapp-link';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; doctors: DoctorContact[] }
  | { kind: 'error'; message: string };

function openInNewTab(url: string): void {
  void browser.tabs.create({ url });
}

export function SendToDoctorsButton({
  zone,
  openUrl = openInNewTab,
}: {
  zone: 'merah' | 'kuning';
  openUrl?: (url: string) => void;
}) {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  const load = async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', doctors: await getDoctorContacts() });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="emg-send-doctors">
      <button
        type="button"
        className="emg-send-doctors__trigger"
        onClick={() => void load()}
        disabled={state.kind === 'loading'}
      >
        Send to Doctors
      </button>
      {state.kind === 'ready' && state.doctors.length === 0 ? (
        <p className="emg-send-doctors__note">Belum ada nomor WhatsApp dokter di crew portal</p>
      ) : null}
      {state.kind === 'ready' && state.doctors.length > 0 ? (
        <ul className="emg-send-doctors__list">
          {state.doctors.map((doctor) => (
            <li key={doctor.id}>
              <button type="button" onClick={() => openUrl(buildDoctorAlertLink(doctor.whatsappNumber, zone))}>
                {doctor.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {state.kind === 'error' ? <p className="emg-send-doctors__note">{state.message}</p> : null}
    </div>
  );
}
