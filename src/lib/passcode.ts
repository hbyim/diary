import * as Crypto from 'expo-crypto';

import { secureDelete, secureGet, secureSet } from './secure-kv';

/**
 * 4-digit app passcode.
 *
 * Only a salted, iterated SHA-256 hash is stored, and it is stored in the
 * platform keystore (iOS Keychain / Android Keystore, see secure-kv.ts),
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

export async function hasPasscode(): Promise<boolean> {
  return (await secureGet(HASH_KEY)) !== null;
}

export async function setPasscode(pin: string) {
  if (!new RegExp(`^\\d{${PASSCODE_LENGTH}}$`).test(pin)) throw new Error('invalid passcode');
  const salt = toHex(Crypto.getRandomBytes(16));
  const hash = await derive(pin, salt, ITERATIONS);
  const value: Stored = { salt, hash, iter: ITERATIONS };
  await secureSet(HASH_KEY, JSON.stringify(value));
  await secureDelete(FAIL_KEY);
}

export async function clearPasscode() {
  await secureDelete(HASH_KEY);
  await secureDelete(FAIL_KEY);
}

async function readFails(): Promise<Fails> {
  try {
    const raw = await secureGet(FAIL_KEY);
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

  const raw = await secureGet(HASH_KEY);
  if (!raw) return { ok: true };
  const stored: Stored = JSON.parse(raw);
  const hash = await derive(pin, stored.salt, stored.iter);
  if (hash === stored.hash) {
    await secureDelete(FAIL_KEY);
    return { ok: true };
  }
  const count = f.count + 1;
  const wait = cooldownFor(count);
  await secureSet(FAIL_KEY, JSON.stringify({ count, until: Date.now() + wait }));
  return { ok: false, waitMs: wait, attempts: count };
}
