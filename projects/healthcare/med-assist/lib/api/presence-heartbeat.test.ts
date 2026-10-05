import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ sendPresence: vi.fn() }));

vi.mock('./auth-client', () => auth);

type AlarmListener = (alarm: { name: string }) => void;
let alarmListeners: AlarmListener[] = [];
const alarmsCreate = vi.fn();
const alarmsClear = vi.fn();

function fireAlarm(name: string): void {
  alarmListeners.forEach((listener) => listener({ name }));
}

async function loadHeartbeat() {
  return import('./presence-heartbeat');
}

describe('presence heartbeat', () => {
  beforeEach(() => {
    vi.resetModules();
    alarmListeners = [];
    alarmsCreate.mockReset();
    alarmsClear.mockReset();
    auth.sendPresence.mockReset();
    auth.sendPresence.mockResolvedValue(true);
    vi.stubGlobal('browser', {
      alarms: {
        onAlarm: { addListener: (listener: AlarmListener) => alarmListeners.push(listener) },
        create: alarmsCreate,
        clear: alarmsClear,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starting sends a heartbeat at once and every 30 seconds, the shortest Chrome alarm', async () => {
    const { startPresenceHeartbeat } = await loadHeartbeat();

    await startPresenceHeartbeat();

    expect(auth.sendPresence).toHaveBeenCalledWith('POST');
    expect(alarmsCreate).toHaveBeenCalledWith('sentra-presence', { periodInMinutes: 0.5 });
  });

  it('each alarm sends one heartbeat, and other alarms send none', async () => {
    const { attachPresenceAlarmListener } = await loadHeartbeat();
    attachPresenceAlarmListener();
    attachPresenceAlarmListener();

    fireAlarm('sentra-presence');
    fireAlarm('sentra-bridge-poll');

    expect(alarmListeners).toHaveLength(1);
    expect(auth.sendPresence).toHaveBeenCalledTimes(1);
  });

  it('stopping clears the alarm so a logged-out user is not reported online', async () => {
    const { stopPresenceHeartbeat } = await loadHeartbeat();

    await stopPresenceHeartbeat();

    expect(alarmsClear).toHaveBeenCalledWith('sentra-presence');
    expect(auth.sendPresence).not.toHaveBeenCalled();
  });
});
