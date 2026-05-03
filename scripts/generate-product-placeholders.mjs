#!/usr/bin/env node
/**
 * Cup & Co — Product placeholder generator.
 *
 * Produces 22 clean SVG product images with brand-coloured gradients and
 * iconographic silhouettes (cup / dessert / breakfast). No photography of
 * people, no hands — exactly the user's request: "shows only the Item".
 *
 * Output: apps/customer-web/public/images/products/<slug>.svg
 *
 * Re-run any time. Idempotent.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'apps', 'customer-web', 'public', 'images', 'products');
mkdirSync(OUT, { recursive: true });

// Per-category palette + icon. Sunrise terracotta → cream variants for warmth,
// distinct hue per category so the grid scans clearly.
const PALETTES = {
  coffee: {
    bgFrom: '#F4A261',
    bgTo: '#C2410C',
    accent: '#FEF3C7',
    iconStroke: '#1C1917',
    label: '#FFFFFF',
  },
  desserts: {
    bgFrom: '#FFD9C2',
    bgTo: '#E07856',
    accent: '#FEF3C7',
    iconStroke: '#1C1917',
    label: '#1C1917',
  },
  breakfast: {
    bgFrom: '#A7E5DC',
    bgTo: '#0F766E',
    accent: '#FEF3C7',
    iconStroke: '#1C1917',
    label: '#FFFFFF',
  },
};

// Items
const items = [
  // Coffee — top-down cup with category-specific touches
  { slug: 'velvet-cappuccino',  category: 'coffee',    name: 'Velvet Cappuccino',    icon: 'cup-foam' },
  { slug: 'caramel-macchiato',  category: 'coffee',    name: 'Caramel Macchiato',    icon: 'cup-drizzle' },
  { slug: 'honey-latte',        category: 'coffee',    name: 'Honey Latte',          icon: 'cup-art' },
  { slug: 'vanilla-cold-brew',  category: 'coffee',    name: 'Vanilla Cold Brew',    icon: 'cup-cold' },
  { slug: 'espresso-romano',    category: 'coffee',    name: 'Espresso Romano',      icon: 'cup-small' },
  { slug: 'iced-americano',     category: 'coffee',    name: 'Iced Americano',       icon: 'cup-cold' },
  { slug: 'mocha-royale',       category: 'coffee',    name: 'Mocha Royale',         icon: 'cup-foam' },
  { slug: 'hazelnut-latte',     category: 'coffee',    name: 'Hazelnut Latte',       icon: 'cup-art' },
  { slug: 'spanish-latte',      category: 'coffee',    name: 'Spanish Latte',        icon: 'cup-foam' },
  { slug: 'flat-white',         category: 'coffee',    name: 'Flat White',           icon: 'cup-art' },
  // Desserts
  { slug: 'tiramisu-cup',       category: 'desserts',  name: 'Tiramisu Cup',         icon: 'dessert-cup' },
  { slug: 'brownie-bar',        category: 'desserts',  name: 'Brownie Bar',          icon: 'dessert-bar' },
  { slug: 'almond-croissant',   category: 'desserts',  name: 'Almond Croissant',     icon: 'dessert-croissant' },
  { slug: 'cheesecake-slice',   category: 'desserts',  name: 'Cheesecake Slice',     icon: 'dessert-slice' },
  { slug: 'chocolate-tart',     category: 'desserts',  name: 'Chocolate Tart',       icon: 'dessert-tart' },
  { slug: 'cinnamon-roll',      category: 'desserts',  name: 'Cinnamon Roll',        icon: 'dessert-roll' },
  // Breakfast
  { slug: 'avocado-toast',      category: 'breakfast', name: 'Avocado Toast',        icon: 'breakfast-toast' },
  { slug: 'egg-cheese-sandwich',category: 'breakfast', name: 'Egg & Cheese Sandwich',icon: 'breakfast-sandwich' },
  { slug: 'smoked-turkey-bagel',category: 'breakfast', name: 'Smoked Turkey Bagel',  icon: 'breakfast-bagel' },
  { slug: 'granola-bowl',       category: 'breakfast', name: 'Granola Bowl',         icon: 'breakfast-bowl' },
  { slug: 'acai-bowl',          category: 'breakfast', name: 'Acai Bowl',            icon: 'breakfast-bowl' },
  { slug: 'spinach-feta-wrap',  category: 'breakfast', name: 'Spinach Feta Wrap',    icon: 'breakfast-wrap' },
];

function background(p) {
  return `
    <defs>
      <radialGradient id="bg" cx="50%" cy="40%" r="80%">
        <stop offset="0%" stop-color="${p.bgFrom}"/>
        <stop offset="100%" stop-color="${p.bgTo}"/>
      </radialGradient>
      <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6"/>
      </filter>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <!-- Subtle noise texture via opacity dots -->
    <g fill="${p.accent}" opacity="0.05">
      <circle cx="60" cy="80" r="2"/><circle cx="540" cy="120" r="3"/><circle cx="180" cy="540" r="2"/>
      <circle cx="450" cy="480" r="2"/><circle cx="120" cy="260" r="2"/><circle cx="500" cy="320" r="3"/>
    </g>
  `;
}

const ICONS = {
  // Coffee variants
  'cup-foam': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="430" rx="180" ry="22" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <ellipse cx="0" cy="0" rx="170" ry="170" fill="${p.accent}" stroke="${p.iconStroke}" stroke-width="3"/>
      <ellipse cx="0" cy="-3" rx="140" ry="140" fill="${p.iconStroke}"/>
      <ellipse cx="0" cy="-25" rx="90" ry="22" fill="${p.accent}" opacity="0.65"/>
      <path d="M -45 -28 Q -10 -55, 30 -25 Q 55 -8, 30 12 Q 5 25, -25 8 Q -55 -8, -45 -28 Z" fill="${p.accent}" opacity="0.85"/>
    </g>`,
  'cup-drizzle': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="430" rx="180" ry="22" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <ellipse cx="0" cy="0" rx="170" ry="170" fill="${p.accent}" stroke="${p.iconStroke}" stroke-width="3"/>
      <ellipse cx="0" cy="-3" rx="140" ry="140" fill="${p.iconStroke}"/>
      <g stroke="${p.bgTo}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9">
        <path d="M -90 -30 Q -50 0, -30 -40 Q 0 0, 30 -40 Q 60 0, 90 -30"/>
        <path d="M -70 10 Q -20 50, 0 0 Q 30 50, 80 0"/>
      </g>
    </g>`,
  'cup-art': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="430" rx="180" ry="22" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <ellipse cx="0" cy="0" rx="170" ry="170" fill="${p.accent}" stroke="${p.iconStroke}" stroke-width="3"/>
      <ellipse cx="0" cy="-3" rx="140" ry="140" fill="${p.iconStroke}"/>
      <!-- Latte art rosetta -->
      <g fill="${p.accent}" opacity="0.95">
        <ellipse cx="0" cy="0" rx="60" ry="20"/>
        <ellipse cx="-30" cy="-15" rx="35" ry="14" transform="rotate(-25 -30 -15)"/>
        <ellipse cx="30" cy="-15" rx="35" ry="14" transform="rotate(25 30 -15)"/>
        <ellipse cx="-50" cy="-30" rx="22" ry="10" transform="rotate(-40 -50 -30)"/>
        <ellipse cx="50" cy="-30" rx="22" ry="10" transform="rotate(40 50 -30)"/>
        <path d="M 0 25 L 8 60 L -8 60 Z"/>
      </g>
    </g>`,
  'cup-cold': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="450" rx="160" ry="20" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <!-- Glass tumbler, vertical ellipse -->
      <path d="M -100 -130 L -100 130 Q -100 160 -70 160 L 70 160 Q 100 160 100 130 L 100 -130 Z" fill="${p.iconStroke}" opacity="0.9"/>
      <ellipse cx="0" cy="-130" rx="100" ry="22" fill="${p.bgFrom}"/>
      <!-- Ice cubes -->
      <g fill="${p.accent}" opacity="0.85">
        <rect x="-60" y="-110" width="40" height="40" rx="6" transform="rotate(-15 -40 -90)"/>
        <rect x="20" y="-100" width="38" height="38" rx="6" transform="rotate(20 39 -81)"/>
        <rect x="-25" y="-50" width="42" height="42" rx="6" transform="rotate(-8 -4 -29)"/>
      </g>
      <!-- Straw -->
      <rect x="35" y="-160" width="14" height="200" fill="${p.bgTo}" opacity="0.95" rx="6" transform="rotate(8 42 -60)"/>
    </g>`,
  'cup-small': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="430" rx="140" ry="20" fill="#1C1917"/></g>
    <g transform="translate(300,310)">
      <ellipse cx="0" cy="0" rx="130" ry="130" fill="${p.accent}" stroke="${p.iconStroke}" stroke-width="3"/>
      <ellipse cx="0" cy="-3" rx="100" ry="100" fill="${p.iconStroke}"/>
      <ellipse cx="-15" cy="-25" rx="38" ry="10" fill="${p.accent}" opacity="0.55"/>
    </g>`,
  // Desserts
  'dessert-cup': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="450" rx="120" ry="16" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <path d="M -90 -100 L 90 -100 L 78 130 Q 78 150 60 150 L -60 150 Q -78 150 -78 130 Z" fill="${p.accent}" stroke="${p.iconStroke}" stroke-width="3"/>
      <rect x="-90" y="-100" width="180" height="20" fill="${p.iconStroke}" opacity="0.8"/>
      <rect x="-90" y="-50" width="180" height="40" fill="${p.bgTo}" opacity="0.7"/>
      <rect x="-90" y="20" width="180" height="20" fill="${p.iconStroke}" opacity="0.8"/>
      <!-- Cocoa dusting on top -->
      <g fill="${p.iconStroke}" opacity="0.6">
        <circle cx="-50" cy="-110" r="3"/><circle cx="-20" cy="-115" r="2"/><circle cx="10" cy="-108" r="3"/>
        <circle cx="40" cy="-112" r="2"/><circle cx="60" cy="-105" r="3"/>
      </g>
    </g>`,
  'dessert-bar': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><rect x="180" y="380" width="240" height="20" rx="10" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <rect x="-130" y="-50" width="260" height="100" rx="14" fill="${p.iconStroke}"/>
      <rect x="-130" y="-50" width="260" height="20" rx="14" fill="${p.bgTo}" opacity="0.9"/>
      <!-- Chocolate chunks -->
      <rect x="-100" y="-25" width="40" height="20" rx="4" fill="${p.bgTo}"/>
      <rect x="-30" y="-15" width="35" height="20" rx="4" fill="${p.bgTo}"/>
      <rect x="50" y="-22" width="42" height="22" rx="4" fill="${p.bgTo}"/>
    </g>`,
  'dessert-croissant': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="430" rx="160" ry="16" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <path d="M -150 0 Q -150 -120 -50 -120 Q 60 -120 130 -50 Q 180 30 100 70 Q 0 110 -100 70 Q -150 50 -150 0 Z"
            fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
      <!-- Layer lines -->
      <g stroke="${p.iconStroke}" stroke-width="2" fill="none" opacity="0.6">
        <path d="M -130 -20 Q -80 -90 0 -100"/>
        <path d="M -100 0 Q -40 -70 50 -90"/>
        <path d="M -60 30 Q 10 -40 100 -50"/>
        <path d="M 0 50 Q 60 -10 130 -20"/>
      </g>
    </g>`,
  'dessert-slice': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="450" rx="140" ry="16" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <path d="M -120 100 L 0 -130 L 120 100 Z" fill="${p.accent}" stroke="${p.iconStroke}" stroke-width="3"/>
      <path d="M -120 100 L 120 100 L 110 90 L -110 90 Z" fill="${p.bgFrom}"/>
      <!-- Berry compote -->
      <circle cx="-30" cy="-60" r="14" fill="${p.bgTo}"/>
      <circle cx="20" cy="-40" r="12" fill="${p.bgTo}"/>
      <circle cx="-5" cy="-90" r="10" fill="${p.bgTo}"/>
    </g>`,
  'dessert-tart': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="430" rx="160" ry="18" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <ellipse cx="0" cy="0" rx="160" ry="50" fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
      <ellipse cx="0" cy="-15" rx="140" ry="35" fill="${p.iconStroke}"/>
      <ellipse cx="-30" cy="-25" rx="50" ry="14" fill="${p.accent}" opacity="0.4"/>
    </g>`,
  'dessert-roll': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="430" rx="140" ry="16" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <circle cx="0" cy="0" r="130" fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
      <!-- Spiral -->
      <path d="M 0 0 Q 50 -50 100 0 Q 50 80 -50 30 Q -100 -30 -30 -90 Q 60 -110 100 -40"
            fill="none" stroke="${p.iconStroke}" stroke-width="6" opacity="0.7"/>
      <!-- Glaze drizzle -->
      <path d="M -70 -80 Q -50 -50 -80 -20 Q -100 10 -60 30" fill="none" stroke="${p.accent}" stroke-width="5" stroke-linecap="round"/>
    </g>`,
  // Breakfast
  'breakfast-toast': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="440" rx="160" ry="18" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <rect x="-150" y="-80" width="300" height="160" rx="20" fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
      <!-- Avocado layer -->
      <ellipse cx="0" cy="-10" rx="110" ry="30" fill="${p.bgTo}"/>
      <!-- Seeds / chili flakes -->
      <g fill="${p.iconStroke}">
        <circle cx="-50" cy="-15" r="3"/><circle cx="-20" cy="0" r="3"/><circle cx="20" cy="-10" r="3"/>
        <circle cx="50" cy="0" r="3"/><circle cx="0" cy="-25" r="3"/>
      </g>
    </g>`,
  'breakfast-sandwich': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="450" rx="160" ry="16" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <!-- Top bun -->
      <path d="M -130 -30 Q -130 -110 0 -110 Q 130 -110 130 -30 Z" fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
      <!-- Egg -->
      <ellipse cx="0" cy="-10" rx="120" ry="22" fill="${p.accent}"/>
      <circle cx="-20" cy="-10" r="14" fill="${p.warningAmber || '#D97706'}"/>
      <!-- Cheese -->
      <rect x="-130" y="10" width="260" height="14" fill="${p.warningAmber || '#F4A261'}" opacity="0.9"/>
      <!-- Bottom bun -->
      <path d="M -130 30 L 130 30 Q 130 80 0 80 Q -130 80 -130 30 Z" fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
    </g>`,
  'breakfast-bagel': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="440" rx="150" ry="18" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <circle cx="0" cy="0" r="140" fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
      <circle cx="0" cy="0" r="50" fill="${p.bgTo}" opacity="0.4"/>
      <circle cx="0" cy="0" r="50" fill="none" stroke="${p.iconStroke}" stroke-width="3"/>
      <!-- Sesame seeds -->
      <g fill="${p.iconStroke}">
        <ellipse cx="-90" cy="-50" rx="4" ry="2"/><ellipse cx="-60" cy="-90" rx="4" ry="2"/>
        <ellipse cx="80" cy="-70" rx="4" ry="2"/><ellipse cx="100" cy="20" rx="4" ry="2"/>
        <ellipse cx="60" cy="80" rx="4" ry="2"/><ellipse cx="-80" cy="70" rx="4" ry="2"/>
      </g>
    </g>`,
  'breakfast-bowl': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="450" rx="170" ry="18" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <!-- Bowl -->
      <path d="M -160 -20 Q -160 130 0 130 Q 160 130 160 -20 Z" fill="${p.iconStroke}"/>
      <ellipse cx="0" cy="-20" rx="160" ry="40" fill="${p.bgFrom}"/>
      <ellipse cx="0" cy="-25" rx="135" ry="30" fill="${p.bgTo}" opacity="0.85"/>
      <!-- Fruit / granola pieces -->
      <g>
        <circle cx="-60" cy="-30" r="14" fill="${p.warningAmber || '#F4A261'}"/>
        <circle cx="40" cy="-35" r="12" fill="${p.bgFrom}"/>
        <circle cx="80" cy="-15" r="10" fill="${p.warningAmber || '#F4A261'}"/>
        <circle cx="-40" cy="-10" r="9" fill="${p.bgFrom}"/>
      </g>
    </g>`,
  'breakfast-wrap': (p) => `
    <g filter="url(#soft-shadow)" opacity="0.18"><ellipse cx="300" cy="450" rx="160" ry="16" fill="#1C1917"/></g>
    <g transform="translate(300,300)">
      <path d="M -150 -50 L 150 -50 L 130 80 L -130 80 Z" fill="${p.bgFrom}" stroke="${p.iconStroke}" stroke-width="3"/>
      <!-- Spinach + filling at the open end -->
      <path d="M -130 -50 L 130 -50 L 120 -20 L -120 -20 Z" fill="${p.bgTo}" opacity="0.75"/>
      <circle cx="-50" cy="-35" r="8" fill="${p.accent}"/>
      <circle cx="20" cy="-30" r="8" fill="${p.accent}"/>
      <circle cx="80" cy="-38" r="6" fill="${p.accent}"/>
    </g>`,
};

function svgFor(item) {
  const p = PALETTES[item.category];
  const icon = ICONS[item.icon](p);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${item.name}">
${background(p)}
${icon}
  <!-- Brand badge -->
  <g transform="translate(540,560)">
    <circle cx="0" cy="0" r="24" fill="${p.accent}" opacity="0.95"/>
    <circle cx="0" cy="0" r="14" fill="#1C1917"/>
  </g>
</svg>
`;
}

let written = 0;
for (const item of items) {
  const path = resolve(OUT, `${item.slug}.svg`);
  writeFileSync(path, svgFor(item), 'utf8');
  written++;
}
console.log(`Wrote ${written} product placeholders to ${OUT}`);
