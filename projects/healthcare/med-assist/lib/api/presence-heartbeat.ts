/**
 * Presence heartbeat — keeps this user on MedBoard's ACARS online list while signed in.
 *
 * Its own alarm, not the bridge poll: the bridge can be switched off in Settings, presence cannot.
 * MedBoard drops a user after 90 s without a heartbeat; logout sends the offline call itself
 * (auth-client logout), because the session is gone by the time the alarm is cleared.
 */

import { sendPresence } from './auth-client';

const ALARM_NAME = 'sentra-presence';
/** Chrome's shortest alarm period. */
const PERIOD_MINUTES = 0.5;

let listenerRegistered = false;

/**
 * Listen for the heartbeat alarm. Called synchronously while the service worker starts: an alarm
 * that wakes a suspended worker is delivered only to listeners registered in that first turn.
 */
export function attachPresenceAlarmListener(): void {
  if (listenerRegistered) return;
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void sendPresence('POST');
  });
  listenerRegistered = true;
}

export async function startPresenceHeartbeat(): Promise<void> {
  await sendPresence('POST');
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: PERIOD_MINUTES });
}

export async function stopPresenceHeartbeat(): Promise<void> {
  await browser.alarms.clear(ALARM_NAME);
}
