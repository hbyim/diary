/**
 * Web demo fallback: browsers have no keystore, so the passcode hash goes to
 * localStorage. It only keeps casual eyes out on a shared computer.
 */
export async function secureGet(key: string): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string) {
  globalThis.localStorage?.setItem(key, value);
}

export async function secureDelete(key: string) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {}
}
