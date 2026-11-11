import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const getDoctorContacts = vi.fn();
vi.mock('@/lib/api/bridge-client', () => ({ getDoctorContacts: () => getDoctorContacts() }));
vi.mock('wxt/browser', () => ({ browser: { tabs: { create: vi.fn() } } }));

import { SendToDoctorsButton } from './SendToDoctorsButton';

describe('SendToDoctorsButton', () => {
  it('lists registered doctors and opens WhatsApp for the chosen one', async () => {
    getDoctorContacts.mockResolvedValueOnce([
      { id: 'b', name: 'dr. Budi', whatsappNumber: '6280000000002' },
    ]);
    const openUrl = vi.fn();
    render(<SendToDoctorsButton zone="kuning" openUrl={openUrl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Doctors' }));
    fireEvent.click(await screen.findByRole('button', { name: 'dr. Budi' }));
    expect(openUrl).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/6280000000002\?text=/));
  });

  it('shows a message and opens nothing when no doctor has a number', async () => {
    getDoctorContacts.mockResolvedValueOnce([]);
    const openUrl = vi.fn();
    render(<SendToDoctorsButton zone="merah" openUrl={openUrl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Doctors' }));
    expect(await screen.findByText('Belum ada nomor WhatsApp dokter di crew portal')).toBeInTheDocument();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('shows the error text when the crew API refuses', async () => {
    getDoctorContacts.mockRejectedValueOnce(new Error('Unauthorized'));
    const openUrl = vi.fn();
    render(<SendToDoctorsButton zone="merah" openUrl={openUrl} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send to Doctors' }));
    expect(await screen.findByText('Unauthorized')).toBeInTheDocument();
    expect(openUrl).not.toHaveBeenCalled();
  });
});
