/** Everything the learner makes is encrypted on the phone.
 *  PBKDF2 (SHA-256) derives an AES-GCM key from her passcode; the key lives in
 *  memory only, never on disk, and is dropped the moment the app locks.
 *  There is no account, no name, no recovery: that is the point. */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 210_000;

export async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passcode), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export type Sealed = { iv: number[]; data: number[] };

export async function seal(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = randomBytes(12);
  const body = enc.encode(JSON.stringify(value));
  const out = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, body as BufferSource);
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(out)) };
}

export async function open<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  const iv = new Uint8Array(sealed.iv);
  const data = new Uint8Array(sealed.data);
  const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
  return JSON.parse(dec.decode(out)) as T;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text) as BufferSource);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
