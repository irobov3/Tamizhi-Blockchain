/**
 * Lightweight haptic feedback helper.
 *
 * Uses React Native's built-in `Vibration` API so we don't add an
 * `expo-haptics` native dependency (which would need a fresh prebuild
 * and could destabilise the existing 136MB working APK).
 *
 * Honors the user's `vibrationEnabled` setting from the store.
 */

import { Vibration, Platform } from 'react-native';
import { useStore } from '../store/useStore';

function shouldVibrate(): boolean {
  try {
    return useStore.getState().settings.vibrationEnabled;
  } catch {
    return true;
  }
}

/** Short tap — for button presses, toggles. */
export function impactLight(): void {
  if (!shouldVibrate()) return;
  Vibration.vibrate(Platform.OS === 'android' ? 10 : 1);
}

/** Medium pulse — message sent, action confirmed. */
export function impactMedium(): void {
  if (!shouldVibrate()) return;
  Vibration.vibrate(Platform.OS === 'android' ? 25 : 1);
}

/** Strong pulse — call answered, important alert. */
export function impactHeavy(): void {
  if (!shouldVibrate()) return;
  Vibration.vibrate(Platform.OS === 'android' ? 50 : 1);
}

/** Notification pattern — incoming message / call. */
export function notify(): void {
  if (!shouldVibrate()) return;
  Vibration.vibrate([0, 80, 60, 80]);
}

/** Error pattern — failed send, network error. */
export function error(): void {
  if (!shouldVibrate()) return;
  Vibration.vibrate([0, 40, 40, 40, 40, 40]);
}

export function cancel(): void {
  Vibration.cancel();
}
