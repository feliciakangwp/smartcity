// Turns the site password into a salted PBKDF2 hash for the login page, so the
// password itself never goes into the built files.
// CI: SITE_PASSWORD comes from a repository secret; the lines are appended to $GITHUB_ENV.
// Locally: SITE_PASSWORD='…' node scripts/hash-password.mjs >> .env.local
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';

export const ITERATIONS = 210000;
const password = process.env.SITE_PASSWORD ?? '';
if (!password) {
  console.error('SITE_PASSWORD is not set: the site will be built without a login page.');
  process.exit(0);
}
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('hex');
const lines = `VITE_ACCESS_SALT=${salt}\nVITE_ACCESS_HASH=${hash}\nVITE_ACCESS_ITERATIONS=${ITERATIONS}\n`;
if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, lines);
  console.log('Login page enabled for this build.');
} else {
  process.stdout.write(lines);
}
