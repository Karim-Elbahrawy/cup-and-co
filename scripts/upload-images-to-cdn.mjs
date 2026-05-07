#!/usr/bin/env node
/**
 * Cup & Co — bulk-upload product images to Cloudflare Images.
 * Phase 3.4 of UPGRADE-PLAN.md.
 *
 * Reads every PNG/JPG under apps/customer-web/public/images/products/,
 * uploads to Cloudflare Images, then UPSERTs the returned id into
 * Supabase `products.image_id` matching by `image_url` filename.
 *
 * Re-running is safe: products that already have image_id are skipped.
 *
 * REQUIRED ENV (export before running):
 *   CF_IMAGES_ACCOUNT_ID    Cloudflare account ID (UUID)
 *   CF_IMAGES_API_TOKEN     API token with `Images: Edit` permission
 *   SUPABASE_URL            e.g. https://<project>.supabase.co
 *   SUPABASE_SERVICE_KEY    service-role key (NOT the anon key)
 *
 * USAGE:
 *   pnpm node scripts/upload-images-to-cdn.mjs            # dry run (no DB writes)
 *   pnpm node scripts/upload-images-to-cdn.mjs --apply    # upload + DB write
 *   pnpm node scripts/upload-images-to-cdn.mjs --apply --product=<id>
 *                                                         # single product
 *
 * After this script runs once, customer-web's `cdnImage()` helper
 * starts returning Cloudflare URLs automatically (provided
 * NEXT_PUBLIC_CF_IMAGES_HASH is set in Vercel).
 */

import { createReadStream, readdirSync, statSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = join(HERE, '..');
const IMAGES_DIR = join(PROJECT_ROOT, 'apps/customer-web/public/images/products');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const PRODUCT_FILTER = args.find((a) => a.startsWith('--product='))?.split('=')[1];

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function need(envName) {
  const v = process.env[envName];
  if (!v || v.length === 0) fail(`Missing required env: ${envName}`);
  return v;
}

const CF_ACCOUNT_ID = APPLY ? need('CF_IMAGES_ACCOUNT_ID') : process.env.CF_IMAGES_ACCOUNT_ID ?? '<account>';
const CF_TOKEN = APPLY ? need('CF_IMAGES_API_TOKEN') : process.env.CF_IMAGES_API_TOKEN ?? '<token>';
const SUPABASE_URL = APPLY ? need('SUPABASE_URL') : process.env.SUPABASE_URL ?? '<url>';
const SUPABASE_SERVICE_KEY = APPLY ? need('SUPABASE_SERVICE_KEY') : process.env.SUPABASE_SERVICE_KEY ?? '<key>';

const CF_UPLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`;

function listImages() {
  let entries;
  try {
    entries = readdirSync(IMAGES_DIR);
  } catch (e) {
    fail(`Could not read ${IMAGES_DIR}: ${e.message}`);
  }
  const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp']);
  return entries
    .filter((f) => allowed.has(extname(f).toLowerCase()))
    .map((f) => ({
      filename: f,
      path: join(IMAGES_DIR, f),
      size: statSync(join(IMAGES_DIR, f)).size,
    }));
}

async function uploadOne(file) {
  const form = new FormData();
  // Node 18+ Blob API
  const buffer = await new Promise((resolve, reject) => {
    const chunks = [];
    createReadStream(file.path)
      .on('data', (c) => chunks.push(c))
      .on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', reject);
  });
  form.append('file', new Blob([buffer]), file.filename);
  // Hint Cloudflare to use the filename (without extension) as a metadata key.
  form.append('id', basename(file.filename, extname(file.filename)));
  form.append('requireSignedURLs', 'false');

  const res = await fetch(CF_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_TOKEN}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Cloudflare upload failed: ${JSON.stringify(data.errors ?? data)}`);
  }
  return data.result.id;
}

async function findProductByImageFilename(filename) {
  // Match products.image_url ending with the filename (case-insensitive).
  // image_url examples: '/images/products/caramel_macchiato.png'
  const url = new URL(`${SUPABASE_URL}/rest/v1/products`);
  url.searchParams.set('select', 'id,image_url,image_id');
  url.searchParams.set('image_url', `ilike.*${filename}*`);
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase lookup failed: ${res.status}`);
  return await res.json();
}

async function setProductImageId(productId, imageId) {
  const url = `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ image_id: imageId }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Supabase update failed: ${res.status} ${msg}`);
  }
}

async function main() {
  console.log('\n┌────────────────────────────────────────────────────┐');
  console.log('│  Cup & Co — Image CDN bulk uploader                │');
  console.log('└────────────────────────────────────────────────────┘');
  console.log(`Mode:        ${APPLY ? 'APPLY (will write to Cloudflare + Supabase)' : 'DRY RUN (no changes)'}`);
  console.log(`Images dir:  ${IMAGES_DIR}`);
  if (PRODUCT_FILTER) console.log(`Filter:      product id = ${PRODUCT_FILTER}`);
  console.log('');

  const images = listImages();
  if (images.length === 0) {
    console.log('No images found. Nothing to do.');
    return;
  }
  console.log(`Found ${images.length} image file(s). Total size: ${(images.reduce((s, i) => s + i.size, 0) / 1024).toFixed(0)} KB\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of images) {
    const matches = APPLY ? await findProductByImageFilename(file.filename) : [];

    if (APPLY && matches.length === 0) {
      console.log(`  ↷ ${file.filename} — no matching product (skipped)`);
      skipped += 1;
      continue;
    }
    if (APPLY && matches[0]?.image_id) {
      console.log(`  ↷ ${file.filename} — already migrated (image_id=${matches[0].image_id})`);
      skipped += 1;
      continue;
    }
    if (PRODUCT_FILTER && matches[0]?.id !== PRODUCT_FILTER) {
      continue;
    }

    if (!APPLY) {
      console.log(`  ↑ ${file.filename}  (would upload, ${(file.size / 1024).toFixed(0)} KB)`);
      uploaded += 1;
      continue;
    }

    try {
      const cfId = await uploadOne(file);
      await setProductImageId(matches[0].id, cfId);
      console.log(`  ✓ ${file.filename} → cf_id=${cfId}, product_id=${matches[0].id}`);
      uploaded += 1;
    } catch (e) {
      console.log(`  ✗ ${file.filename} — ${e.message}`);
      failed += 1;
    }
  }

  console.log('\n┌────────────────────────────────────────────────────┐');
  console.log(`│  ${APPLY ? 'Done' : 'Dry run'}: uploaded=${uploaded}, skipped=${skipped}, failed=${failed}`);
  console.log('└────────────────────────────────────────────────────┘\n');
  if (!APPLY) {
    console.log('Re-run with --apply to actually upload + write to Supabase.\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
