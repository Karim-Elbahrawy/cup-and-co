#!/usr/bin/env node
/**
 * One-shot setup for the local kiosk dev experience.
 *
 *   $ pnpm setup:kiosk
 *
 * Idempotent — running it twice is safe. It:
 *
 *   1. Copies apps/kiosk/.env.local.example → apps/kiosk/.env.local
 *      if .env.local is missing.
 *   2. Ensures apps/api/.env exists with the env vars the kiosk needs:
 *        KIOSK_BEARER_TOKEN=local-kiosk-bearer
 *        DEV_OTP_OVERRIDE=000000
 *        ALLOW_HEADER_AUTH_BYPASS=1
 *        JWT_SECRET=<a sane local placeholder if absent>
 *      Existing values are NEVER overwritten — only missing ones are added.
 *   3. Ensures apps/admin/.env.local exists with NEXT_PUBLIC_API_URL set
 *      (so the admin can reach the API on localhost:4000).
 *   4. Prints the next steps (`pnpm dev` to boot everything).
 *
 * After this runs once, the kiosk → admin order flow is testable in:
 *
 *   pnpm setup:kiosk      # one-time (this script)
 *   pnpm dev               # boots api + admin + kiosk + customer-web
 *   open http://localhost:3002   # the kiosk
 *   open http://localhost:3001   # the admin
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const KIOSK_BEARER = 'local-kiosk-bearer';

// 32+ char placeholder — only used if no JWT_SECRET is already set.
const JWT_SECRET_PLACEHOLDER =
  'local-dev-jwt-secret-not-for-production-use-32chars';

/**
 * Add or update an env-style key=value pair in `content`. Returns the
 * possibly-modified content. Existing values are NEVER overwritten —
 * if the key already exists with any non-empty value, we leave it.
 */
function ensureEnvVar(content, key, value) {
  const lineRe = new RegExp(`^${key}=.*$`, 'm');
  if (lineRe.test(content)) {
    // Already there. Don't touch.
    return content;
  }
  // Append (with a leading newline if the file doesn't end with one).
  const sep = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${sep}${key}=${value}\n`;
}

function ensureEnvFile(path, ensures) {
  let content = '';
  if (existsSync(path)) {
    content = readFileSync(path, 'utf8');
  } else {
    mkdirSync(dirname(path), { recursive: true });
  }
  let next = content;
  const added = [];
  for (const [k, v] of Object.entries(ensures)) {
    const before = next;
    next = ensureEnvVar(next, k, v);
    if (next !== before) added.push(k);
  }
  if (next !== content) {
    writeFileSync(path, next, 'utf8');
  }
  return added;
}

function copyExampleIfMissing(srcPath, destPath) {
  if (existsSync(destPath)) return false;
  if (!existsSync(srcPath)) return false;
  copyFileSync(srcPath, destPath);
  return true;
}

function relative(p) {
  return p.replace(`${ROOT}/`, '').replace(`${ROOT}\\`, '');
}

console.log('Cup & Co kiosk — local dev setup');
console.log('================================\n');

const summary = [];

// 1. apps/kiosk/.env.local
const kioskEnvSrc = join(ROOT, 'apps/kiosk/.env.local.example');
const kioskEnvDest = join(ROOT, 'apps/kiosk/.env.local');
if (copyExampleIfMissing(kioskEnvSrc, kioskEnvDest)) {
  summary.push(`✅ Created ${relative(kioskEnvDest)} from .env.local.example`);
} else if (existsSync(kioskEnvDest)) {
  summary.push(`✓  ${relative(kioskEnvDest)} already exists, leaving alone`);
} else {
  summary.push(`⚠  ${relative(kioskEnvSrc)} missing — cannot bootstrap kiosk env`);
}

// 2. apps/api/.env
const apiEnvDest = join(ROOT, 'apps/api/.env');
const apiAdded = ensureEnvFile(apiEnvDest, {
  KIOSK_BEARER_TOKEN: KIOSK_BEARER,
  DEV_OTP_OVERRIDE: '000000',
  ALLOW_HEADER_AUTH_BYPASS: '1',
  JWT_SECRET: JWT_SECRET_PLACEHOLDER,
  PAYMOB_HMAC_SECRET: 'local-paymob-hmac-secret-32chars-minimum',
});
if (apiAdded.length > 0) {
  summary.push(
    `✅ Added to ${relative(apiEnvDest)}: ${apiAdded.join(', ')}`,
  );
} else {
  summary.push(`✓  ${relative(apiEnvDest)} already had every kiosk-relevant var`);
}

// 3. apps/admin/.env.local
const adminEnvDest = join(ROOT, 'apps/admin/.env.local');
const adminAdded = ensureEnvFile(adminEnvDest, {
  NEXT_PUBLIC_API_URL: 'http://localhost:4000',
});
if (adminAdded.length > 0) {
  summary.push(
    `✅ Added to ${relative(adminEnvDest)}: ${adminAdded.join(', ')}`,
  );
} else {
  summary.push(`✓  ${relative(adminEnvDest)} already configured`);
}

console.log(summary.join('\n'));
console.log('\nNext steps');
console.log('----------');
console.log('  1. pnpm install                       # if you haven\'t already');
console.log('  2. pnpm dev                           # boots api + admin + kiosk + customer-web');
console.log('  3. open http://localhost:3002        # the kiosk');
console.log('     open http://localhost:3001        # the admin');
console.log('     log in to admin with x-user-role=owner via the dev login form');
console.log('  4. place an order on the kiosk;');
console.log('     it appears in admin /orders with a "Kiosk" badge,');
console.log('     and in admin /reports under "By Kiosk".');
console.log('');
