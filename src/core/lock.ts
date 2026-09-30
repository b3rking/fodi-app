/**
 * The app lock.
 *
 * A 4-digit PIN keeps a phone buyer out of the records and stops anyone
 * quietly editing the books. The default is documented in README.md so it is
 * never lost; the driver can change it in settings, and can turn the lock off
 * entirely.
 *
 * Known trade-off: with no backend there is no "forgot PIN" recovery. The
 * honest handling is the warning at setup — "write it down or turn the lock
 * off" — not a pretend reset button that cannot work.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_KEY = 'fodi.pin.hash';
const PIN_SALT_KEY = 'fodi.pin.salt';
const LOCK_ENABLED_KEY = 'fodi.lock.enabled';

/** Documented in README.md. Change it in settings if you want something private. */
export const DEFAULT_PIN = '5832';

const AUTO_LOCK_AFTER_MS = 5 * 60 * 1000;

function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_KEY)) !== null;
}

export async function isLockEnabled(): Promise<boolean> {
  if ((await SecureStore.getItemAsync(LOCK_ENABLED_KEY)) === 'false') return false;
  return hasPin();
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_KEY, await hashPin(pin, salt));
  await SecureStore.setItemAsync(LOCK_ENABLED_KEY, 'true');
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (!salt || !stored) return false;
  return (await hashPin(pin, salt)) === stored;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
  await SecureStore.deleteItemAsync(LOCK_ENABLED_KEY);
}

export async function isDefaultPin(): Promise<boolean> {
  return verifyPin(DEFAULT_PIN);
}

// --- auto-lock while the app is open ---------------------------------------

let backgroundedAt: number | null = null;

export function markBackgrounded(): void {
  backgroundedAt = Date.now();
}

/** True when he has been away long enough that we should ask for the PIN. */
export function shouldRelock(): boolean {
  if (backgroundedAt === null) return false;
  return Date.now() - backgroundedAt > AUTO_LOCK_AFTER_MS;
}

export function resetAutoLock(): void {
  backgroundedAt = null;
}