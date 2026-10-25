// Password gate for the published site. The build carries only a salted PBKDF2 hash of the
// password (see scripts/hash-password.mjs); without one, the site opens without a login.
// This keeps casual visitors out. It is not server-side security: the built files are
// still public on GitHub Pages, so do not rely on it for confidential data.
const SALT = import.meta.env.VITE_ACCESS_SALT as string | undefined;
const HASH = import.meta.env.VITE_ACCESS_HASH as string | undefined;
const ITERATIONS = Number(import.meta.env.VITE_ACCESS_ITERATIONS) || 210000;
const KEY = 'port-nexus.access';

export const accessRequired = !!(SALT && HASH);

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function derive(password: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT), iterations: ITERATIONS }, key, 256);
  return hex(bits);
}

/** True when the password matches. Remembers the unlock for this tab, or on this device if asked. */
export async function unlock(password: string, remember: boolean) {
  if (!accessRequired) return true;
  if ((await derive(password)) !== HASH) return false;
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY, HASH!);
  } catch {
    /* storage unavailable: unlocked until the page is reloaded */
  }
  return true;
}

/** Unlocked earlier with the current password (a new password locks everyone out again). */
export function isUnlocked() {
  if (!accessRequired) return true;
  try {
    return sessionStorage.getItem(KEY) === HASH || localStorage.getItem(KEY) === HASH;
  } catch {
    return false;
  }
}

export function lock() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  location.reload();
}
