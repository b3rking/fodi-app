import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_HASH_KEY = 'app_pin_hash';
const PIN_SALT_KEY = 'app_pin_salt';
const LOCK_ENABLED_KEY = 'lock_enabled';
const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const LOCK_TIMEOUT_KEY = 'lockTimeoutMs';
export const MIN_LOCK_TIMEOUT_MS = 10_000;
const MAX_LOCK_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export async function getLockTimeoutMs(): Promise<number> {
  const stored = await SecureStore.getItemAsync(LOCK_TIMEOUT_KEY);
  const parsed = stored ? Number(stored) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_LOCK_TIMEOUT_MS;
  return Math.min(MAX_LOCK_TIMEOUT_MS, Math.max(MIN_LOCK_TIMEOUT_MS, parsed));
}

export async function setLockTimeoutMs(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms < MIN_LOCK_TIMEOUT_MS) {
    throw new Error('Délai minimum : 10 secondes.');
  }
  await SecureStore.setItemAsync(LOCK_TIMEOUT_KEY, String(Math.min(MAX_LOCK_TIMEOUT_MS, Math.round(ms))));
}

async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
}

function randomSalt(): string {
  const array = new Uint8Array(16);
  // Math.random suffit pour un sel (pas cryptographique critique ici).
  for (let i = 0; i < 16; i++) array[i] = Math.floor(Math.random() * 256);
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

let lastActiveTs = Date.now();
let currentTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS;

export function recordActivity(): void {
  lastActiveTs = Date.now();
}
export function shouldAutoLock(): boolean {
  return Date.now() - lastActiveTs > currentTimeoutMs;
}
export function setCurrentTimeout(ms: number): void {
  currentTimeoutMs = ms;
}
