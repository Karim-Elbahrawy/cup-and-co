#!/usr/bin/env node
/**
 * Generates minimum-viable placeholder assets so development and wiring
 * can proceed without final imagery. Run: `node scripts/generate-stubs.mjs`
 * Requires: sharp (devDependency in root package.json)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_PUBLIC = join(ROOT, 'apps/customer-web/public');
const IOS_ASSETS = join(ROOT, 'apps/ios/CupAndCo/CupAndCo/Assets.xcassets');

async function ensureDir(p) { await mkdir(p, { recursive: true }); }

// --- SVG generators ---

function sunriseGradientSvg(w, h, label = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#F4A261"/>
    <stop offset="100%" stop-color="#C2410C"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)" rx="0"/>
  ${label ? `<text x="${w/2}" y="${h/2}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="${Math.max(14, w/20)}" fill="white" font-weight="600">${label}</text>` : ''}
</svg>`;
}

function productStubSvg(slug) {
  const label = slug.replace(/_/g, ' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#FAF6F0"/>
  <circle cx="300" cy="260" r="140" fill="#FEF3C7" stroke="#E7E5E4" stroke-width="2"/>
  <text x="300" y="270" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="28" fill="#1C1917" font-weight="600">${label}</text>
  <text x="300" y="520" text-anchor="middle" font-family="system-ui" font-size="16" fill="#78716C">placeholder — replace with final imagery</text>
  <rect x="180" y="560" width="240" height="4" rx="2" fill="#C2410C" opacity="0.3"/>
</svg>`;
}

function illustrationStubSvg(w, h, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#FAF6F0" rx="16"/>
  <circle cx="${w/2}" cy="${h/2 - 20}" r="${Math.min(w,h)/4}" fill="none" stroke="#C2410C" stroke-width="3" stroke-dasharray="8 4"/>
  <text x="${w/2}" y="${h/2 + 30}" text-anchor="middle" font-family="system-ui" font-size="16" fill="#78716C">${label}</text>
</svg>`;
}

function paymentGlyphSvg(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="32" viewBox="0 0 48 32">
  <rect width="48" height="32" rx="4" fill="#F5F5F4" stroke="#E7E5E4"/>
  <text x="24" y="18" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="8" fill="#44403C" font-weight="500">${label}</text>
</svg>`;
}

// --- Main ---

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.log('sharp not available — generating SVG-only stubs (no PNG resize)');
    sharp = null;
  }

  // 1. App icons (sunrise gradient)
  const iconDir = join(WEB_PUBLIC, 'brand');
  await ensureDir(iconDir);

  const iconSvg = sunriseGradientSvg(1024, 1024, 'C');
  const iconSizes = [1024, 512, 192, 180];

  if (sharp) {
    const basePng = await sharp(Buffer.from(iconSvg)).png().toBuffer();
    for (const size of iconSizes) {
      const resized = await sharp(basePng).resize(size, size).png().toBuffer();
      await writeFile(join(iconDir, `app-icon-${size}.png`), resized);
    }
  } else {
    await writeFile(join(iconDir, 'app-icon-1024.svg'), iconSvg);
    for (const size of iconSizes) {
      await writeFile(join(iconDir, `app-icon-${size}.svg`), sunriseGradientSvg(size, size, 'C'));
    }
  }

  // 2. iOS AppIcon set
  const iosIconDir = join(IOS_ASSETS, 'AppIcon.appiconset');
  await ensureDir(iosIconDir);

  const iosIconSizes = [1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40];
  const iosContents = {
    images: iosIconSizes.map(size => ({
      filename: `icon-${size}.png`,
      idiom: 'universal',
      platform: size >= 152 ? 'ios' : 'universal',
      size: `${size}x${size}`,
    })),
    info: { version: 1, author: 'generate-stubs.mjs' },
  };

  if (sharp) {
    const basePng = await sharp(Buffer.from(iconSvg)).png().toBuffer();
    for (const size of iosIconSizes) {
      const resized = await sharp(basePng).resize(size, size).png().toBuffer();
      await writeFile(join(iosIconDir, `icon-${size}.png`), resized);
    }
  } else {
    for (const size of iosIconSizes) {
      await writeFile(join(iosIconDir, `icon-${size}.svg`), sunriseGradientSvg(size, size, 'C'));
    }
  }
  await writeFile(join(iosIconDir, 'Contents.json'), JSON.stringify(iosContents, null, 2));

  // 3. Product stubs (22 products)
  const productSlugs = [
    'velvet_cappuccino', 'caramel_macchiato', 'honey_latte',
    'vanilla_cold_brew', 'espresso_romano', 'iced_americano',
    'mocha_royale', 'hazelnut_latte', 'spanish_latte', 'flat_white',
    'tiramisu_cup', 'brownie_bar', 'almond_croissant',
    'cheesecake_slice', 'chocolate_tart', 'cinnamon_roll',
    'avocado_toast', 'egg_cheese_sandwich', 'smoked_turkey_bagel',
    'granola_bowl', 'acai_bowl', 'spinach_feta_wrap',
  ];

  const productsDir = join(WEB_PUBLIC, 'images/products');
  await ensureDir(productsDir);

  for (const slug of productSlugs) {
    const svg = productStubSvg(slug);
    if (sharp) {
      const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
      await writeFile(join(productsDir, `${slug}.jpg`), jpg);
    } else {
      await writeFile(join(productsDir, `${slug}.svg`), svg);
    }
  }

  // 4. Product cutouts (transparent PNG)
  for (const name of ['cold_coffee-cutout', 'hot_coffee-cutout']) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <circle cx="200" cy="280" r="120" fill="#FEF3C7" opacity="0.6"/>
  <text x="200" y="290" text-anchor="middle" font-family="system-ui" font-size="20" fill="#1C1917">${name.replace('-cutout', '')}</text>
</svg>`;
    if (sharp) {
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      await writeFile(join(productsDir, `${name}.png`), png);
    } else {
      await writeFile(join(productsDir, `${name}.svg`), svg);
    }
  }

  // 5. Onboarding illustrations
  const brandDir = join(WEB_PUBLIC, 'brand');
  const onboardingLabels = ['Order in seconds', 'Earn rewards', 'Campus pickup'];
  for (let i = 0; i < 3; i++) {
    await writeFile(join(brandDir, `onboarding-${i + 1}.svg`), illustrationStubSvg(360, 360, onboardingLabels[i]));
  }

  // 6. Empty states
  await writeFile(join(brandDir, 'empty-cart.svg'), illustrationStubSvg(240, 240, 'Empty cart'));
  await writeFile(join(brandDir, 'order-success.svg'), illustrationStubSvg(240, 240, 'Order success!'));

  // 7. Game assets
  await writeFile(join(brandDir, 'game-logo.svg'), sunriseGradientSvg(200, 200, 'Game'));
  await writeFile(join(brandDir, 'podium.svg'), illustrationStubSvg(300, 200, '1st  2nd  3rd'));

  // 8. OG card
  if (sharp) {
    const ogSvg = sunriseGradientSvg(1200, 630, 'Cup & Co — Your campus cup');
    const ogPng = await sharp(Buffer.from(ogSvg)).png().toBuffer();
    await writeFile(join(brandDir, 'og-card.png'), ogPng);
  } else {
    await writeFile(join(brandDir, 'og-card.svg'), sunriseGradientSvg(1200, 630, 'Cup & Co'));
  }

  // 9. Payment glyphs
  const paymentsDir = join(brandDir, 'payments');
  await ensureDir(paymentsDir);
  for (const [file, label] of [['visa.svg', 'VISA'], ['mastercard.svg', 'MC'], ['vodafone-cash.svg', 'VF Cash'], ['cash.svg', 'Cash']]) {
    await writeFile(join(paymentsDir, file), paymentGlyphSvg(label));
  }

  console.log('Stub assets generated successfully.');
}

main().catch(e => { console.error(e); process.exit(1); });
