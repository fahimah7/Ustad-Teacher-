import { get, set, del } from "idb-keyval";
import { deriveKey, open, randomBytes, seal, type Sealed } from "./crypto";

/** Encrypted vaults in IndexedDB.
 *  "school" (lessons, progress, questions) opens without a code: its AES-GCM
 *  key is generated on the device as a non-extractable CryptoKey, so app code
 *  can use it but never read or export it, and IndexedDB only ever holds
 *  ciphertext. There is no login.
 *  "voice" (rights and letters) sits behind the second door: its key is
 *  derived from the 6-digit code and lives in memory only. */

export type VaultName = "school" | "voice";

// The code is checked by opening a sealed canary with the PBKDF2-derived key,
// never by a fast hash, so guessing codes costs a full key derivation each time.
type Meta = { salt: number[]; canary: Sealed };

const metaKey = (n: VaultName) => `u.${n}.meta`;
const dataKey = (n: VaultName) => `u.${n}.data`;

const keys = new Map<VaultName, CryptoKey>();

const DEVICE_KEY = "u.device.key";

/** Opens a vault with the device's own key, creating that key on first run. */
export async function openDeviceVault(n: VaultName): Promise<void> {
  let key = (await get(DEVICE_KEY)) as CryptoKey | undefined;
  if (!key) {
    key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await set(DEVICE_KEY, key);
  }
  keys.set(n, key);
}

export async function vaultExists(n: VaultName): Promise<boolean> {
  return (await get(metaKey(n))) !== undefined;
}

/** Opens a vault, creating it on first use. A wrong code returns false and
 *  reveals nothing else. */
export async function openVault(n: VaultName, code: string): Promise<boolean> {
  let meta = (await get(metaKey(n))) as Meta | undefined;
  if (!meta) {
    const salt = Array.from(randomBytes(16));
    const key = await deriveKey(code, new Uint8Array(salt));
    meta = { salt, canary: await seal(key, n) };
    await set(metaKey(n), meta);
    keys.set(n, key);
    return true;
  }
  const key = await deriveKey(code, new Uint8Array(meta.salt));
  try {
    if ((await open<string>(key, meta.canary)) !== n) return false;
  } catch {
    return false;
  }
  keys.set(n, key);
  return true;
}

export const isOpen = (n: VaultName) => keys.has(n);
export const closeVault = (n: VaultName) => { keys.delete(n); };

export async function loadVault<T>(n: VaultName, fallback: T): Promise<T> {
  const key = keys.get(n);
  if (!key) return fallback;
  const sealed = (await get(dataKey(n))) as Sealed | undefined;
  if (!sealed) return fallback;
  try {
    return { ...fallback, ...(await open<T>(key, sealed)) };
  } catch {
    return fallback;
  }
}

export async function saveVault(n: VaultName, value: unknown): Promise<void> {
  const key = keys.get(n);
  if (!key) return;
  await set(dataKey(n), await seal(key, value));
}

export async function wipeVault(n: VaultName): Promise<void> {
  keys.delete(n);
  await del(dataKey(n));
  await del(metaKey(n));
}
