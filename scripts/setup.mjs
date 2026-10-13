#!/usr/bin/env node
// Creates / updates .env with your admin login. Run once: npm run setup
import { createInterface } from 'node:readline';
import { scryptSync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
const origWrite = rl._writeToOutput.bind(rl);
rl._writeToOutput = (s) => { if (!muted || s.includes('\n') || s.includes('\r')) origWrite(s); else origWrite('*'); };
const ask = (q, hidden = false) => new Promise((res) => { muted = false; process.stdout.write(q); muted = hidden; rl.question('', (a) => { muted = false; if (hidden) process.stdout.write('\n'); res(a.trim()); }); });

console.log('\nPortfolio admin setup\n');
const email = (args.email || (await ask('Admin email: '))).toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error('That does not look like an email address.'); process.exit(1); }
const password = args.password || (await ask('Admin password (10+ characters): ', true));
if (password.length < 10) { console.error('Use at least 10 characters.'); process.exit(1); }
if (!args.password) {
  const again = await ask('Repeat password: ', true);
  if (again !== password) { console.error('Passwords do not match.'); process.exit(1); }
}
const site = args.site ?? (await ask('Public site URL, e.g. https://aziz.dev (Enter to skip): '));
rl.close();

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
const entries = {
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD_HASH: `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`,
  SESSION_SECRET: randomBytes(32).toString('hex'),
  ...(site ? { SITE_URL: site.replace(/\/+$/, '') } : {}),
};
let env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
for (const [k, v] of Object.entries(entries)) {
  const re = new RegExp(`^${k}=.*$`, 'm');
  if (k === 'SESSION_SECRET' && re.test(env)) continue; // keep existing sessions valid
  // Values with $ are single-quoted so Docker Compose does not treat them as variables
  const line = `${k}=${String(v).includes('$') ? `'${v}'` : v}`;
  env = re.test(env) ? env.replace(re, () => line) : env + (env && !env.endsWith('\n') ? '\n' : '') + `${line}\n`;
}
writeFileSync('.env', env, { mode: 0o600 });
console.log('\nSaved to .env (keep this file private). Start the site with: npm run build && npm start');
console.log('Then sign in at /admin\n');
