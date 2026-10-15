import * as SecureStore from 'expo-secure-store';

const PIN_HASH_KEY = 'app_pin_hash';
const PIN_SALT_KEY = 'app_pin_salt';
const LOCK_ENABLED_KEY = 'lock_enabled';
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function setupPin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('Le PIN doit contenir exactement 4 chiffres.');
  }
  const salt = randomSalt();
  const hash = await sha256(pin + salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(LOCK_ENABLED_KEY, 'true');
}

export async function changePin(oldPin: string, newPin: string): Promise<void> {
  if (!/^\d{4}$/.test(newPin)) {
    throw new Error('Le nouveau PIN doit contenir exactement 4 chiffres.');
  }
  const valid = await verifyPin(oldPin);
  if (!valid) throw new Error('PIN actuel incorrect.');
  await setupPin(newPin);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
  if (!hash || !salt) return false;
  const attempt = await sha256(pin + salt);
  return attempt === hash;
}

export async function isLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(LOCK_ENABLED_KEY)) === 'true';
}

export async function disableLock(): Promise<void> {
  await SecureStore.setItemAsync(LOCK_ENABLED_KEY, 'false');
}

export async function enableLock(): Promise<void> {
  await SecureStore.setItemAsync(LOCK_ENABLED_KEY, 'true');
}

export async function hasPinSet(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return hash != null;
}

// --- Anti-capture ---
export async function setScreenCaptureBlocked(blocked: boolean): Promise<void> {
  try {
    const { ScreenCapture } = require('expo-screen-capture');
    if (blocked) {
      await ScreenCapture.preventScreenCaptureAsync();
    } else {
      await ScreenCapture.allowScreenCaptureAsync();
    }
  } catch {
    // Disponible uniquement sur Android — ignoré sinon.
  }
}

// --- Auto-lock ---
let lastActiveTs = Date.now();
export function recordActivity(): void {
  lastActiveTs = Date.now();
}
export function shouldAutoLock(): boolean {
  return Date.now() - lastActiveTs > LOCK_TIMEOUT_MS;
}
