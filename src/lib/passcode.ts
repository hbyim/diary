import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * 4-digit app passcode.
 *
 * Only a salted, iterated SHA-256 hash is stored, and it is stored in the
 * platform keystore (iOS Keychain / Android Keystore via expo-secure-store),
 * never in the SQLite file. Failed attempts trigger an escalating cooldown.
 */
export const PASSCODE_LENGTH = 4;

const HASH_KEY = 'naite.passcode.v1';
const FAIL_KEY = 'naite.passcode.fails.v1';
const ITERATIONS = 300;

type Stored = { salt: string; hash: string; iter: number };
type Fails = { count: number; until: number };

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function derive(pin: string, salt: string, iter: number): Promise<string> {
  let h = `${salt}:${pin}`;
  for (let i = 0; i < iter; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${h}`);
  }
  return h;
}

const opts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function hasPasscode(): Promise<boolean> {
  return (await SecureStore.getItemAsync(HASH_KEY, opts)) !== null;
}

export async function setPasscode(pin: string) {
  if (!new RegExp(`^\\d{${PASSCODE_LENGTH}}$`).test(pin)) throw new Error('invalid passcode');
  const salt = toHex(Crypto.getRandomBytes(16));
  const hash = await derive(pin, salt, ITERATIONS);
  const value: Stored = { salt, hash, iter: ITERATIONS };
  await SecureStore.setItemAsync(HASH_KEY, JSON.stringify(value), opts);
  await SecureStore.deleteItemAsync(FAIL_KEY, opts);
}

export async function clearPasscode() {
  await SecureStore.deleteItemAsync(HASH_KEY, opts);
  await SecureStore.deleteItemAsync(FAIL_KEY, opts);
}

async function readFails(): Promise<Fails> {
  try {
    const raw = await SecureStore.getItemAsync(FAIL_KEY, opts);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, until: 0 };
}

/** Cooldown after the 5th wrong attempt: 30s, then doubling up to 15 minutes. */
export function cooldownFor(count: number): number {
  if (count < 5) return 0;
  return Math.min(30_000 * 2 ** (count - 5), 15 * 60_000);
}

export type VerifyResult = { ok: true } | { ok: false; waitMs: number; attempts: number };

export async function remainingLockout(): Promise<number> {
  const f = await readFails();
  return Math.max(0, f.until - Date.now());
}

export async function verifyPasscode(pin: string): Promise<VerifyResult> {
  const f = await readFails();
  if (f.until > Date.now()) return { ok: false, waitMs: f.until - Date.now(), attempts: f.count };

  const raw = await SecureStore.getItemAsync(HASH_KEY, opts);
  if (!raw) return { ok: true };
  const stored: Stored = JSON.parse(raw);
  const hash = await derive(pin, stored.salt, stored.iter);
  if (hash === stored.hash) {
    await SecureStore.deleteItemAsync(FAIL_KEY, opts);
    return { ok: true };
  }
  const count = f.count + 1;
  const wait = cooldownFor(count);
  await SecureStore.setItemAsync(FAIL_KEY, JSON.stringify({ count, until: Date.now() + wait }), opts);
  return { ok: false, waitMs: wait, attempts: count };
}
